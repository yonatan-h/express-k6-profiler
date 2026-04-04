//--- express side ---//
type Method = 'GET' | 'POST';
interface Req {
  omitLogs: boolean;
  token: string;
  path: string;
  method: Method;
}
interface Res {
  send: (msg: string) => void;
  responded: boolean;
}

type Next = () => void;
type Handler = (req: Req, res: Res, next: Next) => void;
type Router = {
  (req: Req, res: Res, next: Next): void;
  get: (path: string, ...handlers: Handler[]) => void;
  post: (path: string, ...handlers: Handler[]) => void;
  use: (arg1: string | Handler | Router, ...handlers: (Handler | Router)[]) => void;
};
interface Layer {
  needsExactMatch: boolean;
  path: string; // '/' or '/.*'
  method?: Method;
  handler: Handler;
}

function newRouter(): Router {
  const stack: Layer[] = [];

  const runNext = (req: Req, res: Res, index: number, onNotFound: () => void) => {
    const layer = stack[index];

    if (!layer) {
      onNotFound();
      return;
    }

    const pathMatches =
      (layer.needsExactMatch && req.path === layer.path) ||
      (!layer.needsExactMatch && req.path.startsWith(layer.path));
    const methodMatches = !layer.method || layer.method === req.method;

    if (pathMatches && methodMatches) {
      if (!req.omitLogs) {
        console.log(
          `layer[${index}] [${req.method} ${req.path}] vs [${layer.method || 'ALL'} ${layer.path}] [matches]`,
        );
      }
      const oldPath = req.path;
      const truncatedPath = oldPath.slice(layer.path.length);
      req.path = truncatedPath || '/';

      layer.handler(req, res, () => {
        req.path = oldPath;
        runNext(req, res, index + 1, onNotFound);
      });
    } else {
      runNext(req, res, index + 1, onNotFound);
    }
  };

  const router = (req: Req, res: Res, next: Next) => {
    runNext(req, res, 0, next);
  };

  router.get = (path: string, ...handlers: Handler[]) => {
    handlers.forEach((handler) =>
      stack.push({ needsExactMatch: true, path, handler, method: 'GET' }),
    );
  };

  router.post = (path: string, ...handlers: Handler[]) => {
    handlers.forEach((handler) =>
      stack.push({ needsExactMatch: true, path, handler, method: 'POST' }),
    );
  };

  router.use = (arg1: string | Handler | Router, ...args: (Handler | Router)[]) => {
    const path = typeof arg1 === 'string' ? arg1 : '/';
    const handlers: (Handler | Router)[] = [];
    if (typeof arg1 !== 'string') {
      handlers.push(arg1);
    }
    for (const handler of args) {
      handlers.push(handler);
    }

    for (const handler of handlers) {
      stack.push({ path, handler, needsExactMatch: false });
    }
  };
  return router;
}

//--- user side ---//

const app = newRouter();
const usersRouter = newRouter();
function auth(req: Req, res: Res, next: Next) {
  if (req.token !== '123') {
    res.send('unauthenticated');
  } else {
    next();
  }
}

app.use((req, res, next) => {
  console.log('USR global middleware:', req);
  next();
});

app.use('/api', (req, res, next) => {
  console.log('USR inside API: ');
  next();
});
app.get('/api', (req, res) => {
  res.send('api is working ...');
});

app.use('/api/users', usersRouter);

usersRouter.get('/', auth, (req, res) => {
  console.log('USR inside GET users', req);
  res.send(JSON.stringify({ users: [{ name: 'abebe' }, { name: 'kebede' }] }));
});
usersRouter.post('/', auth, (req, res) => {
  console.log('USR inside POST users', req);
  res.send(JSON.stringify({ message: 'created successfully' }));
});

//--- express side ---//
function sendReq({
  token,
  path,
  method,
  omitLogs,
}: {
  token?: string;
  path: string;
  method?: Method;
  omitLogs?: boolean;
}) {
  token = token || '123';
  method = method || 'GET';
  if (omitLogs === undefined) omitLogs = true;

  const req: Req = { token, path, method, omitLogs };
  const res: Res = {
    responded: false,
    send: (msg: string) => {
      console.log(`[RESPONSE]: ${msg}`);
      res.responded = true;
    },
  };

  app(req, res, () => {
    if (!res.responded) {
      res.send('404 not found');
    }
  });
}
function main() {
  sendReq({ path: 'nowhere' });
  sendReq({ path: 'nowhere', method: 'POST' });
  sendReq({ path: '/api' });
  sendReq({ path: '/api/users' });
  sendReq({ path: '/api/users', method: 'POST' });
}
main();
