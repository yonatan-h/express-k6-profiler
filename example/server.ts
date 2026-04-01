import express from 'express';
import profile from '../src/main';
import { spawn } from 'child_process';

const app = express();

profile(app);

app.use(async function auth(req, res, next) {
  await new Promise((resolve) => setTimeout(resolve, 50));
  next();
});

app.get('/api/users', (req, res) => {
  res.json({ users: ['Alice', 'Bob'] });
});

app.get('/api/orders', async function dbQuery(req, res) {
  await new Promise((resolve) => setTimeout(resolve, 300));
  res.json({ orders: [1, 2, 3] });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Example app listening on http://localhost:${PORT}`);
  
  spawn('k6', ['run', 'example/k6-test.js'], { 
    stdio: 'inherit', 
    shell: true 
  });
});

export default app;
