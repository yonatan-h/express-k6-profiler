import express from 'express';
import profile, { track } from '../src/main';
import { spawn } from 'child_process';

const app = express();
const itemsRouter = express.Router();

profile(app, { prefix: '/api' });

app.use(async function auth(req, res, next) {
  await new Promise((resolve) => setTimeout(resolve, 50));
  next();
});

//get
app.get('/api/users', (req, res) => {
  res.json({ users: ['Alice', 'Bob'] });
});

app.get('/api/orders', async function dbQuery(req, res) {
  await track(
    'fake-db-query',
    async () => await new Promise((resolve) => setTimeout(resolve, 300)),
  );
  res.json({ orders: [1, 2, 3] });
});

itemsRouter.get('/deep', (req, res) => {
  res.json({ items: [1, 2, 3] });
});
app.use('/api/items', itemsRouter);

//post
app.post('/api/users', (req, res) => {
  res.status(201).json({ message: 'user created' });
});
app.post('/api/orders', (req, res) => {
  res.status(201).json({ message: 'order created' });
});
itemsRouter.post('/deep', (req, res) => {
  res.status(500).json({ error: 'items cant be created' });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Example app listening on http://localhost:${PORT}`);

  const child = spawn('k6', ['run', 'example/k6-test.js'], {
    // stdio: 'inherit',
    shell: true
  });

  child.on('exit', async () => {
    console.log('k6 exited');
    // console.log(await fetch(`http://localhost:${PORT}/api/__profile/json`).then((res) => res.json()));
    console.log('View', `http://localhost:${PORT}/api/__profile`);
  });
});

export default app;
