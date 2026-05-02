import type { NextFunction, Request, Response, RequestHandler, Application, Router } from 'express';
import { SpanType } from '../shared/types';
import { markEnd, markStart } from './async-storage';

type HandlerInfo = {
  spanType: SpanType;
  index: number;
  handler: RequestHandler;
  subPath: string;
};

const onEnd = (markIndex: number, hasEnded: [boolean]) => {
  if (hasEnded[0]) return;
  hasEnded[0] = true;
  markEnd(markIndex, {}, {});
};

function wrapHandler(handler: RequestHandler, hInfo: HandlerInfo): RequestHandler {
  if ((handler as unknown as { __kraySkipWrap?: boolean }).__kraySkipWrap) {
    return handler;
  }

  const newHandler: RequestHandler = (...args: any[]) => {
    let err: any, req: Request, res: Response, next: NextFunction, otherArgs: any[];

    if (args.length === 4) [err, req, res, next, ...otherArgs] = args;
    else [req, res, next, ...otherArgs] = args;

    let markIndex: number;
    const hasEnded: [boolean] = [false];

    const oldResJson = res.json.bind(res);
    //TODO: results in super nested .json methods
    res.json = (...args: any[]) => {
      onEnd(markIndex, hasEnded);
      return oldResJson(...args);
    };

    //TODO: results in super nested .send methods
    const oldResSend = res.send.bind(res);
    res.send = (...args: any[]) => {
      onEnd(markIndex, hasEnded);
      return oldResSend(...args);
    };

    const newNext = (...nextArgs: any[]) => {
      onEnd(markIndex, hasEnded);
      return next(...nextArgs);
    };

    if (args.length === 4) args[3] = newNext;
    else args[2] = newNext;

    const snippet = hInfo.handler.name || `${hInfo.spanType}-${hInfo.index + 1}`;
    markIndex = markStart(hInfo.spanType, {}, { snippet });
    return (handler as any)(...args);
  };

  return newHandler;
}

/**
 * Reference data structure of 'router'
 *Layer.route = {
  path: '/users',
  stack: [
    Layer { 
      method: "get", 
      handle: authMw // The first middleware in an app.get() array
    },
    Layer { 
      method: "get", 
      handle: userController // The final handler in an app.get() array
    }
  ],
  methods: { get: true }
}/
*/

export function wrapRouter(router: Router, prefixPath: string) {
  for (const layer of router.stack) {
    //says router.stack is not iterable
    if (layer.route) {
      const stack = layer.route.stack; //is  ...[middleware, route-handler]

      for (let i = 0; i < layer.route.stack.length; i++) {
        const innerLayer = layer.route.stack[i];
        const handler = innerLayer.handle;

        const isLast = i === stack.length - 1;
        const isBeforeLast = i === stack.length - 2;
        let spanType: SpanType;

        if (handler.length === 4) {
          spanType = 'middleware'; //TODO: may need to be error-middleware
        } else if (isLast) {
          spanType = 'route';
        } else if (isBeforeLast && layer.route.stack[i + 1]?.handle?.length === 4) {
          spanType = 'route';
        } else {
          spanType = 'middleware';
        }
        innerLayer.handle = wrapHandler(handler, {
          spanType,
          index: i,
          handler,
          subPath: layer.route.path,
        });
      }
    } else if (Array.isArray((layer.handle as Router).stack)) {
      wrapRouter(layer.handle as Router, prefixPath + layer.path);
    } else if (typeof layer.handle === 'function') {
      //is a middleware, put as app.use probably
      layer.handle = wrapHandler(layer.handle, {
        spanType: 'middleware',
        index: 0,
        handler: layer.handle,
        subPath: prefixPath,
      });
    }
  }
}
