import type { NextFunction, Request, Response, RequestHandler, Application, Router } from 'express';
import { SpanType } from '../../shared/types';
import { markEnd, markStart } from '../async-storage';
import { wrapHandler } from './wrap-handler';
import { log } from '../utils';

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

export function wrapRouter(router: Router) {
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
        });
      }
    } else if (Array.isArray((layer.handle as Router).stack)) {
      wrapRouter(layer.handle as Router);
      // log("🚀 ~ wrapRouter ~ layer:", prefixPath, layer)
    } else if (typeof layer.handle === 'function') {
      //is a middleware, put as app.use probably
      const error = new Error();
      layer.handle = wrapHandler(layer.handle, {
        spanType: 'middleware',
        index: 0,
        handler: layer.handle,
      });
    }
  }
}
