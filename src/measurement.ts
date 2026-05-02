import { Request, Response, NextFunction } from 'express';
import { getStoredData, markEnd, markStart } from './async-storage';
import type { EndpointSpan, Method, ResponseData, Span, SpanCode } from '../shared/types';
import os from 'os';
import { runWithStorageContext } from './async-storage';
import { makeSpan, makeSpanCode, mergeTrees } from '../shared/utils';

let measurements: ResponseData = createMeasurements();

export function createMeasurements(): ResponseData {
  const data: ResponseData = {
    backendId: os.hostname(), //id has to stay the same after restarts for the same pod
    currentInfo: {
      cpuPercent: 0,
      liveRequests: 0,
      memoryGB: 0,
      totalMemoryGB: 0,
      isProductionMode: process.env.NODE_ENV === 'production',
    },
    spans: {},
    spanCodes: {},
    debug: {
      errors: [],
    },
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

export function saveEntries({
  spanCodes,
  spans,
}: {
  spanCodes: Record<string, SpanCode>;
  spans: Record<string, Span>;
}) {
  mergeTrees({
    mainTree: measurements.spans,
    treeToAdd: spans,
    mainSpanCodes: measurements.spanCodes,
    spanCodesToAdd: spanCodes,
  });
}

export function addError(error: Error) {
  measurements.debug.errors.push({ message: error.message, trace: error.stack || '' });
  if (process.env.__AS_DEV) {
    throw error;
  }
}

export const measuringMiddleware = (req: Request, res: Response, next: NextFunction) => {
  measurements.currentInfo.liveRequests++;
  runWithStorageContext(() => {
    const rootIndex = markStart('root', {}, { snippet: 'express.js' });
    const endpointIndex = markStart(
      'endpoint',
      { method: req.method as Method, path: req.path },
      { snippet: `${req.path}()` },
    );
    next();
    res.on('finish', () => {
      measurements.currentInfo.liveRequests--;

      markEnd(endpointIndex, {}, {}, { forceCollapse: true, expectSpanContext: true });
      markEnd(rootIndex, {}, {}, { expectSpanContext: true });
      const store = getStoredData();

      if (store) {
        saveEntries({ spans: store.spans, spanCodes: store.spanCodes });
      }
    });
  });
};
measuringMiddleware.__kraySkipWrap = true;
