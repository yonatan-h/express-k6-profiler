import { AsyncLocalStorage } from 'async_hooks';
import { Span, SpanCode, SpanType } from '../shared/types';
import { makeSpan, makeSpanCode, mergeSpan, mergeSpanCodes } from '../shared/big-utils';
import { addError } from './measurement';

export interface SpanStore {
  spans: Record<string, Span>;
  spanCodes: Record<string, SpanCode>;
  stack: {
    span: Span;
    spanCode: SpanCode;
    startMs: number;
  }[];
}

const asyncStorage = new AsyncLocalStorage<SpanStore>();

const NO_SPAN_CONTEXT = 'Storage not found';
function getStore(): SpanStore {
  const s = asyncStorage.getStore();
  if (!s) {
    throw new Error(NO_SPAN_CONTEXT);
  }
  return s;
}

//most info is filled out
export function markStart(
  type: SpanType,
  partialSpan: Partial<Span>,
  partialSpanCode: Partial<SpanCode>,
  { expectSpanContext, isUserLevel }: { expectSpanContext?: boolean; isUserLevel?: boolean } = {
    expectSpanContext: false,
    isUserLevel: true,
  },
): number {
  if (!isUserLevel) return -1;
  try {
    const s = getStore();
    const span = makeSpan({ ...partialSpan, type });
    const spanCode = makeSpanCode({ ...partialSpanCode, type });
    s.stack.push({ span, spanCode, startMs: Date.now() });
    return s.stack.length - 1;
  } catch (e) {
    const skip = (e as Error)?.message === NO_SPAN_CONTEXT && !expectSpanContext;
    if (!skip) {
      addError(e as Error);
    }
    return -1;
  }
}

export function markEnd(
  index: number,
  partialSpan: Partial<Span>,
  partialSpanCode: Partial<SpanCode>,
  { expectSpanContext, forceCollapse }: { expectSpanContext?: boolean; forceCollapse?: boolean } = {
    expectSpanContext: false,
    forceCollapse: false,
  },
) {
  if (index === -1) {
    return;
  }
  try {
    const s = getStore();
    if (index >= s.stack.length) {
      return addError(
        new Error(`Index ${index} too big for ${partialSpanCode?.snippet || '<unknown-span>'}`),
      );
    }

    if (!forceCollapse && index !== s.stack.length - 1) {
      const { span, spanCode } = s.stack[index]!;
      return addError(
        new Error(
          `Index ${index} out of sync for ${spanCode.snippet} (${spanCode.type}). Storage Stack:\n${s.stack.map((s) => s.spanCode.type).join('\n')}`,
        ),
      );
    }

    //incase of force collapsing
    while (s.stack.length > index) {
      let { span, spanCode, startMs } = s.stack.pop()!;

      if (s.stack.length - 1 === index) {
        span = mergeSpan({ type: span.type, newSpan: partialSpan, existingSpan: span });
        spanCode = mergeSpanCodes({
          type: spanCode.type,
          newSpanCode: partialSpanCode,
          existingSpanCode: spanCode,
        });
      }

      const spanCodeId = `${spanCode.filePath || '<path>'}-${spanCode.snippet || '<snippet>'}-${spanCode.type}`;
      const spanKey =
        span.type === 'root'
          ? 'root'
          : `${s.stack.map((s) => s.span.type).join('-')}|${spanCodeId}`;

      span.spanCodeId = spanCodeId;
      span.totalMs = Date.now() - startMs;
      span.count = 1;

      s.spans[spanKey] = mergeSpan({
        type: span.type,
        newSpan: span,
        existingSpan: s.spans[spanKey],
      });
      s.spanCodes[spanCodeId] = mergeSpanCodes({
        type: spanCode.type,
        newSpanCode: spanCode,
        existingSpanCode: s.spanCodes[spanCodeId],
      });

      if (s.stack.length > 0) {
        s.stack[s.stack.length - 1].span.spans.push(spanKey);
      }
    }
  } catch (e) {
    const skip = (e as Error)?.message === NO_SPAN_CONTEXT && !expectSpanContext;
    if (!skip) {
      addError(e as Error);
    }
    return;
  }
}

export function getStoredData(errorIfNotEnded = true): SpanStore | null {
  try {
    const s = getStore();
    if (errorIfNotEnded && s.stack.length) {
      addError(new Error('Some spans were not ended'));
      return null;
    }
    return s;
  } catch (e) {
    addError(e as Error);
    return null;
  }
}

export function runWithStorageContext(fn: () => void) {
  asyncStorage.run({ spans: {}, spanCodes: {}, stack: [] }, fn);
}
