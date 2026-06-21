import type { ChangeType } from '../../shared/types';

export interface RecordingExtra {
  liveRequests: number[];
  userHasSaved: boolean;
  isAmbient: boolean;
}

export interface ESpanTableDataExtra {
}

export type StageType = 'idle' | 'listening' | 'running-k6' | 'saving' | 'view-results';
export const typeList: StageType[] = ['idle', 'listening', 'running-k6', 'saving', 'view-results'];

export interface DebugError {
  backendId: string;
  message: string;
  trace: string;
  count: number;
  firstTimestampMs: number;
  lastTimestampMs: number;
}
