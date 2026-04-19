//frontend visualization changes start here

export interface ChartCode {
  filePath: string;
  lineNumber: number;
  content: string;
}
export interface ChartSpan {
  name: string;
  type: 'middleware' | 'db' | 'concurrent-db' | 'other';
  hidden: boolean;
  avgMs: number;
  code: ChartCode | null;
  codeId: string;
}

export interface LatenyContributors {
  codeId: string;
  hidden: boolean;
  code: ChartCode | null;
  subContributors: LatenyContributors[];
}
export interface ChartData {
  requestAtMoments: { timeMs: number; currentRequests: number }[];
  currentInfos: {
    requestsAtMoment: number;
    backendId: string;
    cpuPercent: number;
    memoryPercent: number;
    totalMemoryGB: number;    
  }[];

  avgLatencyMs: number;
  prevAvgLatencyMS: number;

  endPoints: {
    totalRequests: number;
    method: string;
    path: string;
    code: ChartCode;
    errors: { [code: string]: { count: number; message: string } };
    subSpans: ChartSpan[];
    prevSubSpans: null | ChartSpan[];
  }[];

  contributors: LatenyContributors[];
}