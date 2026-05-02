import type { NextFunction, Request, Response, RequestHandler, Application, Router } from 'express';
import { SpanType } from '../../shared/types';
import { markEnd, markStart } from '../async-storage';

type HandlerInfo = {
  spanType: SpanType;
  index: number;
  handler: RequestHandler;
  subPath: string;
};

const onEnd = (markIndex: number, hasEnded: [boolean]) => {
  if (hasEnded[0]) return;
  hasEnded[0] = true;
  markEnd(markIndex, {}, {}, { expectSpanContext: true });
};

export function wrapHandler(handler: RequestHandler, hInfo: HandlerInfo): RequestHandler {
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
