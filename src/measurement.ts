import { Request, Response, NextFunction } from 'express';
import { getEntries, StorageEntry } from './async-storage';
import type { HandlerData, Method, ResponseData, Span, SpanCode } from '../shared-types';
import os from 'os';
import { addEntry, runWithStorage } from './async-storage';

let measurements: ResponseData = createMeasurements();

export function createMeasurements(): ResponseData {
  const data: ResponseData = {
    backendId: 'id-' + os.hostname(), //id has to stay the same after restarts for the same pod
    currentInfo: {
      cpuPercent: 0,
      liveRequests: 0,
      memoryGB: 0,
      totalMemoryGB: 0,
    },
    endpoints: {},
    spanCodes: {},
  };

  return data;
}

export function resetMeasurements() {
  const requestsAtMoment = measurements.currentInfo.liveRequests;
  measurements = createMeasurements();
  measurements.currentInfo.liveRequests = requestsAtMoment;
}

async function getGeneralStatus() {
  const startUsage = process.cpuUsage(); // user: nanoseconds; system: nanoseconds;
  const startTime = process.hrtime(); // [seconds, nanoseconds]

  await new Promise((resolve) => setTimeout(resolve, 200));

  const { user: diffUserNano, system: diffSystemNano } = process.cpuUsage(startUsage);
  const [diffS, diffNano] = process.hrtime(startTime);

  const elapsedMicros = diffS * 1_000_000 + diffNano / 1_000;
  const cpuMicros = diffUserNano + diffSystemNano;

  const cpuPercent = (cpuMicros / elapsedMicros) * 100;

  const unusedBytes = os.freemem();
  const totalBytes = os.totalmem();
  const usedBytes = totalBytes - unusedBytes;

  return {
    cpuPercent: Number(cpuPercent.toFixed(2)),
    memoryGB: Number((usedBytes / 1024 ** 3).toFixed(2)),
    totalMemoryGB: Number((totalBytes / 1024 ** 3).toFixed(2)),
  };
}

export async function getMeasurements() {
  const { cpuPercent, memoryGB, totalMemoryGB } = await getGeneralStatus();
  measurements.currentInfo.cpuPercent = cpuPercent;
  measurements.currentInfo.memoryGB = memoryGB;
  measurements.currentInfo.totalMemoryGB = totalMemoryGB;
  return measurements;
}

function genCodeId(storageEntry: StorageEntry) {
  return `${storageEntry.spanType}-${storageEntry.file?.filePath || '<unk-path>'}-${storageEntry.evalCodeSnippet}`;
}

function makeSpan(entry: StorageEntry): Span {
  return {
    codeId: genCodeId(entry),
    equivCodeSnippet: entry.evalCodeSnippet,
    totalMs: 0,
    count: 0,
  };
}

function updateSpan(span: Span, entry: StorageEntry) {
  span.codeId = genCodeId(entry);
  span.equivCodeSnippet = entry.evalCodeSnippet;
  span.totalMs += entry.endMs - entry.startMs;
  span.count++;
}

export function saveEntries(
  endpointEntry: StorageEntry,
  entries: StorageEntry[],
  method: Method,
  path: string,
) {
  if (endpointEntry.spanType !== 'endpoint') {
    return console.error('endpointEntry must be of type endpoint');
  }

  // upsert spanCodes for all entries
  for (const entry of [endpointEntry, ...entries]) {
    const codeId = genCodeId(entry);
    measurements.spanCodes[codeId] ??= {
      type: entry.spanType,
      equivCodeSnippet: entry.evalCodeSnippet,
      displayName: '',
      file: entry.file,
      errors: {},
    };
  }

  // upsert & aggregate endpoint span
  const endPointKey = `${method}-${path}`.toLowerCase();
  measurements.endpoints[endPointKey] ??= {
    method,
    path,
    span: makeSpan(endpointEntry),
    middleWares: {},
    routeHandler: { span: makeSpan(endpointEntry), concDbCalls: {} },
  };
  const endpointData = measurements.endpoints[endPointKey];
  updateSpan(endpointData.span, endpointEntry);

  // merge overlapping concurrent db intervals into groups
  const events: Record<number, { starts: StorageEntry[]; ends: StorageEntry[] }> = {};
  for (const entry of entries) {
    if (entry.spanType === 'db') {
      events[entry.startMs] ??= { starts: [], ends: [] };
      events[entry.endMs] ??= { starts: [], ends: [] };
      events[entry.startMs].starts.push(entry); // bug fix: endMs goes to ends, not starts
      events[entry.endMs].ends.push(entry);
    }
  }

  const mergedDbs: { startMs: number; endMs: number; entries: StorageEntry[] }[] = [];
  let stackLength = 0;
  let merged: StorageEntry[] = [];
  for (const time of Object.keys(events)
    .map(Number)
    .sort((a, b) => a - b)) {
    const { starts, ends } = events[time];
    stackLength -= ends.length;
    if (stackLength === 0 && merged.length > 0) {
      mergedDbs.push({ startMs: merged[0].startMs, endMs: time, entries: merged });
      merged = [];
    }
    merged.push(...starts);
    stackLength += starts.length;
  }
  
  //assign span codes for concurrent db calls
  for (const mergedDb of mergedDbs){
    const codeId = mergedDb.entries.map((e) => genCodeId(e)).sort().join('_');
    measurements.spanCodes[codeId] ??= {
      type: 'concurrent',
      equivCodeSnippet: codeId,
      displayName: '',
      file: null,
      errors: {},
    };
  }

  // assign each handler its nested db groups
  let mergedI = 0;
  for (const entry of entries) {
    if (entry.spanType !== 'route-handler' && entry.spanType !== 'middleware') continue;

    const nestedDbs: typeof mergedDbs = [];
    while (
      mergedI < mergedDbs.length &&
      mergedDbs[mergedI].startMs >= entry.startMs &&
      mergedDbs[mergedI].endMs <= entry.endMs
    ) {
      nestedDbs.push(mergedDbs[mergedI++]);
    }

    if (entry.spanType === 'route-handler') {
      updateSpan(endpointData.routeHandler.span, entry);
    } else {
      endpointData.middleWares[entry.evalCodeSnippet] ??= {
        span: makeSpan(entry),
        concDbCalls: {},
      };
    }
    const handlerData =
      entry.spanType === 'route-handler'
        ? endpointData.routeHandler
        : endpointData.middleWares[entry.evalCodeSnippet];

    if (entry.spanType === 'middleware') updateSpan(handlerData.span, entry);

    for (const nestedDb of nestedDbs) {
      const concDbKey = nestedDb.entries
        .map((e) => e.evalCodeSnippet)
        .sort()
        .join('_');
      handlerData.concDbCalls[concDbKey] ??= {
        span: makeSpan({
          startMs: 0,
          endMs: 0,
          evalCodeSnippet: concDbKey,
          spanType: 'concurrent',
          errorMessage: '',
          subPath: '',
          file: null,
        }),
        dbCalls: {},
      };

      let earliestStart = Infinity;
      let latestEnd = -Infinity;

      for (const dbEntry of nestedDb.entries) {
        earliestStart = Math.min(earliestStart, dbEntry.startMs);
        latestEnd = Math.max(latestEnd, dbEntry.endMs);

        handlerData.concDbCalls[concDbKey].dbCalls[dbEntry.evalCodeSnippet] ??= makeSpan(dbEntry);
        updateSpan(handlerData.concDbCalls[concDbKey].dbCalls[dbEntry.evalCodeSnippet], dbEntry);
      }

      updateSpan(handlerData.concDbCalls[concDbKey].span, {
        startMs: earliestStart,
        endMs: latestEnd,
        evalCodeSnippet: concDbKey,
        spanType: 'concurrent',
        errorMessage: '',
        subPath: '',
        file: null,
      });
    }
  }

  if (mergedI !== mergedDbs.length) {
    console.error('Error: Not all db intervals were nested under middlewares or route-handlers');
  }
}

export const measuringMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const begin = Date.now();
  measurements.currentInfo.liveRequests++;
  runWithStorage(() => {
    next();
    res.on('finish', () => {
      measurements.currentInfo.liveRequests--;
      const endPointEntry: StorageEntry = {
        startMs: begin,
        endMs: Date.now(),
        evalCodeSnippet: `${req.path}()`,
        errorCode: undefined,
        errorMessage: '',
        spanType: 'endpoint',
        file: null,
        subPath: '',
      };

      saveEntries(endPointEntry, getEntries(), req.method as Method, req.path);
    });
  });
};
measuringMiddleware.__kraySkipWrap = true;
