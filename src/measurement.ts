import { NextFunction, Request, Response } from 'express';
import os from 'os';
import { makeSpan, makeSpanError, makeStatus, mergeTrees } from '../shared/big-utils';
import type { EndpointSpan, MiddlewareSpan, ResponseData, RouteSpan, Span } from '../shared/types';
import { getStoredData, markEnd, markStart, runWithStorageContext } from './async-storage';
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
    debug: {
      totalErrors: 0,
      errors: {},
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
  spans,
  returnedSpan,
  req,
}: {
  spans: Record<string, Span>;
  returnedSpan: MiddlewareSpan | RouteSpan | null;
  req: Request;
}) {
  let endpointKey: string | null = null;
  for (const [key, span] of Object.entries(spans)) {
    if (span.type === 'endpoint') endpointKey = key;
  }

  if (!endpointKey) {
    addError(new Error('No endpoint span found in spans ' + JSON.stringify(spans)));
    return;
  }

  let path: string = req.path;
  let errors = makeSpanError();

  if (returnedSpan) {
    path = returnedSpan.path;
    errors = returnedSpan.errors;
  }

  const endpoint = spans[endpointKey] as EndpointSpan;
  //TODO: path appears to be '' always
  spans[endpointKey] = makeSpan({ ...endpoint, errors, path });

  mergeTrees({
    mainTree: measurements.spans,
    treeToAdd: spans,
  });
}


export function addError(error: Error) {
  const MAX_UNIQUE_ERRORS = 5;
  measurements.debug.totalErrors++;
  
  const errors = measurements.debug.errors;
  const key = error.message;
  const now = Date.now();

  if (errors[key]) {
    errors[key].count++;
    errors[key].lastTimestampMs = now;
    errors[key].trace = error.stack || '';
  } else {
    // evict oldest if at capacity
    const keys = Object.keys(errors);
    if (keys.length >= MAX_UNIQUE_ERRORS) {
      let oldestKey = keys[0];
      for (const k of keys) {
        if (errors[k].lastTimestampMs < errors[oldestKey].lastTimestampMs) {
          oldestKey = k;
        }
      }
      delete errors[oldestKey];
    }
    errors[key] = {
      message: error.message,
      trace: error.stack || '',
      count: 1,
      firstTimestampMs: now,
      lastTimestampMs: now,
    };
  }

  if (process.env.__AS_DEV) {
    throw error;
  }
}

export const measuringMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.path.includes('/__profile')) {
    return next();
  }

  measurements.status.current.liveRequests++;
  measurements.status.peak.liveRequests = Math.max(
    measurements.status.peak.liveRequests,
    measurements.status.current.liveRequests,
  );

  runWithStorageContext(() => {
    const rootIndex = markStart({ type: 'root', snippet: 'root' }, {});
    const endpointIndex = markStart({ type: 'endpoint' }, {});
    next();
    res.on('finish', () => {
      measurements.status.current.liveRequests--;

      const routePath = req.route?.path ? req.baseUrl + req.route.path : '<unmatched>';
      const endpointSnippet = `${req.method} ${routePath}`;
      const routeExists = res.statusCode === 404;

      markEnd(endpointIndex, { snippet: endpointSnippet, routeExists }, { expectSpanContext: true, forceCollapse: true });
      markEnd(rootIndex, {}, { expectSpanContext: true });

      const data = getStoredData();
      if (data) saveEntries({ spans: data.spans, req, returnedSpan: data.returnedSpan });
    });
  });
};

stampSkipWrapping(measuringMiddleware);
