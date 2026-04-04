import { NextFunction, Request, Response, RequestHandler, Application } from 'express';
import { AsyncLocalStorage } from 'async_hooks';
import {
  getMeasurements,
  MeasurementItem,
  resetMeasurements,
  convertToFrontendMeasurements,
} from './measurement';
import path from 'path';
import fs from 'fs/promises';

export type Method = null | 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head';

const storage = new AsyncLocalStorage<{
  capturedBody?: any;
  mItems: MeasurementItem[];
}>();
const isOk = (statusCode: number) => statusCode < 400;

const wrapHandler = (handler: RequestHandler, mItem: MeasurementItem): RequestHandler => {
  const measure = (begin: number, ended: [boolean]) => {
    const store = storage.getStore();
    if (ended[0]) return;
    if (!store) return console.error('No store found for ' + mItem.name);

    mItem.millis = Date.now() - begin;
    store.mItems.push(mItem);
    ended[0] = true;
  };

  const captureBodyIfError = (res: Response, ...resArguments: any[]) => {
    if (!isOk(res.statusCode)) {
      const store = storage.getStore();
      if (!store) return console.error('No store found for ' + mItem.name);
      store.capturedBody = resArguments[0];
    }
  };

  return (req: Request, res: Response, next: NextFunction) => {
    const begin = Date.now();
    let ended: [boolean] = [false];

    const oldResJson = res.json.bind(res);
    const oldResSend = res.send.bind(res);

    res.json = (...args: any[]) => {
      captureBodyIfError(res, ...args);
      measure(begin, ended);
      return oldResJson(...args);
    };

    res.send = (...args: any[]) => {
      captureBodyIfError(res, ...args);
      measure(begin, ended);
      return oldResSend(...args);
    };

    return handler(req, res, (...nextArgs: any[]) => {
      measure(begin, ended);
      next(...nextArgs);
    });
  };
};

function wrapRouter(app: Application, prePath: string = ''): Application {
  const oldUse = app.use.bind(app);
  app.use = (...args: any[]) => {
    const path = typeof args[0] === 'string' ? args[0] : undefined;

    for (let i = 0; i < args.length; i++) {
      if (typeof args[i] !== 'function') continue;
      const arg = args[i] as Application | RequestHandler;
      if ('use' in arg) {
        args[i] = wrapRouter(arg, prePath + (path || ''));
      } else {
        args[i] = wrapHandler(arg, {
          name: arg.name || 'anonymous',
          type: 'middleware',
          path: prePath + (path || ''),
          method: null,
          millis: -1,
        });
      }
    }

    return oldUse(...args);
  };

  const oldMethods: Record<string, Function> = {
    get: app.get.bind(app),
    post: app.post.bind(app),
    put: app.put.bind(app),
    delete: app.delete.bind(app),
    patch: app.patch.bind(app),
    options: app.options.bind(app),
    head: app.head.bind(app),
  };

  for (const method in oldMethods) {
    (app as any)[method] = (...args: any[]) => {
      const path = typeof args[0] === 'string' ? args[0] : undefined;

      for (let i = 0; i < args.length; i++) {
        if (typeof args[i] !== 'function') continue;
        const arg = args[i] as RequestHandler;
        const isRoute = i === args.length - 1; //assuming is route. but it's not neccessarily a route, could be an error handler
        args[i] = wrapHandler(arg, {
          name: isRoute ? `route handler` : arg.name || 'anonymous',
          type: isRoute ? 'route' : 'middleware',
          path: prePath + (path || ''),
          method: method.toUpperCase() as Method,
          millis: -1,
        });
      }

      return oldMethods[method](...args);
    };
  }

  return app;
}

export async function track<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const store = storage.getStore();
  if (!store) {
    console.error(
      'track() must be called only after profile(app) at the top of app.js or equivalent',
    );
    return await fn();
  }

  const mItem: MeasurementItem = { name, type: 'tracked-fn', path: '', method: null, millis: -1 };
  let result: T;
  const begin = Date.now();
  try {
    result = await fn();
    mItem.millis = Date.now() - begin;
    store.mItems.push(mItem);
    return result;
  } catch (e) {
    store.capturedBody = { error: e }; //handle elegantly
    mItem.millis = Date.now() - begin;
    store.mItems.push(mItem);
    throw e;
  }
}

export default async function profile(
  app: Application,
  options: { prefix: string } = { prefix: '' },
) {
  app.get(`${options.prefix}/__profile/json`, (req, res) => {
    res.json(convertToFrontendMeasurements(getMeasurements()));
  });

  app.get(`${options.prefix}/__profile`, async (req, res) => {
    res.send(await fs.readFile(path.join(__dirname, 'measurement.html'), 'utf-8'));
  });

  app.post(`${options.prefix}/__profile/reset`, (req, res) => {
    resetMeasurements();
    res.send('ok');
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    const begin = Date.now();
    const store = { mItems: [] };
    storage.run(store, () => {
      res.on('finish', () => {
        const end = Date.now();
        const measurements = getMeasurements();
        const store = storage.getStore();

        if (!store) {
          console.error('No store found for ' + req.path);
          return;
        }
        const routeItem = [...store.mItems].reverse().find((m) => m.type === 'route');
        const templatePath = routeItem ? routeItem.path : req.route ? req.route.path : null;

        let name: string;
        let key: string;

        if (!templatePath) {
          key = `${req.method} ${req.path}`;
          name = key;
        } else {
          name = `${req.method} ${templatePath}`;
          key = name;
        }

        if (!measurements[name]) {
          measurements[key] = { name, subMeasurements: {}, errors: {}, count: 0, millis: -1 };
        }

        measurements[key].count++;
        measurements[key].millis += end - begin;

        for (const mItem of store.mItems) {
          let mName: string;
          let mKey: string;

          if (mItem.type === 'route') {
            mName = 'route handler';
            mKey = `${mItem.method} ${mItem.path}`;
          } else if (mItem.type === 'middleware') {
            mName = mItem.name + ' (middleware)';
            mKey = `middleware:${mItem.name}`;
          } else if (mItem.type === 'tracked-fn') {
            mName = mItem.name + ' (tracked call)';
            mKey = `tracked-fn:${mItem.name}`;
          } else {
            mName = 'unknown';
            mKey = 'unknown';
          }

          if (!measurements[key].subMeasurements[mKey]) {
            measurements[key].subMeasurements[mKey] = {
              type: mItem.type,
              name: mName,
              millis: 0,
              count: 0,
            };
          }
          measurements[key].subMeasurements[mKey].millis += mItem.millis;
          measurements[key].subMeasurements[mKey].count++;
        }

        if (!isOk(res.statusCode)) {
          let title: string = res.statusMessage || `Error ${res.statusCode}`;
          const captured = store.capturedBody;

          if (captured && typeof captured === 'object') {
            title = captured.error || captured.message || captured.msg || title;
          } else if (typeof captured === 'string' && captured.length < 100) {
            title = captured;
          }

          const errorBucket = measurements[key].errors;
          if (!errorBucket[res.statusCode]) {
            errorBucket[res.statusCode] = { count: 0, lastMessage: '' };
          }

          errorBucket[res.statusCode].lastMessage = title;
          errorBucket[res.statusCode].count++;
        }
      });

      next();
    });
  });

  wrapRouter(app);
}
