import express from 'express';
import { spawn } from 'child_process';

import type { profile as ProfType, track as TrackType } from '../src/main';

const mod = process.env.__AS_DEV === 'true' 
  ? require('../src/main') 
  : require('../dist/main');
  

export const profile = mod.profile as typeof ProfType;
export const track = mod.track as typeof TrackType;

//items.js imagine itemsRouter being imported
const itemsRouter = express.Router();
itemsRouter.get('/deep', (req, res) => {
  res.json({ items: [1, 2, 3] });
});

//app.js
const app = express();
profile(app, { prefix: '/api' });

app.use(async function authUsers(req, res, next) {
  await new Promise((resolve) => setTimeout(resolve, 50));
  next();
});

app.get('/api/users/:id', async (req, res) => {
  await new Promise((resolve) => setTimeout(resolve, 100)); //db query
  res.json({ user: 'Bob' });
});

app.get('/api/orders', async function dbQuery(req, res) {
  await track('query user', async () => await new Promise((resolve) => setTimeout(resolve, 300)));

  await track(
    'query user orders',
    async () => await new Promise((resolve) => setTimeout(resolve, 300)),
  );
  res.json({ orders: [1, 2, 3] });
});

app.use('/api/items', itemsRouter);

app.post('/api/users', async (req, res) => {
  await new Promise((resolve) => setTimeout(resolve, 20));
  res.status(201).json({ message: 'user created' });
});
app.post('/api/orders', (req, res) => {
  res.status(201).json({ message: 'order created' });
});
itemsRouter.post('/deep', (req, res) => {
  res.status(500).json({ error: 'items cant be created' });
});

itemsRouter.get('/exclusive', async (req, res) => {
  await new Promise((resolve) => setTimeout(resolve, 20));
  throw new Error('can not query exclusive items');
});
itemsRouter.use(async function handleErrors(
  err: Error,
  _req: express.Request,
  res: express.Response,
  _next: express.NextFunction,
) {
  await new Promise((resolve) => setTimeout(resolve, 10));
  res.status(500).json({ error: 'Unexpected error:' + err.message });
});

const PORT = 3010;
app.listen(PORT, () => {
  console.log(`Example app listening on http://localhost:${PORT}`);
  console.log(`View profiler at http://localhost:${PORT}/api/__profile`);

  const child = spawn('k6', ['run', 'example/k6-test.js'], {
    stdio: 'inherit',
    shell: true,
  });

  child.on('exit', async () => {
    console.log('k6 exited');
    console.log('RUNNING AS ' + (process.env.__AS_DEV === 'true' ? 'DEV' : 'PROD'))
    console.log('View', `http://localhost:${PORT}/api/__profile`);
    console.log('Res is:', await fetch(`http://localhost:${PORT}/api/__profile/api/all`).then(res => res.json()));
  });
});

export default app;
