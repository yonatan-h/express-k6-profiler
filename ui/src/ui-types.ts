export interface RecordingExtra {
  liveRequests: number[];
}

type StageType = 'idle' | 'start-capture' | 'run-k6' | 'view-results';
export const typeList: StageType[] = ['idle', 'start-capture', 'run-k6', 'view-results'];