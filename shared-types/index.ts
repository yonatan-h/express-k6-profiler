//biggest source of truth
export interface Span {
  codeId: string | null;

  name: string;
  totalMs: number;
  count: number;
  avgMs: number;

  hasConcurrentChildren: boolean;
  childrenKeys: string[];
}

export interface SpanCode {
  type: 'middleware' | 'db' | 'route-handler' | 'endpoint';
  file: {
    filePath: string;
    lineNumber: number;
    content: string;
  };
  errors: { [code: string]: { count: number; message: string } }; //meant for endpoints only
}

export interface ResponseData {
  backendId: string;

  currentInfo: {
    cpuPercent: number;
    requestsAtMoment: number;
    memoryGB: number;
    totalMemoryGB: number;
  };

  spanCodes: { [globalId: string]: SpanCode };
  spans: { [key: string]: Span };
  unhandledSpan: Span;
}