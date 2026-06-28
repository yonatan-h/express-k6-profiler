import { makeSpanError } from '../../shared/big-utils';
import { markEnd, markStart } from '../async-storage';
import { getCodeInfo } from '../utils';

export function wrapGlobals() {
  //---console.log---
  const oldLog = console.log.bind(console);
  global.console.log = (...args: any[]) => {
    const error = new Error();
    const { line, filePath, code, isUserLevel, snippet } = getCodeInfo(error, {
      methodName: 'console.log',
      args,
    });
    let spanIndex = markStart(
      { type: 'console-log', code, snippet, filePath, line },
      { isUserLevel },
    );
    try {
      const res = oldLog(...args);
      //TODO: manually pass end time for more accuracy
      markEnd(spanIndex, {}, {});
      return res;
    } catch (e: any) {
      markEnd(spanIndex, { errors: makeSpanError(e?.message || String(e)) }, {});
    }
  };

  //--- promise-all---
  const oldPromiseAll = Promise.all.bind(Promise);
  global.Promise.all = (values: any[]) => {
    const error = new Error();
    const { line, snippet, filePath, code, isUserLevel } = getCodeInfo(error, {
      methodName: 'Promise.all',
      args: values,
    });
    let spanIndex = markStart(
      { type: 'promise-all', snippet, code, line, filePath },
      { isUserLevel },
    );
    const res = oldPromiseAll(values);

    let caughtError: any;
    res.catch((e) => (caughtError = e));

    res.finally(() => {
      markEnd(spanIndex, {
        snippet,
        line,
        filePath,
        errors: caughtError
          ? makeSpanError(caughtError?.message || String(caughtError))
          : undefined,
      });
    });
    return res;
  };
}
