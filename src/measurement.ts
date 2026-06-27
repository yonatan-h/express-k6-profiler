import { NextFunction, Request, Response } from 'express';
import os from 'os';
import { makeSpan, makeSpanError, makeStatus, mergeTrees, safeDivide } from '../shared/big-utils';
import type { EndpointSpan, MiddlewareSpan, ResponseData, RouteSpan, Span } from '../shared/types';
import { getStoredData, markEnd, markStart, runWithStorageContext } from './async-storage';
import { stampSkipWrapping } from './utils';

let measurements: ResponseData = createMeasurements();

export function createMeasurements(): ResponseData {
  const data: ResponseData = {
    backendId: os.hostname(), //id has to stay the same after restarts for the same pod
    isProductionMode: process.env.NODE_ENV === 'production',
    _internal: {
      currentSecondCount: 0,
      previousSecondCount: 0,
      lastResetStamp: 0,
    },
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
  const reqsAtMoment = measurements.status.current.requestsPerSec;
  measurements = createMeasurements();
  measurements.status.current.requestsPerSec = reqsAtMoment;
}

export function keepCalculatingReqPerSec() {
  const timer = setInterval(() => {
    const {
      _internal,
      status: { peak, current },
    } = measurements;
    if (_internal) {
      _internal.previousSecondCount = _internal.currentSecondCount;
      const diff = Date.now() - _internal.lastResetStamp; //so that it stays accurate if event loop is slow
      current.requestsPerSec = 1000* safeDivide(_internal.previousSecondCount, diff || 1000);
      peak.requestsPerSec = Math.max(peak.requestsPerSec, current.requestsPerSec);

      _internal.currentSecondCount = 0;
      _internal.lastResetStamp = Date.now();
    } else {
      addError(new Error('_internal is empty inside backend'));
    }
  }, 1000);
  timer.unref();
}

async function getGeneralStatus() {
  const startUsage = process.cpuUsage(); // user: nanoseconds; system: nanoseconds;
  const startTime = process.hrtime(); // [seconds, nanoseconds]

  await new Promise((resolve) => setTimeout(resolve, 200));

  const { user: diffUserNano, system: diffSystemNano } = process.cpuUsage(startUsage);
  const diffTimeNano = process.hrtime(startTime)[0] * 1e9 + process.hrtime(startTime)[1];

  const totalUsageNano = diffUserNano + diffSystemNano;
  const cpuPercent = (totalUsageNano / diffTimeNano) * 100;

  const totalMemoryBytes = os.totalmem();
  const freeMemoryBytes = os.freemem();
  const memoryGB = (totalMemoryBytes - freeMemoryBytes) / (1024 * 1024 * 1024);
  const totalMemoryGB = totalMemoryBytes / (1024 * 1024 * 1024);

  return { cpuPercent, memoryGB, totalMemoryGB };
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

  return { ...measurements, _internal: null };
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

  if (process.env.__AS_DEV === 'true') {
    //so that its not handled by express
    setTimeout(() => {
      throw error;
    }, 0);
  }
}

export const measuringMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.path.includes('/__profile')) {
    return next();
  }

  if (measurements._internal) {
    measurements._internal.currentSecondCount++;
  }

  runWithStorageContext(() => {
    const rootId = markStart({ type: 'root', snippet: 'root' }, {});
    const endpointId = markStart({ type: 'endpoint' }, {});
    next();
    res.on('finish', () => {
      const routePath = req.route?.path ? req.baseUrl + req.route.path : '<unmatched>';
      const endpointSnippet = `${req.method} ${routePath}`;
      const routeExists = res.statusCode === 404;

      const path: string = req.path;
      const errors =
        res.statusCode >= 400 ? makeSpanError(`${res.statusCode} ${res.statusMessage}`) : undefined;
      markEnd(
        endpointId,
        { snippet: endpointSnippet, routeExists, path, errors },
        { expectSpanContext: true, forceCollapse: true },
      );
      markEnd(rootId, {}, { expectSpanContext: true });

      const data = getStoredData();
      if (data) {
        mergeTrees({
          mainTree: measurements.spans,
          treeToAdd: data.spans,
        });
      }
    });
  });
};

stampSkipWrapping(measuringMiddleware);
