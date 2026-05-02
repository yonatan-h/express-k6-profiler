import { SpanCode } from '../../shared/types';
import { markEnd, markStart } from '../async-storage';
import { getCodeInfo, log } from '../utils';

export function wrapGlobals() {
  //---console.log---
  const oldLog = console.log.bind(console);
  global.console.log = (...args: any[]) => {
    let spanIndex = markStart('console-log', {}, { snippet: `console.log(${args.length} args)` });
    const error = new Error();
    const res = oldLog(...args);

    //TODO: manually pass end time for more accuracy
    const { line, filePath, callerName } = getCodeInfo(error);
    const snippet = `${callerName} → console.log(${args.length} args)`;
    markEnd(spanIndex, {}, { snippet, filePath, line });
    return res;
  };

  //--- promise-all---
  const oldPromiseAll = Promise.all.bind(Promise);
  global.Promise.all = (values: any[]) => {
    let spanIndex = markStart('promise-all', {}, { snippet: `Promise.all(${values.length} args)` });
    const error = new Error();
    const res = oldPromiseAll(values);
    res.finally(() => {
      const { line, filePath, callerName } = getCodeInfo(error);
      const snippet = `${callerName} → Promise.all(${values.length} args)`;
      markEnd(spanIndex, {}, { snippet, line, filePath });
    });
    return res;
  };

  //
}
