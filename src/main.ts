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

const Methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'] as const;
export type Method = null | (typeof Methods)[number];

const storage = new AsyncLocalStorage<{
  capturedBody?: any;
  mItems: MeasurementItem[];
}>();
const isOk = (statusCode: number) => statusCode < 400;

const wrapHandler = (handler: RequestHandler, mItem: MeasurementItem): RequestHandler => {
  if ((handler as any).__ekp_wrapped) return handler;

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

  if (handler.length === 4) {
    const errorWrapper: any = (err: any, req: Request, res: Response, next: NextFunction) => {
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

      return (handler as any)(err, req, res, (...nextArgs: any[]) => {
        measure(begin, ended);
        next(...nextArgs);
      });
    };
    errorWrapper.__ekp_wrapped = true;
    return errorWrapper;
  }

  const wrapper: RequestHandler = (req, res, next) => {
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

  (wrapper as any).__ekp_wrapped = true;
  return wrapper;
};

function patchExistingStack(router: Application, currentPath: string) {
  if (!router.stack) return; //why doesnt it have a stack despite TS definitions? investigate in future
  for (const layer of router.stack) {
    if (layer.route) {
      //is a route
      for (const innerLayer of layer.route.stack) {
        const method: string = innerLayer.method.toLocaleLowerCase();
        if (!Methods.includes(method as any)) {
          console.error('Skipped wrapping route because of unknown method:', method);
          continue;
        }
        innerLayer.handle = wrapHandler(innerLayer.handle, {
          name: 'route handler',
          type: 'route',
          path: currentPath + (layer.route.path || ''),
          method: method as Method,
          millis: -1,
        });
      }
    } else if (layer.name === 'router' && Array.isArray((layer.handle as any).stack)) {
      //not sure if is a reliable indicator of routers
      wrapRouter(layer.handle as Application, currentPath);
    } else if (typeof layer.handle === 'function') {
      layer.handle = wrapHandler(layer.handle, {
        name: layer.name && layer.name !== '<anonymous>' ? layer.name : 'anonymous',
        type: 'middleware',
        path: currentPath,
        method: null,
        millis: -1,
      });
    }
  }
}

function wrapRouter(app: Application, prePath: string = ''): Application {
  patchExistingStack(app, prePath);

  const oldUse = app.use.bind(app);
  app.use = (...args: any[]) => {
    const path = typeof args[0] === 'string' ? args[0] : undefined;

    for (let i = 0; i < args.length; i++) {
      if (typeof args[i] !== 'function') continue;
      const arg = args[i] as Application | RequestHandler;
      if ('use' in arg) {
        const fullPath = prePath + (path || '');
        patchExistingStack(arg, fullPath);
        args[i] = wrapRouter(arg, fullPath);
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
      name+':track() must be called only after profile(app) at the top of app.js or equivalent',
    );
    return await fn();
  }

  if (typeof name !== 'string'){
    const error = new Error(`track(x,y) x must be a string. It is currently ${typeof name}: ${name}`);
    store.capturedBody = { error: error }; //handle elegantly
    throw error;
  }
  if (typeof fn !== 'function'){
    const error = new Error(`track(x,y) y must be a function. It is currently ${typeof fn}: ${fn}`);
    store.capturedBody = { error: error }; //handle elegantly
    throw error;
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

export function profile(
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
  console.log(`Express-k6-profiler setup complete. Please open yourbackend:port${options.prefix}/__profile`)
}

