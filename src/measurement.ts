import type { ResponseData, Span, SpanCode } from '../shared-types';
import os from 'os';

let measurements: ResponseData = createMeasurements();

export function createMeasurements(): ResponseData {
  return {
    backendId: 'id-' + os.hostname(), //id has to stay the same after restarts for the same pod
    currentInfo: {
      cpuPercent: -1,
      liveRequests: -1,
      memoryGB: -1,
      totalMemoryGB: -1,
    },
    spanCodes: {
      '<unhandled>': {
        type: 'endpoint',
        equivCodeSnippet: '<unhandled>',
        displayName: 'Unhandled endpoint',
        file: null,
        errors: {},
      },
    },
    spans: {},
    unhandledEndpoint: {
      codeId: '<unhandled>',
      equivCodeSnippet: '<unhandled>',
      totalMs: 0,
      count: 0,
      hasConcurrentChildren: false,
      childrenKeys: [],
    },
  };
}

export function resetMeasurements() {
  const requestsAtMoment = measurements.currentInfo.liveRequests;
  measurements = createMeasurements();
  measurements.currentInfo.liveRequests = requestsAtMoment;
}

function genSpanKey(method: string, path: string, span: Span) {
  return `${method}-${path}-${span.equivCodeSnippet}`; //code id is globally unique
}

function genCodeId(spanCode: SpanCode) {
  return `${spanCode.type}-${spanCode.file?.filePath || '<unk-path>'}-${spanCode.equivCodeSnippet}`;
}

export function addSpan(method: string, path: string, span: Span, spanCode: SpanCode) {
  for (const childKey of span.childrenKeys) {
    if (!(childKey in measurements.spans)) {
      throw new Error('childKey not found in measurements.spans');
    }
  }

  if (span.count != 1) {
    throw new Error('span.count must be 1');
  }

  const codeId = genCodeId(spanCode);
  const spanKey = genSpanKey(method, path, span);

  if (measurements.spans[spanKey]?.codeId != codeId) {
    delete measurements.spanCodes[codeId];
  }

  measurements.spanCodes[codeId] = {
    equivCodeSnippet: spanCode.equivCodeSnippet,
    displayName: spanCode.displayName,
    type: spanCode.type,
    file: spanCode.file,
    errors: spanCode.errors,
  };

  for (const errorCode of Object.keys(spanCode.errors)) {
    if (!measurements.spanCodes[codeId].errors[errorCode]) {
      measurements.spanCodes[codeId].errors[errorCode] = { count: 0, message: '' };
    }

    const error = measurements.spanCodes[codeId].errors[errorCode];

    error.message = spanCode.errors[errorCode].message;
    error.count++;
  }

  const aggregatedSpan:Span = measurements.spans[spanKey] || {
    codeId,
    equivCodeSnippet: spanCode.equivCodeSnippet,
    totalMs: 0,
    count: 0,
    hasConcurrentChildren: span.hasConcurrentChildren,
    childrenKeys: span.childrenKeys,
  };

  aggregatedSpan.totalMs += span.totalMs;
  aggregatedSpan.count += span.count;
  measurements.spans[spanKey] = aggregatedSpan;
}

export function addUnhandledSpan(span: Span) {
  measurements.unhandledEndpoint.totalMs += span.totalMs;
  measurements.unhandledEndpoint.count += span.count;
}

export function incrementLiveRequests() {
  if (measurements.currentInfo.liveRequests === -1) {
    measurements.currentInfo.liveRequests = 0;
  }
  measurements.currentInfo.liveRequests++;
}

export function decrementLiveRequests() {
  if (measurements.currentInfo.liveRequests === -1) {
    measurements.currentInfo.liveRequests = 0;
  }
  measurements.currentInfo.liveRequests--;
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
