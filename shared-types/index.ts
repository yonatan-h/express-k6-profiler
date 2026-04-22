//biggest source of truth
export interface Span {
  codeId: string;

  equivCodeSnippet: string;
  totalMs: number;
  count: number;
  hasConcurrentChildren: boolean;
  childrenKeys: string[];
}

export type SpanType = 'middleware' | 'db' | 'route-handler' | 'endpoint' | 'concurrent';

export interface SpanCode {
  type: SpanType;
  equivCodeSnippet: string;
  displayName: string;
  file: null | {
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
    liveRequests: number;
    memoryGB: number;
    totalMemoryGB: number;
  };

  spanCodes: { [globalId: string]: SpanCode };
  spans: { [key: string]: Span };
  unhandledEndpoint: Span;
}
