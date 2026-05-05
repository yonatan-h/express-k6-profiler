import { SpanCode } from '../../shared/types';
import { markEnd, markStart } from '../async-storage';
import { getCodeInfo, log } from '../utils';

export function wrapGlobals() {
  //---console.log---
  const oldLog = console.log.bind(console);
  global.console.log = (...args: any[]) => {
    const error = new Error();
    const { line, filePath, isUserLevel, snippet } = getCodeInfo(error, {
      methodName: 'console.log',
      args,
    });
    let spanIndex = markStart('console-log', {}, { snippet, filePath, line }, { isUserLevel });
    const res = oldLog(...args);

    //TODO: manually pass end time for more accuracy
    markEnd(spanIndex, {}, {});
    return res;
  };

  //--- promise-all---
  const oldPromiseAll = Promise.all.bind(Promise);
  global.Promise.all = (values: any[]) => {
    const error = new Error();
    const { line, snippet, filePath, callerName, isUserLevel } = getCodeInfo(error, {
      methodName: 'Promise.all',
      args: values,
    });
    let spanIndex = markStart('promise-all', {}, { snippet, line, filePath }, { isUserLevel });
    const res = oldPromiseAll(values);
    res.finally(() => {
      const snippet = `${callerName} → Promise.all(${values.length} args)`;
      markEnd(spanIndex, {}, { snippet, line, filePath });
    });
    return res;
  };
}
