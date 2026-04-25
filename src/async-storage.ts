import { AsyncLocalStorage } from 'async_hooks';
import { SpanCode, SpanType } from '../shared-types';
import { Method } from './wrap';

export interface StorageEntry {
  code: string | null;
  startMs: number;
  endMs: number;
  evalCodeSnippet: string;
  displayName: string;
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

export function createEntrySlot(): number {
  const s = asyncStorage.getStore();
  if (!s) {
    throw new Error('Storage not found to create empty slot');
  }
  s.entries.push(null);
  return s.entries.length - 1;
}

export function addEntry(index: number, entry: StorageEntry) {
  const s = asyncStorage.getStore();
  if (!s) {
    throw new Error('Storage not found to add entry');
  }
  if (index === -1) {
    console.error('index not found. skipping adding entry');
    return;
  }
  if (s.entries[index]) {
    console.error('entry already exists at index', index);
    return;
  }

  s.entries[index] = entry;
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
