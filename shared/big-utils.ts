import {
  Change,
  ChangeType,
  Duration,
  EndpointSpan,
  ESpanTableData,
  Recording,
  ResponseData,
  Span,
  SpanCode,
  SpanType,
  Status,
} from './types';

export function makeSpan(partial: Partial<Span> & { type: SpanType }): Span {
  switch (partial.type) {
    case 'middleware':
      return { spanCodeId: '', totalMs: 0, count: 0, spans: [], ...partial };
    case 'db':
      return { spanCodeId: '', totalMs: 0, count: 0, spans: [], ...partial };
    case 'endpoint':
      return {
        spanCodeId: '',
        totalMs: 0,
        count: 0,
        method: 'get',
        path: '<badpath>',
        errors: {},
        spans: [],
        ...partial,
      };
    case 'route':
      return { spanCodeId: '', totalMs: 0, count: 0, spans: [], ...partial };
    case 'promise-all':
      return { spanCodeId: '', totalMs: 0, count: 0, spans: [], ...partial };
    case 'root':
      return { spanCodeId: '', totalMs: 0, count: 0, spans: [], ...partial };
    case 'console-log':
      return { spanCodeId: '', totalMs: 0, count: 0, spans: [], ...partial };
    default:
      throw new Error(`Invalid span type ${(partial as any).type}`);
  }
}

//modifies existingSpan but returns reference
export function mergeSpan({
  type,
  newSpan,
  existingSpan,
}: {
  type: SpanType;
  newSpan: Partial<Span>;
  existingSpan?: Span;
}) {
  const types = [type, newSpan.type, existingSpan?.type];
  if (new Set(types.filter(Boolean)).size > 1) {
    throw new Error(`Mismatched span types: ${types}`);
  }

  const existing = existingSpan || makeSpan({ type: type });
  existing.totalMs += newSpan.totalMs ?? 0;
  existing.count += newSpan.count ?? 0;
  existing.spanCodeId = newSpan.spanCodeId ?? existing.spanCodeId;

  const mergedSubSpans = new Set<string>();

  existing.spans.forEach((s) => mergedSubSpans.add(s));
  if (newSpan.spans) {
    newSpan.spans.forEach((s) => mergedSubSpans.add(s));
  }
  existing.spans = Array.from(mergedSubSpans);

  if (type === 'endpoint' && existing.type === 'endpoint') {
    const partialNewSpan = newSpan as Partial<EndpointSpan>;
    existing.method = partialNewSpan.method ?? (existing as EndpointSpan).method;
    existing.path = partialNewSpan.path ?? (existing as EndpointSpan).path;
    existing.errors = { ...(partialNewSpan.errors ?? {}), ...(existing.errors ?? {}) };
  }
  return existing;
}

export function makeSpanCode(partial: Partial<SpanCode> & { type: SpanType }): SpanCode {
  return {
    type: partial.type,
    snippet: partial?.snippet || '',
    filePath: partial?.filePath || '',
    line: partial?.line || -1,
    col: partial?.col || -1,
  };
}

export function mergeSpanCodes({
  type,
  newSpanCode,
  existingSpanCode,
}: {
  type: SpanType;
  newSpanCode: Partial<SpanCode>;
  existingSpanCode?: SpanCode;
}) {
  const existing = existingSpanCode || makeSpanCode({ type: type });
  existing.snippet = newSpanCode.snippet ?? existing.snippet;
  existing.filePath = newSpanCode.filePath ?? existing.filePath;
  existing.line = newSpanCode.line ?? existing.line;
  return existing;
}

export function allSpansHaveCodes(
  spans: Record<string, Span>,
  spanCodes: Record<string, SpanCode>,
) {
  for (const key in spans) {
    if (!spanCodes[spans[key].spanCodeId]) {
      return false;
    }
  }
  return true;
}

export function mergeTrees(trees: {
  mainTree: Record<string, Span>;
  treeToAdd: Record<string, Span>;
  mainSpanCodes: Record<string, SpanCode>;
  spanCodesToAdd: Record<string, SpanCode>;
}) {
  const { mainTree, treeToAdd, mainSpanCodes, spanCodesToAdd } = trees;

  for (const key in treeToAdd) {
    mainTree[key] = mergeSpan({
      type: treeToAdd[key].type,
      newSpan: treeToAdd[key],
      existingSpan: mainTree[key],
    });
  }

  for (const key in spanCodesToAdd) {
    mainSpanCodes[key] = mergeSpanCodes({
      type: spanCodesToAdd[key].type,
      newSpanCode: spanCodesToAdd[key],
      existingSpanCode: mainSpanCodes[key],
    });
  }
}

export function safeDivide(
  a: number | undefined | null,
  b: number | undefined | null,
  { toPercent = false, abs = false }: { toPercent?: boolean; abs?: boolean } = {},
) {
  let ans = 0;
  a = a ?? 0;
  b = b || 1;

  ans = a / b;
  if (toPercent) {
    ans = Math.round(ans * 100);
  }
  if (abs) {
    ans = Math.abs(ans);
  }
  return ans;
}

export function getDuration(ms: number): Duration {
  const totalSeconds = Math.floor(ms / 1000);

  const days = Math.floor(totalSeconds / (3600 * 24));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const daysStr = days.toString();
  const hoursStr = hours.toString().padStart(2, '0');
  const minutesStr = minutes.toString().padStart(2, '0');
  const secondsStr = seconds.toString().padStart(2, '0');

  return { hours, minutes, seconds, hoursStr, minutesStr, secondsStr, days, daysStr };
}

export function humanNum(num: number) {
  return num.toLocaleString();
}

export function round(num: number, decimals: number = 0) {
  return Math.round(num * 10 ** decimals) / 10 ** decimals;
}

export function sum<T>(getItem: (item: T) => number, ...items: T[]): number {
  return items.reduce((sum, item) => sum + getItem(item), 0);
}

export function toItems<T>(filterItem: (item: T) => boolean, obj: Record<string, T>) {
  return Object.values(obj).filter(filterItem);
}

export function makeStatus(): Status {
  return {
    cpuPercent: 0,
    liveRequests: 0,
    memoryGB: 0,
    totalMemoryGB: 0,
  };
}

function makeChange(cur: number, prev: number | null | undefined): Change {
  if (prev === null || prev === undefined) {
    return {
      hasPrev: false,
      cur,
      prev: null,
      change: null,
      changePercent: null,
    };
  }

  const change = cur - prev;
  return {
    hasPrev: true,
    cur,
    prev,
    change,
    changePercent: safeDivide(change, prev, { toPercent: true }),
  };
}

function getMergedSpansAndSpancodes(responseDatas: ResponseData[]) {
  console.log('🚀 ~ getMergedSpansAndSpancodes ~ responseDatas:', responseDatas);
  const spans: Record<string, Span> = {};
  const spanCodes: Record<string, SpanCode> = {};

  for (const r of responseDatas) {
    mergeTrees({
      mainTree: spans,
      treeToAdd: r.spans,
      mainSpanCodes: spanCodes,
      spanCodesToAdd: r.spanCodes,
    });
  }
  return { spans, spanCodes };
}

function getKpis(responseDatas: ResponseData[]) {
  const { spans } = getMergedSpansAndSpancodes(responseDatas);
  const avgLatencyMs = safeDivide(
    sum((s) => s.totalMs, ...toItems((s) => s.type === 'endpoint', spans)),
    sum((s) => s.count, ...toItems((s) => s.type === 'endpoint', spans)),
  );

  //middleware or endpoint spans
  const errorRate = 0;

  //total reqs
  const totalRequests = sum((s) => s.count, ...toItems((s) => s.type === 'endpoint', spans));

  return {
    avgLatencyMs,
    errorRate,
    totalRequests,
  };
}

function makeESpanTableData<T>(
  partialData: Partial<ESpanTableData<unknown>> & { extra: T; span: Span },
): ESpanTableData<T> {
  const nested = [] as ESpanTableData<T>[];

  const result = {
    avgLatencyContributionMs: makeChange(0, null),
    totalLatencyContributionMs: makeChange(0, null),
    totalCount: makeChange(0, null),
    totalErrorCount: makeChange(0, null),
    errors: null,
    nested,
    ...partialData,
  } as ESpanTableData<T>;

  return result;
}

function getTotalLatency(responseDatas: ResponseData[]) {
  const { spans } = getMergedSpansAndSpancodes(responseDatas);
  return sum((s) => s.totalMs, ...toItems((s) => s.type === 'endpoint', spans));
}

function getTotalRequests(responseDatas: ResponseData[]) {
  const { spans } = getMergedSpansAndSpancodes(responseDatas);
  return sum((s) => s.count, ...toItems((s) => s.type === 'endpoint', spans));
}

interface CurPrevArgs {
  spans: Record<string, Span>;
  totalLatency: number;
  totalRequests: number;
}
export function genSpanTableData({
  span,
  expandSpanTypes,
  cur,
  prev,
}: {
  span: Span;
  expandSpanTypes: SpanType[];
  cur: CurPrevArgs;
  prev: null | CurPrevArgs;
}): ESpanTableData<null>[] {
  const children: ESpanTableData<null>[] = [];
  const { spans, totalLatency, totalRequests } = cur;
  for (const subSpanId of span.spans) {
    const subSpan = spans[subSpanId];
    children.push(...genSpanTableData({ span: subSpan, cur, expandSpanTypes, prev }));
  }

  if (expandSpanTypes.includes(span.type)) {
    return children;
  }

  const totalLatencyContributionMs = makeChange(
    span.totalMs,
    prev?.spans[span.spanCodeId]?.totalMs,
  );
  const totalCount = makeChange(span.count, prev?.spans[span.spanCodeId]?.count);
  const avgLatencyContributionMs = makeChange(
    safeDivide(totalLatencyContributionMs.cur, totalCount.cur),
    prev ? safeDivide(totalLatencyContributionMs.prev, totalCount.prev) : null,
  );
  const totalErrorCount = makeChange(0, 0);
  const errors = null;

  return [
    makeESpanTableData({
      extra: null,
      span,
      totalLatencyContributionMs,
      avgLatencyContributionMs,
      totalCount,
      totalErrorCount,
    }),
  ];
}

export function makeRecording<T>(partial: Partial<Recording<T>> & { extra: T }): Recording<T> {
  return {
    responseDatas: [],
    title: '',
    startTimeMs: 0,
    endTimeMs: 0,
    ...partial,
  };
}

//directly used by react for humans and/or md generator for the agents
export const extr = {
  getStatus(resDatas: ResponseData[]) {
    const main = makeStatus();
    const others = resDatas.map((r) => r.status.current);

    for (const other of others) {
      main.cpuPercent += other.cpuPercent;
      main.memoryGB += other.memoryGB;
      main.totalMemoryGB += other.totalMemoryGB;
    }

    const replicas = resDatas.length;
    const memoryPercent = safeDivide(main.memoryGB, main.totalMemoryGB, { toPercent: true });
    const cpuPercent = round(main.cpuPercent);

    return {
      liveReqs: main.liveRequests,
      replicas,
      cpuPercent,
      memoryPercent,
    };
  },

  peakStatus(resDatas: ResponseData[]): Status {
    const main = makeStatus();
    const others = resDatas.map((r) => r.status.peak);

    for (const other of others) {
      main.cpuPercent = Math.max(main.cpuPercent, other.cpuPercent);
      main.memoryGB = Math.max(main.memoryGB, other.memoryGB);
      main.totalMemoryGB = Math.max(main.totalMemoryGB, other.totalMemoryGB);
    }
    return main;
  },

  kpiWithChanges: (curResDatas: ResponseData[], prevResDatas?: ResponseData[]) => {
    const curKpis = getKpis(curResDatas);
    const prevKpis = prevResDatas ? getKpis(prevResDatas) : null;

    const kpisWithChanges = {
      avgLatency: makeChange(curKpis.avgLatencyMs, prevKpis?.avgLatencyMs),
      errorRate: makeChange(curKpis.errorRate, prevKpis?.errorRate),
      totalRequests: makeChange(curKpis.totalRequests, prevKpis?.totalRequests),
    };

    return kpisWithChanges;
  },

  getSpanError(span: Span, responseDatas: ResponseData[]) {
    const { spans, spanCodes } = getMergedSpansAndSpancodes(responseDatas);
    return '';
  },

  getSourceIfLocal(span: Span, responseDatas: ResponseData[]): SpanCode['snippet'] {
    const { spans, spanCodes } = getMergedSpansAndSpancodes(responseDatas);
    return spanCodes[span.spanCodeId].snippet;
  },

  getSpanTableData(
    responseDatas: ResponseData[],
    expandSpanTypes: SpanType[],
    prevResponseDatas?: ResponseData[],
  ): ESpanTableData<null>[] {
    const { spans: curSpans } = getMergedSpansAndSpancodes(responseDatas);

    const cur = {
      spans: curSpans,
      totalLatency: getTotalLatency(responseDatas),
      totalRequests: getTotalRequests(responseDatas),
    };

    const prev = prevResponseDatas
      ? {
          spans: getMergedSpansAndSpancodes(prevResponseDatas).spans,
          totalLatency: getTotalLatency(responseDatas),
          totalRequests: getTotalRequests(prevResponseDatas),
        }
      : null;

    return genSpanTableData({
      span: curSpans['root'],
      expandSpanTypes,
      cur,
      prev,
    });
  },

  getMaxSpanLatencyMs(responseDatas: ResponseData[]) {
    let max = 0;
    const { spans } = getMergedSpansAndSpancodes(responseDatas);
    for (const span of Object.values(spans)) {
      max = Math.max(max, span.totalMs);
    }
    return max;
  },

  getChangeType(
    change: Change,
    options: { moreIsBetter: boolean } & ({ thresPercent: number } | { thresChange: number }),
  ) {
    let changeType: ChangeType = 'almost-same';
    let sign = '';

    if (!change.hasPrev) {
      changeType = 'new';
    } else if ('thresPercent' in options && change.changePercent > options.thresPercent) {
      const increased = change.changePercent > 0;
      changeType = increased === options.moreIsBetter ? 'better' : 'worse';
    } else if ('thresChange' in options && change.change > options.thresChange) {
      const increased = change.change > 0;
      changeType = increased === options.moreIsBetter ? 'better' : 'worse';
    } else {
      changeType = 'almost-same';
    }

    if (change.hasPrev) {
      sign = change.change > 0 ? '+' : '-';
    }

    const vertArrows: Record<ChangeType, string> = {
      'almost-same': '~',
      better: '↑',
      worse: '↓',
      new: '',
    };

    const vertFatArrows: Record<ChangeType, string> = {
      'almost-same': '~',
      better: '▲',
      worse: '▼',
      new: '',
    };
    const horizArrows: Record<ChangeType, string> = {
      'almost-same': '~',
      better: '→',
      worse: '←',
      new: '',
    };

    const horizFatArrows: Record<ChangeType, string> = {
      'almost-same': '~',
      better: '▶',
      worse: '◀',
      new: '',
    };

    const horzArrow = horizArrows[changeType];
    const vertArrow = vertArrows[changeType];

    const vertFatArrow = vertFatArrows[changeType];
    const horizFatArrow = horizFatArrows[changeType];

    return {
      type: changeType,
      sign,
      horzArrow,
      vertArrow,
      vertFatArrow,
      horizFatArrow,
    };
  },

  getRecordingInfo<T>(recording: Recording<T>) {
    const endTimeMs = recording.endTimeMs ? recording.endTimeMs : new Date().getTime();

    return {
      recording,
      duration: getDuration(endTimeMs - recording.startTimeMs),
      ago: getDuration(new Date().getTime() - endTimeMs),
      totalRequests: getTotalRequests(recording.responseDatas),
    };
  },
};
