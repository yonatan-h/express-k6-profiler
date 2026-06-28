import express from 'express';
import type { profile as ProfType } from '../../src/main';
import './db';
import { OrderModel, UserModel } from './models';

const mod =
  process.env.__AS_DEV === 'true' ? require('../../src/main') : require('../../dist/main');
export const profile = mod.profile as typeof ProfType;

//items.js imagine itemsRouter being imported
const itemsRouter = express.Router();
itemsRouter.get('/deep', (req, res) => {
  res.json({ items: [1, 2, 3] });
});

//app.js
const app = express();
profile(app, { prefix: '/api' });

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

app.use(async function authUsers(req, res, next) {
  await Promise.all([sleep(15), sleep(5)]);
  next();
});

app.get('/api/users/:id', async (req, res) => {
  console.log('bob is a user');
  await new Promise((resolve) => setTimeout(resolve, 100)); //db query
  res.json({ user: 'Bob' });
});

app.get(
  '/api/orders',
  async function orderSpecificMdl(req, res, next) {
    await new Promise((resolve) => setTimeout(resolve, 3));
    next();
  },

  async function getOrdersRoute(req, res) {
    const orders = await OrderModel.find({});
    res.json({ orders });
  },
);

app.use('/api/items', itemsRouter);

app.post('/api/users', async (req, res) => {
  const name = `Abebe ${Math.round(Math.random() * 1000)}`;
  const email = `abebe${Math.round(Math.random() * 10000000000000)}`;
  const password = `example`;
  console.log('creating', { name, email, password });
  await UserModel.create({ name, email, password });
  type a = string; //comment next to typescript type
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
  throw new Error('my error in endpoin');
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

itemsRouter.get('/exclusive-last', async (req, res) => {
  await new Promise((resolve) => setTimeout(resolve, 20));
  throw new Error('my error in endpoint after error handler middleware');
});

export default app;
