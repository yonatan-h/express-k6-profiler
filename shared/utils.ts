import { EndpointSpan, Span, SpanCode, SpanType } from './types';

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
  b: number,
  { toPercent = false, abs = false }: { toPercent?: boolean; abs?: boolean } = {},
) {
  let ans = 0;
  a = a ?? 0;
  b = b ?? 1;

  ans = a / b;
  if (toPercent) {
    ans = Math.round(ans * 100);
  }
  if (abs) {
    ans = Math.abs(ans);
  }
  return ans;
}
