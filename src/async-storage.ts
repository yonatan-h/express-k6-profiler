import { AsyncLocalStorage } from 'async_hooks';
import { SpanCode, SpanType } from '../shared-types';
import { Method } from './wrap';

export interface StorageEntry {
  startMs: number;
  endMs: number;
  evalCodeSnippet: string;
  errorCode?: string;
  errorMessage: string;
  spanType: SpanType;
  subPath: string;
  file: SpanCode['file'];
}

export interface AsyncStorage {
  entries: (StorageEntry | null)[];
}

const asyncStorage = new AsyncLocalStorage<AsyncStorage>();

export function addEntry(entry: StorageEntry) {
  const s = asyncStorage.getStore();
  if (!s) {
    throw new Error('Storage not found to add entry');
  }

  s.entries.push(entry);
}

export function getEntries(): StorageEntry[] {
  const s = asyncStorage.getStore();
  if (!s) {
    throw new Error('Storage not found to get entries');
  }
  return s.entries.filter((e) => e !== null) as StorageEntry[];
}

export function runWithStorage(fn: () => void) {
  asyncStorage.run({ entries: [] }, fn);
}
