import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { makeSpanError } from '../../shared/big-utils';
import { Span, SpanType } from '../../shared/types';
import { markEnd, markStart } from '../async-storage';
import { isWrapped, skipWrapping, stampAsWrapped } from '../utils';

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

export function wrapHandler(handler: RequestHandler, hInfo: HandlerInfo): RequestHandler {
  if (skipWrapping(handler) || isWrapped(handler)) {
    return handler;
  }
  stampAsWrapped(handler);

  const newHandler: RequestHandler = (...args: any[]) => {
    let err: any, req: Request, res: Response, next: NextFunction, otherArgs: any[];

    if (args.length === 4) [err, req, res, next, ...otherArgs] = args;
    else [req, res, next, ...otherArgs] = args;

    let markIndex: number;
    const hasEnded: [boolean] = [false];

    const oldResJson = res.json.bind(res);
    //TODO: results in super nested .json methods
    res.json = (...args: any[]) => {
      onEnd(markIndex, hasEnded, extractError(res, args), true);
      return oldResJson(...args);
    };

    //TODO: results in super nested .send methods
    const oldResSend = res.send.bind(res);
    res.send = (...args: any[]) => {
      onEnd(markIndex, hasEnded, extractError(res, args), true);
      return oldResSend(...args);
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

  return newHandler;
}
