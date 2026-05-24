const Methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'] as const;
export type Method = null | (typeof Methods)[number];
export type SpanType =
  | 'middleware'
  | 'db'
  | 'route'
  | 'endpoint'
  | 'promise-all'
  | 'root'
  | 'console-log';
interface BaseSpan {
  type: SpanType;
  spanCodeId: string;
  totalMs: number;
  count: number;
  spans: string[];
}

export const rootSpanKey = '<root-key>';

export interface RootSpan extends BaseSpan {
  type: 'root';
}

export interface MiddlewareSpan extends BaseSpan {
  type: 'middleware';
}

export interface PromiseAllSpan extends BaseSpan {
  type: 'promise-all';
}

export interface DbSpan extends BaseSpan {
  type: 'db';
}

export interface RouteSpan extends BaseSpan {
  type: 'route';
}

export interface EndpointSpan extends BaseSpan {
  type: 'endpoint';
  method: Method;
  path: string;
  errors: { [code: string]: { count: number; message: string } };
}

export interface ConsoleLogSpan extends BaseSpan {
  type: 'console-log';
}

export type Span =
  | MiddlewareSpan
  | PromiseAllSpan
  | DbSpan
  | RouteSpan
  | EndpointSpan
  | RootSpan
  | ConsoleLogSpan;

export interface SpanCode {
  type: SpanType;
  snippet: string;
  filePath: string;
  line: number;
  col: number;
}

export interface Status {
  cpuPercent: number;
  liveRequests: number;
  memoryGB: number;
  totalMemoryGB: number;
}

//span tree roughly expected to have
//root
// -> endpoint
//    -> route
//    -> middlewares
//         -> console.log
//         -> JSON.parse
//         -> JSON.stringify
//         -> User.find
//         -> fetch
//         -> Promise.all
//             -> tree below handlers ...
export interface ResponseData {
  backendId: string;
  isProductionMode: boolean;

  status: {
    current: Status;
    peak: Status;
  };

  spans: Record<string, Span>;
  spanCodes: Record<string, SpanCode>;

  debug: {
    errors: { message: string; trace: string }[];
  };
}

export type Change =
  | {
      hasPrev: true;
      cur: number;
      prev: number;
      change: number;
      changePercent: number;
    }
  | {
      hasPrev: false;
      cur: number;
      prev: null;
      change: null;
      changePercent: null;
    };

//--extracted data types --//
export interface ESpanTableData<T> {
  extra: T;
  span: Span;
  avgLatencyContributionMs: Change;
  totalLatencyContributionMs: Change;
  totalCount: Change;
  totalErrorCount: Change;
  errors: null;
  nested: ESpanTableData<T>[];
}

export interface Recording<T> {
  extra: T;
  responseDatas: ResponseData[];
  title: string;
  startTimeMs: number;
  endTimeMs: number | null;
}

export interface Duration {
  hours: number;
  minutes: number;
  seconds: number;
  hoursStr: string;
  minutesStr: string;
  secondsStr: string;
  days: number;
  daysStr: string;
}

export type ChangeType = 'better' | 'worse' | 'almost-same' | 'new' ;
