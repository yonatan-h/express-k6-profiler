//biggest source of truth
export interface Span {
  codeId: string;

  equivCodeSnippet: string;
  totalMs: number;
  count: number;
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

export interface HandlerData {
  span: Span;
  concDbCalls: Record<string, Record<string, Span>>;
}
export interface ResponseData {
  backendId: string;

  currentInfo: {
    cpuPercent: number;
    liveRequests: number;
    memoryGB: number;
    totalMemoryGB: number;
  };

  spanCodes: Record<string, SpanCode>;

  endpoints: Record<
    string,
    {
      span: Span;
      middleWares: Record<string, HandlerData>;
      routeHandler: HandlerData;
    }
  >;
}
