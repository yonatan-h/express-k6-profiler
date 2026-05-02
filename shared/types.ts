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
  line:number;
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

  currentInfo: {
    cpuPercent: number;
    liveRequests: number;
    memoryGB: number;
    totalMemoryGB: number;
    isProductionMode: boolean;
  };

  spans: Record<string, Span>;
  spanCodes: Record<string, SpanCode>;

  debug: {
    errors: { message: string; trace: string }[];
  };
}
