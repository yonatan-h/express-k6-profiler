import {
  rootSpanKey,
  type Change,
  type ChangeType,
  type Duration,
  type ESpanTableData,
  type Recording,
  type ResponseData,
  type Span,
  type SpanType,
  type Status,
} from './types';

export function makeSpanError(...samples: string[]): Span['errors'] {
  return {
    count: samples.length,
    samples,
  };
}

export function makeSpan(partial: Partial<Span> & { type: SpanType }): Span {
  const base = {
    totalMs: 0,
    count: 0,
    spans: [],
    snippet: '',
    code: '',
    errors: makeSpanError(),
    ...partial,
  };

  switch (partial.type) {
    case 'route':
      return { method: 'get', path: '', ...base, type: 'route' };
    case 'middleware':
      return { ...base, path: '', type: 'middleware' };
    case 'db':
      return { ...base, type: 'db' };
    case 'promise-all':
      return { ...base, type: 'promise-all' };
    case 'root':
      return { ...base, type: 'root' };
    case 'console-log':
      return { ...base, type: 'console-log' };
    case 'endpoint':
      return { method: 'get', path: '', ...base, type: 'endpoint' };
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

  const existing = existingSpan || makeSpan({ type });
  existing.totalMs += newSpan.totalMs ?? 0;
  existing.count += newSpan.count ?? 0;
  existing.snippet = newSpan.snippet ?? existing.snippet;
  existing.code = newSpan.code ?? existing.code;
  existing.filePath = newSpan.filePath ?? existing.filePath;
  existing.line = newSpan.line ?? existing.line;
  existing.col = newSpan.col ?? existing.col;

  if (newSpan.errors) {
    existing.errors.count += newSpan.errors.count;
    existing.errors.samples = [...existing.errors.samples, ...newSpan.errors.samples].slice(0, 10);
  }

  const mergedSubSpans = new Set<string>();
  existing.spans.forEach((s) => mergedSubSpans.add(s));
  if (newSpan.spans) {
    newSpan.spans.forEach((s) => mergedSubSpans.add(s));
  }
  existing.spans = Array.from(mergedSubSpans);

  return existing;
}

export function mergeTrees(trees: {
  mainTree: Record<string, Span>;
  treeToAdd: Record<string, Span>;
}) {
  const { mainTree, treeToAdd } = trees;

  for (const key in treeToAdd) {
    mainTree[key] = mergeSpan({
      type: treeToAdd[key].type,
      newSpan: treeToAdd[key],
      existingSpan: mainTree[key],
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

  const ret = { hours, minutes, seconds, hoursStr, minutesStr, secondsStr, days, daysStr };
  return ret;
}

export function humanNum(num: number, rounded = true) {
  if (rounded) {
    num = round(num);
  }
  return num.toLocaleString();
}

export function round(num: number, decimals: number = 0) {
  return Math.round(num * 10 ** decimals) / 10 ** decimals;
}

export function sum<T>(getItem: (item: T) => number, ...items: T[]): number {
  return items.reduce((sum, item) => sum + getItem(item), 0);
}

export function getItems<T>(filterItem: (item: T) => boolean, obj: Record<string, T>) {
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

function getMergedSpans(responseDatas: ResponseData[]) {
  const spans: Record<string, Span> = {};

  for (const r of responseDatas) {
    mergeTrees({
      mainTree: spans,
      treeToAdd: r.spans,
    });
  }
  return spans;
}

const isEndpointSpan = (s: Span) => s.type === 'endpoint';
function getKpis(responseDatas: ResponseData[]) {
  const spans = getMergedSpans(responseDatas);
  const avgLatencyMs = safeDivide(
    sum((s) => s.totalMs, ...getItems(isEndpointSpan, spans)),
    sum((s) => s.count, ...getItems(isEndpointSpan, spans)),
  );

  //middleware or endpoint spans
  const totalErrors = sum((s) => s.errors.count, ...getItems(isEndpointSpan, spans));

  //total reqs
  const totalRequests = sum((s) => s.count, ...getItems(isEndpointSpan, spans));

  return {
    avgLatencyMs,
    errorRate: safeDivide(totalErrors, totalRequests, { toPercent: true }),
    totalRequests,
  };
}

function makeESpanTableData<T>(
  partialData: Partial<ESpanTableData<T>> & { extra: T; span: Span },
): ESpanTableData<T> {
  const nested = [] as ESpanTableData<T>[];

  const result: ESpanTableData<T> = {
    avgLatencyContributionMs: makeChange(0, null),
    totalLatencyContributionMs: makeChange(0, null),
    totalCount: makeChange(0, null),
    totalErrorCount: makeChange(0, null),
    errors: null,
    nested,
    snippet: '<snippet>',
    ...partialData,
  };

  return result;
}

function getTotalLatency(responseDatas: ResponseData[]) {
  const spans = getMergedSpans(responseDatas);
  return sum((s) => s.totalMs, ...getItems(isEndpointSpan, spans));
}

function getTotalRequests(responseDatas: ResponseData[]) {
  const spans = getMergedSpans(responseDatas);
  return sum((s) => s.count, ...getItems(isEndpointSpan, spans));
}

interface ResDataInfo<T> {
  spans: Record<string, Span>;
  totalLatency: number;
  totalRequests: number;
}

function getChildrenAfterSkip(
  spanKey: string,
  spans: Record<string, Span>,
  skipSpanTypes: SpanType[],
): string[] {
  const s = spans[spanKey];
  if (!s) {
    console.error(`Span with key ${spanKey} not found in spans during tree shortening`);
    return [];
  }
  const children: string[] = [];

  for (const id of s.spans) {
    const child = spans[id];
    if (!child) {
      console.error(`Child span with key ${id} not found in spans during tree shortening`);
      return [];
    }
    if (skipSpanTypes.includes(child.type)) {
      children.push(...getChildrenAfterSkip(id, spans, skipSpanTypes));
    } else {
      children.push(id);
    }
  }

  return children;
}

function mergeChildTwins(
  key: string,
  result: Record<string, Span>,
  spans: Record<string, Span>,
  skipSpanTypes: SpanType[],
) {
  if (!result[key]) {
    console.error(`Span with key ${key} not found in result during tree shortening`);
    return;
  }

  const grouped: Record<string, string[]> = {};
  for (const childKey of result[key].spans) {
    const child = spans[childKey];
    if (!child) {
      console.error(`Child span with key ${childKey} not found in spans during tree shortening`);
      continue;
    }
    const groupKey = `${child.type}:${child.snippet}:${child.code}`;
    grouped[groupKey] = grouped[groupKey] || [];
    grouped[groupKey].push(childKey);
  }

  //process cur layer
  result[key].spans = [];
  for (const siblingKeys of Object.values(grouped)) {
    siblingKeys.sort();
    const primaryKey = siblingKeys[0];
    result[key].spans.push(primaryKey);

    if (!result[primaryKey]) {
      result[primaryKey] = makeSpan(spans[primaryKey]);
    }

    // Merge duplicate siblings into the primary sibling
    for (let i = 1; i < siblingKeys.length; i++) {
      const siblingKey = siblingKeys[i];
      const sibling = makeSpan({
        ...spans[siblingKey],
        spans: getChildrenAfterSkip(siblingKey, spans, skipSpanTypes),
      });
      if (!sibling) {
        console.error(
          `Sibling span with key ${siblingKey} not found in spans during tree shortening`,
        );
        continue;
      }
      result[primaryKey] = mergeSpan({
        type: result[primaryKey].type,
        newSpan: sibling,
        existingSpan: result[primaryKey],
      });
    }
  }
  //process below layers
  for (const childkey of result[key].spans) {
    mergeChildTwins(childkey, result, spans, skipSpanTypes);
  }
}

function shortenTree(spans: Record<string, Span>, skipTypes: SpanType[]): Record<string, Span> {
  const result: Record<string, Span> = {};
  const rootResSpan = makeSpan({
    ...spans[rootSpanKey],
    spans: getChildrenAfterSkip(rootSpanKey, spans, skipTypes),
  });
  result[rootSpanKey] = rootResSpan;
  mergeChildTwins(rootSpanKey, result, spans, skipTypes);
  // return result;
  return spans;
}
export function genSpanTableData<T>({
  spanKey,
  globalArgs,
}: {
  spanKey: string;
  globalArgs: {
    createExtra: () => T;
    cur: ResDataInfo<T>;
    prev: null | ResDataInfo<T>;
  };
}): ESpanTableData<T>[] {
  const children: ESpanTableData<T>[] = [];
  const { spans } = globalArgs.cur;
  const span = spans[spanKey];
  if (!span) {
    console.error(`Span with key ${spanKey} not found in spans`);
    return [];
  }

  for (const subSpanId of span.spans) {
    children.push(...genSpanTableData({ spanKey: subSpanId, globalArgs }));
  }

  const totalLatencyContributionMs = makeChange(
    span.totalMs,
    globalArgs.prev?.spans[spanKey]?.totalMs,
  );
  const totalCount = makeChange(span.count, globalArgs.prev?.spans[spanKey]?.count);
  const avgLatencyContributionMs = makeChange(
    safeDivide(totalLatencyContributionMs.cur, totalCount.cur),
    globalArgs.prev ? safeDivide(totalLatencyContributionMs.prev, totalCount.prev) : null,
  );
  const totalErrorCount = makeChange(0, 0);
  const snippet = span.snippet;
  const errors = null;

  return [
    makeESpanTableData({
      extra: globalArgs.createExtra(),
      span,
      totalLatencyContributionMs,
      avgLatencyContributionMs,
      totalCount,
      snippet,
      errors,
      totalErrorCount,
      nested: children,
    }),
  ];
}

export function makeRecording<T>(partial: Partial<Recording<T>> & { extra: T }): Recording<T> {
  return {
    id: new Date().getTime().toString(),
    responseDatas: {},
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
      main.liveRequests += other.liveRequests;
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

  getSpanError(_span: Span, _responseDatas: ResponseData[]) {
    return '';
  },

  getSpanTableData<T>(
    responseDatas: ResponseData[],
    skipSpanTypes: SpanType[],
    createExtra: () => T,
    prevResponseDatas?: ResponseData[],
  ): ESpanTableData<T>[] {
    const curSpans = getMergedSpans(responseDatas);
    if (!curSpans[rootSpanKey]) {
      return [];
    }

    const cur = {
      spans: shortenTree(curSpans, skipSpanTypes),
      totalLatency: getTotalLatency(responseDatas),
      totalRequests: getTotalRequests(responseDatas),
    };

    const prev = prevResponseDatas
      ? {
          spans: shortenTree(getMergedSpans(prevResponseDatas), skipSpanTypes),
          totalLatency: getTotalLatency(prevResponseDatas),
          totalRequests: getTotalRequests(prevResponseDatas),
        }
      : null;

    const spanTableData = genSpanTableData({
      spanKey: rootSpanKey,
      globalArgs: { createExtra, cur, prev },
    });
    return spanTableData;
  },

  getMaxSpanLatencyMs(responseDatas: ResponseData[]) {
    let max = 0;
    const spans = getMergedSpans(responseDatas);
    for (const span of Object.values(spans)) {
      max = Math.max(max, span.totalMs);
    }
    return max;
  },

  getChangeType(
    change: Change,
    options: { judge: 'more-is-better' | 'less-is-better' | 'far-is-worse' } & (
      | { thresPercent: number }
      | { thresChange: number }
    ),
  ) {
    let changeType: ChangeType = 'neutral';
    const idealDirection =
      change.hasPrev &&
      (options.judge === 'less-is-better' || options.judge === 'more-is-better') &&
      ((change.change > 0 && options.judge === 'more-is-better') ||
        (change.change < 0 && options.judge === 'less-is-better'));

    const crossesThres =
      ('thresPercent' in options &&
        change.hasPrev &&
        Math.abs(change.changePercent) > options.thresPercent) ||
      ('thresChange' in options && change.hasPrev && Math.abs(change.change) > options.thresChange);

    if (crossesThres) {
      changeType = idealDirection ? 'better' : 'worse';
    }

    // if (options.judge == 'near-is-better') {
    //   changeType = 'neutral';
    // }

    let sign = '';
    if (change.hasPrev) {
      sign = change.change >= 0 ? '+' : '-';
    }

    type arrowKey = 'more' | 'neutral' | 'less';
    const vertArrows: Record<arrowKey, string> = {
      more: '↑',
      neutral: '~',
      less: '↓',
    };

    const vertFatArrows: Record<arrowKey, string> = {
      more: '▲',
      neutral: '~',
      less: '▼',
    };
    const horizArrows: Record<arrowKey, string> = {
      more: '→',
      less: '←',
      neutral: '~',
    };

    const horizFatArrows: Record<arrowKey, string> = {
      more: '▶',
      less: '◀',
      neutral: '~',
    };

    let key: arrowKey = 'neutral';
    if (change.hasPrev && change.change > 0) {
      key = 'more';
    } else if (change.hasPrev && change.change < 0) {
      key = 'less';
    }
    const horzArrow = horizArrows[key];
    const vertArrow = vertArrows[key];

    const vertFatArrow = vertFatArrows[key];
    const horizFatArrow = horizFatArrows[key];

    return {
      change,
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
      totalRequests: getTotalRequests(Object.values(recording.responseDatas)),
    };
  },
};
