import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { makeSpanError } from '../../shared/big-utils';
import { Span, SpanType } from '../../shared/types';
import { markEnd, markStart } from '../async-storage';
import { isWrapped, skipWrapping, stampAsWrapped } from '../utils';
import { addError } from '../measurement';

type HandlerInfo = {
  spanType: SpanType;
  index: number;
  handler: RequestHandler;
  subPath: string;
};

const onEnd = (markIndex: number, hasEnded: [boolean], error: any | null, hasReturned:boolean) => {
  if (hasEnded[0]) return;
  hasEnded[0] = true;

  let errors: undefined | Span['errors'] = undefined;
  if (error) {
    errors = makeSpanError(error.message || String(error));
  }

  markEnd(markIndex, { errors }, { expectSpanContext: true, hasReturned });
};

const extractError = (res: Response, resArgs: any[]): Error | null => {
  if (res.statusCode >= 400) {
    const body = resArgs[0];
    const bodyContent: string = JSON.stringify(body);
    const statusMsg = res.statusMessage || '';
    let errorMessage = `${res.statusCode}${statusMsg ? '-' + statusMsg : ''}${bodyContent ? ': ' + bodyContent : ''}`;
    return new Error(errorMessage);
  }
  return null;
};

const originalJsonMap = new WeakMap<Response, Function>();
const originalSendMap = new WeakMap<Response, Function>();

export function wrapHandler(handler: RequestHandler, hInfo: HandlerInfo): RequestHandler {
  if (skipWrapping(handler) || isWrapped(handler)) {
    return handler;
  }
  stampAsWrapped(handler);

  const newHandler: RequestHandler = (...args: any[]) => {
    let err: any, req: Request, res: Response, next: NextFunction, otherArgs: any[];

    if (args.length === 4) [err, req, res, next, ...otherArgs] = args;
    else [req, res, next, ...otherArgs] = args;
    
    const passesTypeCheck = res && typeof res.json === 'function' && typeof res.send === 'function'&&typeof next === 'function';
    if (!passesTypeCheck){
      return (handler as any)(...args);
    }

    let markIndex: number;
    const hasEnded: [boolean] = [false];

    if (!originalJsonMap.has(res)) {
      originalJsonMap.set(res, res.json.bind(res));
    }
    res.json = (...jsonArgs: any[]) => {
      onEnd(markIndex, hasEnded, extractError(res, jsonArgs), true);
      return originalJsonMap.get(res)!(...jsonArgs);
    };

    if (!originalSendMap.has(res)) {
      originalSendMap.set(res, res.send.bind(res));
    }
    res.send = (...sendArgs: any[]) => {
      onEnd(markIndex, hasEnded, extractError(res, sendArgs), true);
      return originalSendMap.get(res)!(...sendArgs);
    };

    const newNext = (...nextArgs: any[]) => {
      onEnd(markIndex, hasEnded, extractError(res, nextArgs), false);
      return next(...nextArgs);
    };

    if (args.length === 4) args[3] = newNext;
    else args[2] = newNext;

    let snippet = hInfo.handler.name;
    if (hInfo.spanType === 'route') {
      snippet = `${req.method}:${hInfo.subPath}`;
    } else {
      snippet = `${hInfo.spanType}-${hInfo.index + 1}`;
    }
    markIndex = markStart({ type: hInfo.spanType, snippet, path: hInfo.subPath }, {});

    try {
      const answer = (handler as any)(...args);
      if (answer && typeof answer.catch === 'function') {
        answer.catch((error: any) => {
          onEnd(markIndex, hasEnded, error, true);
        });
      }
      return answer;
    } catch (error) {
      onEnd(markIndex, hasEnded, error, true);
      throw error;
    }
  };

  Object.defineProperty(newHandler, 'length', { value: handler.length });
  
  return newHandler;
}
