import { AsyncLocalStorage } from 'async_hooks';
import { getMeasurements, resetMeasurements } from './measurement';
import path from 'path';
import fs from 'fs/promises';
import type { NextFunction, Request, Response, RequestHandler, Application, Router } from 'express';
import { Span, SpanCode, SpanType } from '../shared-types';
import { addEntry, createEntrySlot } from './async-storage';

const Methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'] as const;
export type Method = null | (typeof Methods)[number];

type HandlerInfo = {
  spanType: SpanType;
  index: number;
  handler: RequestHandler;
  file: SpanCode['file'];
  subPath: string;
};

const isOk = (code: number) => code < 400;

const measureHandler = (
  begin: number,
  res: Response,
  resArgs: unknown[],
  nextArgs: unknown[],
  hasEnded: [boolean],
  slotIndex: number,
  { handler, spanType, index, file, subPath }: HandlerInfo,
) => {
  if (hasEnded[0]) {
    return;
  }

  let errorCode = isOk(res.statusCode) ? undefined : res.statusCode.toString();
  let errorMessage = '';
  let evalCodeSnippet = handler.name || `${spanType}-${index + 1}`;
  let displayName = handler.name || `${spanType}-${index + 1}`;

  hasEnded[0] = true;
  if (nextArgs.length > 0) {
    errorMessage = JSON.stringify(nextArgs[0]);
  } else if (errorCode && resArgs.length) {
    errorMessage = JSON.stringify(resArgs[0]);
  }

  // console.log(getSpanCode());

  addEntry(slotIndex, {
    code: null,
    startMs: begin,
    endMs: Date.now(),
    evalCodeSnippet: evalCodeSnippet,
    displayName,
    errorCode,
    errorMessage,
    spanType,
    file,
    subPath,
  });
};

function wrapHandler(handler: RequestHandler, hInfo: HandlerInfo): RequestHandler {
  if ((handler as unknown as { __kraySkipWrap?: boolean }).__kraySkipWrap) {
    return handler;
  }

  const wrapper: RequestHandler = (...args: any[]) => {
    let err: any, req: Request, res: Response, next: NextFunction, otherArgs: any[];

    if (args.length === 4) [err, req, res, next, ...otherArgs] = args;
    else [req, res, next, ...otherArgs] = args;

    const begin = Date.now();
    const hasEnded: [boolean] = [false];
    const slotIndex = createEntrySlot();

    (res as any).__count = 0;

    const oldResJson = res.json.bind(res);
    //TODO: results in super nested .json methods
    res.json = (...args: any[]) => {
      measureHandler(begin, res, args, [], hasEnded, slotIndex, hInfo);
      return oldResJson(...args);
    };

    //TODO: results in super nested .send methods
    const oldResSend = res.send.bind(res);
    res.send = (...args: any[]) => {
      measureHandler(begin, res, args, [], hasEnded, slotIndex, hInfo);
      return oldResSend(...args);
    };

    const newNext = (...nextArgs: any[]) => {
      measureHandler(begin, res, [], nextArgs, hasEnded, slotIndex, hInfo);
      return next(...nextArgs);
    };
    if (args.length === 4) args[3] = newNext;
    else args[2] = newNext;

    return (handler as any)(...args);
  };

  return wrapper;
}

/**
 * Reference data structure of 'router'
 *Layer.route = {
  path: '/users',
  stack: [
    Layer { 
      method: "get", 
      handle: authMw // The first middleware in your app.get() array
    },
    Layer { 
      method: "get", 
      handle: userController // The final handler in your app.get() array
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
        const method: string = innerLayer.method.toLocaleLowerCase();
        const handler = innerLayer.handle;
        if (!Methods.includes(method as any)) {
          console.error('Unknown method:', method);
        }

        const isLast = i === stack.length - 1;
        const isBeforeLast = i === stack.length - 2;
        let spanType: SpanType;

        if (handler.length === 4) {
          spanType = 'middleware'; //TODO: may need to be error-middleware
        } else if (isLast) {
          spanType = 'route-handler';
        } else if (isBeforeLast && layer.route.stack[i + 1]?.handle?.length === 4) {
          spanType = 'route-handler';
        } else {
          spanType = 'middleware';
        }
        innerLayer.handle = wrapHandler(handler, {
          spanType,
          index: i,
          handler,
          file: null,
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
        file: null,
        subPath: prefixPath,
      });
    }
  }
}
