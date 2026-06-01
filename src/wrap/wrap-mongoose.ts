import { getCodeInfo, isWrapped, log, safeImport } from '../utils';
import { markEnd, markStart } from '../async-storage';
import { type Query, type Model } from 'mongoose';

const MODEL_METHODS = [
  'create',
  'find',
  'findOne',
  'findById',
  'findByIdAndUpdate',
  'findByIdAndDelete',
  'updateOne',
  'updateMany',
  'deleteOne',
  'deleteMany',
  'countDocuments',
] as const;

export function wrapMongoose() {
  const mongoose = safeImport('mongoose') as typeof import('mongoose') | null;
  if (!mongoose) {
    log('mongoose not detected, skipping wrapping');
    return;
  }

  const modelNames = mongoose.modelNames();
  if (modelNames.length === 0) {
    log('wrapMongoose: no models registered yet, nothing to wrap');
    return;
  }

  for (const name of modelNames) {
    const MyModel = mongoose.model(name);
    for (const methodName of MODEL_METHODS) {
      const wrapped = wrapMethod(MyModel, MyModel[methodName].bind(MyModel), methodName);
      MyModel[methodName] = wrapped as any; //TODO: try not using any
    }
  }
}

function wrapMethod(
  MyModel: Model<any, unknown, unknown, unknown, any, any, unknown>,
  method: Function,
  methodName: string,
): Function {
  if (isWrapped(method)) return method;

  const newMethod = (...args: any[]) => {
    const error = new Error();
    const { line, filePath, snippet, isUserLevel } = getCodeInfo(error, {
      methodName: `${MyModel.modelName}.${methodName}`,
      args,
    });
    const startIndex = markStart({ type: 'db', line, filePath, snippet }, { isUserLevel });

    const result: Promise<unknown> | Query<unknown, unknown> = method(...args);
    if ('exec' in result) {
      wrapQuery(result, startIndex);
    } else {
      wrapPromise(result, startIndex);
    }

    return result;
  };
  return newMethod;
}

function wrapQuery(query: Query<unknown, unknown>, startIndex: number) {
  const oldThen = query.then.bind(query);

  const measure = () => {
    markEnd(startIndex, {}, {});
  };

  const newThen: typeof query.then = (onRes?: any, onRej?: any) => {
    const newRes = (val: any) => {
      measure();
      if (onRes && typeof onRes === 'function') return onRes(val);
    };

    const newRej = (val: any) => {
      measure();
      if (onRej && typeof onRej === 'function') return onRej(val);
    };

    return oldThen(newRes, newRej);
  };

  query.then = newThen;
}

function wrapPromise(promise: Promise<unknown>, startIndex: number) {
  promise.finally(() => {
    markEnd(startIndex, {}, {});
  });
}
