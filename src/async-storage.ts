import { AsyncLocalStorage } from 'async_hooks';
import { makeSpan, mergeSpan } from '../shared/big-utils';
import { MiddlewareSpan, rootSpanKey, RouteSpan, Span, SpanType } from '../shared/types';
import { addError } from './measurement';
import { log } from './utils';

export interface SpanStore {
  rawSpans: Record<number, Span & { childIds: number[] }>;
  nextId: number;
  stack: {
    id: number;
    span: Span;
    startMs: number;
    childIds: number[];
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
  partialSpan: Partial<Span> & { type: SpanType },
  {
    expectSpanContext = false,
    isUserLevel = true,
  }: { expectSpanContext?: boolean; isUserLevel?: boolean } = {},
): number {
  if (!isUserLevel) return -1;
  try {
    const s = getStore();
    const id = s.nextId++;
    const span = makeSpan({ ...partialSpan });
    s.stack.push({ id, span, startMs: Date.now(), childIds: [] });
    return id;
  } catch (e) {
    const skip = (e as Error)?.message === NO_SPAN_CONTEXT && !expectSpanContext;
    if (!skip) {
      addError(e as Error);
    }
    return -1;
  }
}

export function markEnd(
  id: number,
  partialSpan: Partial<Span>,
  {
    expectSpanContext = false,
    forceCollapse = false,
  }: { expectSpanContext?: boolean; forceCollapse?: boolean; hasReturned?: boolean } = {},
) {
  if (id === -1) {
    return;
  }
  try {
    const s = getStore();

    const frameIndex = s.stack.findIndex((f) => f.id === id);
    if (frameIndex === -1) {
      return addError(
        new Error(`Id ${id} not found on stack for ${partialSpan?.snippet || '<unknown-span>'}`),
      );
    }

    if (!forceCollapse && frameIndex !== s.stack.length - 1) {
      const { span } = s.stack[frameIndex]!;
      return addError(
        new Error(
          `Id ${id} out of sync for ${span.snippet} (${span.type}). Storage Stack:\n${s.stack.map((s) => s.span.type).join('\n')}`,
        ),
      );
    }

    if (frameIndex < 0) {
      return addError(
        new Error(`Frame index < 0, s.stack: ${s.stack.map((s) => s.span.type).join('\n')}`),
      );
    }

    while (s.stack.length > frameIndex) {
      const { id: currentId, span, startMs, childIds } = s.stack.pop()!;
      const hasParent = s.stack.length > 0;
      const poppedTarget = frameIndex === s.stack.length;

      span.totalMs = Date.now() - startMs;
      span.count = 1;

      if (poppedTarget) {
        //merge info captured at start and end
        mergeSpan({ type: span.type, newSpan: partialSpan, existingSpan: span });
      }
      //the entry is always new because of unique ids. no need to merge
      s.rawSpans[currentId] = { ...span, childIds };

      if (hasParent) {
        s.stack[s.stack.length - 1].childIds.push(currentId);
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

function compileTree(
  currentId: number,
  parentKeyPath: string,
  s: SpanStore,
  finalSpans: Record<string, Span>,
): string {
  const rawSpan = s.rawSpans[currentId];
  if (!rawSpan) {
    addError(new Error(`raw span with key=${currentId}} not found`));
    return '';
  }

  const myKey = rawSpan.type === 'root' ? rootSpanKey : `${parentKeyPath}:${rawSpan.snippet}`;

  const childStringKeys = rawSpan.childIds
    .map((childId) => compileTree(childId, myKey, s, finalSpans))
    .filter(Boolean);

  rawSpan.spans = Array.from(new Set(childStringKeys));

  finalSpans[myKey] = mergeSpan({
    type: rawSpan.type,
    newSpan: rawSpan,
    existingSpan: finalSpans[myKey],
  });

  return myKey;
}

export function getStoredData(errorIfNotEnded = true): { spans: Record<string, Span> } | null {
  try {
    const s = getStore();
    if (errorIfNotEnded && s.stack.length) {
      addError(new Error('Some spans were not ended' + JSON.stringify(s.stack)));
      return null;
    }

    const finalSpans: Record<string, Span> = {};

    if (s.rawSpans[0]) {
      compileTree(0, '', s, finalSpans);
    } else {
      addError(new Error(`span tree has no root ${JSON.stringify(s.rawSpans)}`));
    }

    return { spans: finalSpans };
  } catch (e) {
    addError(e as Error);
    return null;
  }
}

export function runWithStorageContext(fn: () => void) {
  asyncStorage.run({ rawSpans: {}, nextId: 0, stack: [] }, fn);
}
