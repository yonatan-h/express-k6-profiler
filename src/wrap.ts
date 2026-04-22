import { AsyncLocalStorage } from 'async_hooks';
import { getMeasurements, resetMeasurements } from './measurement';
import path from 'path';
import fs from 'fs/promises';
import type { NextFunction, Request, Response, RequestHandler, Application, Router } from 'express';
import { Span, SpanCode, SpanType } from '../shared-types';
import { ILayer } from 'express-serve-static-core';
import { storage } from './async-storage';

const Methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'] as const;
export type Method = null | (typeof Methods)[number];

type HandlerInfo = {
  spanType: SpanType;
  index: number;
  handler: RequestHandler;
  file: SpanCode['file'];
};

const isOk = (code: number) => code < 400;


const measureHandler = (
  begin: number,
  res: Response,
  resArgs: unknown[],
  nextArgs: unknown[],
  hasEnded: [boolean],
  { handler, spanType, index, file }: HandlerInfo,
) => {
  if (hasEnded[0]) {
    console.error('has ended 2X');
    return;
  }
  const store = storage.getStore();
  if (!store) {
    console.error('storage not found');
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

  store.entries.push({
    code: null,
    startMs: begin,
    endMs: Date.now(),
    evalCodeSnippet: evalCodeSnippet,
    displayName,
    errorCode,
    errorMessage,
    spanType,
    file: file,
  });
};

function wrapHandler(handler: RequestHandler, hInfo: HandlerInfo): RequestHandler {
  let hasEnded: [boolean] = [false];

  const wrapper: RequestHandler = (...args: any[]) => {
    let err: any, req: Request, res: Response, next: NextFunction, otherArgs: any[];

    if (args.length === 4) [err, req, res, next, ...otherArgs] = args;
    else [req, res, next, ...otherArgs] = args;

    const begin = Date.now();

    const oldResJson = res.json.bind(res);
    res.json = (...args: any[]) => {
      measureHandler(begin, res, args, [], hasEnded, hInfo);
      return oldResJson(...args);
    };

    const oldResSend = res.send.bind(res);
    res.send = (...args: any[]) => {
      measureHandler(begin, res, args, [], hasEnded, hInfo);
      return oldResSend(...args);
    };

    const newNext = (...nextArgs: any[]) => {
      measureHandler(begin, res, [], nextArgs, hasEnded, hInfo);
      return next(...nextArgs);
    };
    if (args.length === 4) args[3] = newNext;
    else args[2] = newNext;

    return (handler as any)(...args);
  };

  return wrapper;
}

/**
 * Reference data structure
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

export function wrapRouter(router: Router, currentPath: string) {
  for (const layer of router.stack) {
    if (layer.route) {
      //is a get/post/middleware + route
      const stack = layer.route.stack;

      if (!layer.route?.path === undefined) {
        console.error('layer.route.path is not defined');
      }

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
        innerLayer.handle = wrapHandler(innerLayer.handle, {
          spanType,
          index: i,
          handler,
          file: null,
        });
      }
    } else if (layer.name === 'router' && Array.isArray((layer.handle as any).stack)) {
      //not sure if is a reliable indicator of routers
      wrapRouter(layer.handle as Router, currentPath + (layer.path || ''));
    } else if (typeof layer.handle === 'function') {
      //is a middleware
      layer.handle = wrapHandler(layer.handle, {
        spanType: 'middleware',
        index: 0,
        handler: layer.handle,
        file: null,
      });
    }
  }
}
