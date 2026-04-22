import { AsyncLocalStorage } from "async_hooks";
import { SpanCode, SpanType } from "../shared-types";

export interface StorageEntry {
  code: string | null;
  startMs: number;
  endMs: number;
  evalCodeSnippet: string;
  displayName: string;
  errorCode?: string;
  errorMessage: string;
  spanType: SpanType;
  file: SpanCode['file'];
}

export const storage = new AsyncLocalStorage<{
  entries: StorageEntry[];
}>();