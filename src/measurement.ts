import { Request, Response, NextFunction } from 'express';
import { getEntries, StorageEntry } from './async-storage';
import type { HandlerData, ResponseData, Span, SpanCode } from '../shared-types';
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

function defaultSpan() {
  const data: Span = {
    codeId: '',
    equivCodeSnippet: '',
    totalMs: 0,
    count: 0,
  };
  return data;
}

function defaultHandlerData() {
  const data: HandlerData = {
    span: defaultSpan(),
    concDbCalls: {},
  };
  return data;
}

function defaultEndpointData() {
  const data: ResponseData['endpoints'][string] = {
    span: defaultSpan(),
    middleWares: {},
    routeHandler: defaultHandlerData(),
  };
  return data;
}

function defaultSpanCode() {
  const data: ResponseData['spanCodes'][string] = {
    type: 'endpoint',
    equivCodeSnippet: '',
    displayName: '',
    file: null,
    errors: {},
  };
  return data;
}

export function saveEntries(endpointEntry: StorageEntry, entries: StorageEntry[]) {
  if (endpointEntry.spanType !== 'endpoint') {
    return console.error('endpointEntry must be of type endpoint');
  }

  for (const entry of [endpointEntry, ...entries]) {
    const codeId = genCodeId(entry);
    measurements.spanCodes[codeId] ??= defaultSpanCode();
    const spanCode = measurements.spanCodes[codeId];
    spanCode.type = entry.spanType;
    spanCode.equivCodeSnippet = entry.evalCodeSnippet;
  }

  //add endpoint
  measurements.endpoints[endpointEntry.subPath] ??= defaultEndpointData();
  const endpointData = measurements.endpoints[endpointEntry.subPath];
  endpointData.span.codeId = genCodeId(endpointEntry);
  endpointData.span.equivCodeSnippet = endpointEntry.evalCodeSnippet;
  endpointData.span.totalMs = 0;
  endpointData.span.count = 0;

  //merge db intervals
  const events: Record<number, { starts: StorageEntry[]; ends: StorageEntry[] }> = {};
  for (const entry of entries) {
    if (entry.spanType === 'db') {
      events[entry.startMs] = events[entry.startMs] || { starts: [], ends: [] };
      events[entry.endMs] = events[entry.endMs] || { starts: [], ends: [] };

      events[entry.startMs].starts.push(entry);
      events[entry.startMs].ends.push(entry);
    }
  }

  const mergedDbs: { startMs: number; endMs: number; entries: StorageEntry[] }[] = []; //already sorted by start time
  let stackLength = 0;
  let merged: StorageEntry[] = [];
  const times = Object.keys(events)
    .map((x) => +x)
    .sort((a, b) => a - b);

  for (const time of times) {
    const { starts, ends } = events[time];

    stackLength -= ends.length;
    if (stackLength === 0 && merged.length > 0) {
      mergedDbs.push({ startMs: merged[0].startMs, endMs: time, entries: merged });
      merged = [];
    }

    merged.push(...starts);
    stackLength += starts.length;
  }

  let mergedI = 0;
  for (const entry of entries) {
    if (entry.spanType === 'route-handler' || entry.spanType === 'middleware') {
      const nestedDbs: { startMs: number; endMs: number; entries: StorageEntry[] }[] = [];
      while (
        mergedI < mergedDbs.length &&
        mergedDbs[mergedI].startMs >= entry.startMs &&
        mergedDbs[mergedI].endMs <= entry.endMs
      ) {
        nestedDbs.push(mergedDbs[mergedI]);
        mergedI++;
      }

      let handlerData: HandlerData;
      if (entry.spanType === 'route-handler') {
        handlerData = endpointData.routeHandler;
      } else {
        endpointData.middleWares[entry.evalCodeSnippet] ??= defaultHandlerData();
        handlerData = endpointData.middleWares[entry.evalCodeSnippet];
      }

      handlerData.span.equivCodeSnippet = entry.evalCodeSnippet;
      handlerData.span.codeId = genCodeId(entry);
      handlerData.span.totalMs += entry.endMs - entry.startMs;
      handlerData.span.count++;

      for (const nestedDb of nestedDbs) {
        const concDbKey = nestedDb.entries
          .map((e) => e.evalCodeSnippet)
          .sort()
          .join('_');
        handlerData.concDbCalls[concDbKey] ??= {
          dbCalls: {},
        };
        for (const dbEntry of nestedDb.entries) {
          const dbCodeId = genCodeId(dbEntry);
          const dbKey = dbEntry.evalCodeSnippet;
          handlerData.concDbCalls[concDbKey].dbCalls[dbKey] ??= defaultSpan();
          const span = handlerData.concDbCalls[concDbKey].dbCalls[dbKey];
          span.totalMs += dbEntry.endMs - dbEntry.startMs;
          span.count++;
          span.codeId = dbCodeId;
          span.equivCodeSnippet = dbEntry.evalCodeSnippet;
        }
      }
    }
  }

  if (mergedI !== mergedDbs.length) {
    console.error('Error: Not all db intervals were nested under middlewares or route-handlers');
    return;
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

      saveEntries(endPointEntry, getEntries());
    });
  });
};
measuringMiddleware.__kraySkipWrap = true;
