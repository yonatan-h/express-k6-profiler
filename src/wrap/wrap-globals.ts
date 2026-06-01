import { makeSpanError } from '../../shared/big-utils';
import { markEnd, markStart } from '../async-storage';
import { getCodeInfo } from '../utils';

export function wrapGlobals() {
  //---console.log---
  const oldLog = console.log.bind(console);
  global.console.log = (...args: any[]) => {
    const error = new Error();
    const { line, filePath, isUserLevel, snippet } = getCodeInfo(error, {
      methodName: 'console.log',
      args,
    });
    let spanIndex = markStart({ type: 'console-log', snippet, filePath, line }, { isUserLevel });
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
    const { line, snippet, filePath, callerName, isUserLevel } = getCodeInfo(error, {
      methodName: 'Promise.all',
      args: values,
    });
    let spanIndex = markStart({ type: 'promise-all', snippet, line, filePath }, { isUserLevel });
    const res = oldPromiseAll(values);

    let caughtError: any;
    res.catch((e) => (caughtError = e));

    res.finally(() => {
      const snippet = `${callerName} → Promise.all(${values.length} args)`;
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
