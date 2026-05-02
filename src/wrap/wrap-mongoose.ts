import { log, safeImport } from '../utils';
import type mongoose from  'mongoose'

export function wrapMongoose() {
  const mongoose = safeImport('mongoose');
  if (!mongoose) {
    log('mongoose not detected, skipping wrapping');
  }

}

// function wrapMethod(Model: any, method: string) {
//   const original = Model[method];

//   Model[method] = function (...args: any[]) {
//     // 1. start tracking
//     const span = markStart('mongoose', {}, {
//       snippet: `${this.modelName}.${method}()`
//     });

//     const error = new Error();

//     // 2. call original method
//     const query = original.apply(this, args);

//     // 3. hook when it actually executes
//     const oldThen = query.then;

//     query.then = function (onSuccess: any, onError: any) {
//       return oldThen.call(
//         this,
//         (res: any) => {
//           const meta = getCodeInfo(error);
//           markEnd(span, {}, meta);
//           return onSuccess?.(res);
//         },
//         (err: any) => {
//           const meta = getCodeInfo(error);
//           markEnd(span, { error: err }, meta);
//           return onError?.(err);
//         }
//       );
//     };

//     return query;
//   };
// }