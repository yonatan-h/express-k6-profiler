import { AsyncLocalStorage } from 'async_hooks';
import { makeSpan, mergeSpan } from '../shared/big-utils';
import { MiddlewareSpan, rootSpanKey, RouteSpan, Span, SpanType } from '../shared/types';
import { addError } from './measurement';
import { log } from './utils';

export interface SpanStore {
  returnedSpanKey: string | null;
  spans: Record<string, Span>;
  stack: {
    span: Span;
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

function genSpanKey(stack: SpanStore['stack'], span: Span): string {
  return span.type === 'root'
    ? rootSpanKey
    : `${stack.map((s) =>  s.span.snippet).join(':')}:${span.snippet}`;
}

function printStack(stack: SpanStore['stack']) {
  return;
  log(stack.map((s) => s.span.snippet).join('>'));
  log('------------');
}

//most info is filled out
export function markStart(
  partialSpan: Partial<Span> & { type: SpanType },
  {
    expectSpanContext = false,
    isUserLevel = true,
  }: { expectSpanContext?: boolean; isUserLevel?: boolean } = {},
): number {
  if (!isUserLevel) return -1;
  try {
    const s = getStore();
    printStack(s.stack);
    const span = makeSpan({ ...partialSpan });
    s.stack.push({ span, startMs: Date.now() });
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
  {
    expectSpanContext = false,
    forceCollapse = false,
    hasReturned = false,
  }: { expectSpanContext?: boolean; forceCollapse?: boolean; hasReturned?: boolean } = {},
) {
  if (index === -1) {
    return;
  }
  try {
    const s = getStore();
    printStack(s.stack);
    if (index >= s.stack.length) {
      return addError(
        new Error(`Index ${index} too big for ${partialSpan?.snippet || '<unknown-span>'}`),
      );
    }

    if (!forceCollapse && index !== s.stack.length - 1) {
      const { span } = s.stack[index]!;
      return addError(
        new Error(
          `Index ${index} out of sync for ${span.snippet} (${span.type}). Storage Stack:\n${s.stack.map((s) => s.span.type).join('\n')}`,
        ),
      );
    }

    if (hasReturned) {
      if (s.returnedSpanKey) {
        addError(new Error(`Returned span key already set to ${s.returnedSpanKey}`));
      } else {
        s.returnedSpanKey = genSpanKey(s.stack.slice(0, index), s.stack[index].span);
      }
    }

    //incase of force collapsing or normal collapsing
    while (s.stack.length > index) {
      let { span, startMs } = s.stack.pop()!;

      if (s.stack.length === index) {
        span = mergeSpan({ type: span.type, newSpan: partialSpan, existingSpan: span });
      }

      const spanKey = genSpanKey(s.stack, span);

      span.totalMs = Date.now() - startMs;
      span.count = 1;

      s.spans[spanKey] = mergeSpan({
        type: span.type,
        newSpan: span,
        existingSpan: s.spans[spanKey],
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

export function getStoredData(
  errorIfNotEnded = true,
): { spans: Record<string, Span>; returnedSpan: null | MiddlewareSpan | RouteSpan } | null {
  try {
    const s = getStore();
    if (errorIfNotEnded && s.stack.length) {
      addError(new Error('Some spans were not ended' + JSON.stringify(s.stack)));
      return null;
    }

    let returnedSpan: MiddlewareSpan | RouteSpan | null = null;
    if (s.returnedSpanKey) {
      const span = s.spans[s.returnedSpanKey];
      if (!span) {
        addError(
          new Error(
            `Returned span key ${s.returnedSpanKey} not found in spans ` + JSON.stringify(s.spans),
          ),
        );
      } else if (span.type !== 'middleware' && span.type !== 'route') {
        addError(new Error('Returned span type ' + span.type + ' is not middleware or route'));
        return null;
      } else {
        returnedSpan = span;
      }
    }

    return { ...s, returnedSpan };
  } catch (e) {
    addError(e as Error);
    return null;
  }
}

export function runWithStorageContext(fn: () => void) {
  asyncStorage.run({ spans: {}, stack: [], returnedSpanKey: null }, fn);
}
