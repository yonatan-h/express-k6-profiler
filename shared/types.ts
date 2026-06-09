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
export interface BaseSpan {
  type: SpanType;
  totalMs: number;
  count: number;
  spans: string[];

  snippet: string;
  code: string; //is best effort code
  filePath?: string;
  line?: number;
  col?: number;

  errors: { count: number; samples: string[] };
}

export const rootSpanKey = 'root-key';

export interface RootSpan extends BaseSpan {
  type: 'root';
}

export interface MiddlewareSpan extends BaseSpan {
  type: 'middleware';
  path: string;
}

export interface PromiseAllSpan extends BaseSpan {
  type: 'promise-all';
}

export interface DbSpan extends BaseSpan {
  type: 'db';
}

export interface RouteSpan extends BaseSpan {
  type: 'route';
  method: Method;
  path: string;
}

export interface EndpointSpan extends BaseSpan {
  type: 'endpoint';
  method: Method;
  path: string;
}

export interface ConsoleLogSpan extends BaseSpan {
  type: 'console-log';
}

export type Span =
  | MiddlewareSpan
  | PromiseAllSpan
  | DbSpan
  | RouteSpan
  | RootSpan
  | ConsoleLogSpan
  | EndpointSpan;

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
  spanKey:string;
  span: Span;
  snippet: string;
  avgLatencyContributionMs: Change;
  totalLatencyContributionMs: Change;
  totalCount: Change;
  totalErrorCount: Change;
  errors: null;
  nested: ESpanTableData<T>[];
  depth:number;
}

export interface Recording<T> {
  id: string;
  extra: T;
  responseDatas: Record<string, ResponseData>;
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

export type ChangeType = 'better' | 'worse' | 'neutral' | 'new';
