export interface RecordingExtra {
  liveRequests: number[];
  userHasSaved:boolean;
}

export type StageType = 'idle' | 'listening' | 'running-k6' | 'saving' | 'view-results';
export const typeList: StageType[] = ['idle', 'listening', 'running-k6', 'saving', 'view-results'];
