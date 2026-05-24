import { Request, Response, NextFunction } from 'express';
import { getStoredData, markEnd, markStart } from './async-storage';
import type { Method, ResponseData, Span, SpanCode, Status } from '../shared/types';
import os from 'os';
import { runWithStorageContext } from './async-storage';
import { makeStatus, mergeTrees } from '../shared/big-utils';
import { stampSkipWrapping } from './utils';

let measurements: ResponseData = createMeasurements();

export function createMeasurements(): ResponseData {
  const data: ResponseData = {
    backendId: os.hostname(), //id has to stay the same after restarts for the same pod
    isProductionMode: process.env.NODE_ENV === 'production',
    status: {
      current: makeStatus(),
      peak: makeStatus(),
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
  const requestsAtMoment = measurements.status.current.liveRequests;
  measurements = createMeasurements();
  measurements.status.current.liveRequests = requestsAtMoment;
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
  const { peak, current } = measurements.status;
  current.cpuPercent = cpuPercent;
  current.memoryGB = memoryGB;
  current.totalMemoryGB = totalMemoryGB;

  peak.cpuPercent = Math.max(peak.cpuPercent, cpuPercent);
  peak.memoryGB = Math.max(peak.memoryGB, memoryGB);
  peak.totalMemoryGB = Math.max(peak.totalMemoryGB, totalMemoryGB);

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
  measurements.status.current.liveRequests++;
  measurements.status.peak.liveRequests = Math.max(
    measurements.status.peak.liveRequests,
    measurements.status.current.liveRequests,
  );

  runWithStorageContext(() => {
    const rootIndex = markStart('root', {}, { snippet: '<root>' });
    const endpointIndex = markStart(
      'endpoint',
      {
        method: req.method as Method,
        path: req.route?.path ? req.baseUrl + req.route?.path : '<no match>',
      },
      { snippet: `${req.method}:${req.path}()` },
    );
    next();
    res.on('finish', () => {
      measurements.status.current.liveRequests--;

      markEnd(endpointIndex, {}, {}, { forceCollapse: true, expectSpanContext: true });
      markEnd(rootIndex, {}, {}, { expectSpanContext: true });
      const store = getStoredData();

      if (store) {
        saveEntries({ spans: store.spans, spanCodes: store.spanCodes });
      }
    });
  });
};

stampSkipWrapping(measuringMiddleware);
