//frontend visualization changes start here
export interface ChartCode {
  filePath: string;
  lineNumber: number;
  content: string;
}

export type ChartSpanType = 'middleware' | 'db' | 'concurrent-db' | 'route-handler' | 'other';
export interface ChartSpan {
  codeId: string;
  name: string;
  type: ChartSpanType;
  avgMs: number;
  totalLatencyMs: number;
  count: number;
}

export interface LatenyContributor {
  codeId: string;
  name: string;

  avgMs: number;
  type: ChartSpanType;
  totalLatencyMs: number;
  count: number;

  code: ChartCode | null;
  subContributors: LatenyContributor[];
}

export interface ChartEndpoint {
  totalRequests: number;
  totalMs: number;
  lantencyContribution: number;
  method: string;
  path: string;
  errors: { [code: string]: { count: number; message: string } };
  spans: ChartSpan[];
}
export interface ChartData {
  currentInfos: {
    [backendId: string]: {
      backendId: string;
      requestsAtMoment: number;
      cpuPercent: number;
      memoryPercent: number;
      totalMemoryGB: number;
    };
  };

  totalLatency: number;
  totalRequests: number;
  latency: number;

  prevTotalLatency: number;
  prevTotalRequests: number;
  prevLatency: number;

  endPoints: {
    hidden: boolean;
    current: ChartEndpoint | null;
    prev: ChartEndpoint | null;
  }[];

  contributors: { hidden: boolean; current: LatenyContributor; prev: LatenyContributor | null }[];
}
