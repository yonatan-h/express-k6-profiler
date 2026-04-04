const express = require('express');
const { profile, track } = require('../dist/main');
const { spawn } = require('child_process');

const app = express();
profile(app, { prefix: '/api' });

const User = {
  findById: async (id) => {
    await new Promise(resolve => setTimeout(resolve, 750));
    return { id, name: 'Grace Hopper' };
  }
};

const authenticate = async (req, res, next) => {
  await new Promise(resolve => setTimeout(resolve, 450));
  next();
};

const rateLimiter = async (req, res, next) => {
  await new Promise(resolve => setTimeout(resolve, 15));
  next();
};

app.get('/api/users/:id', authenticate, rateLimiter, async (req, res) => {
  const user = await track('my fetch user query', () => User.findById(req.params.id));
  
  await track('my mapping logic', async () => {
    await new Promise(resolve => setTimeout(resolve, 150));
  });

  res.json({ user });
});

app.get('/api/products', authenticate, async (req, res) => {
  await new Promise(resolve => setTimeout(resolve, 100));
  res.json({ products: ['laptop', 'keyboard'] });
});

app.get('/api/status', async(req, res) => {
  await new Promise(resolve => setTimeout(resolve, 80));
  res.json({ status: 'healthy', database: 'connected' });
});

app.listen(3002, () => {
  console.log('Readme app is running on port 3002');
  
  const child = spawn('k6', ['run', 'k6-test.js'], {
    stdio: 'inherit',
    shell: true,
    cwd: __dirname
  });
});
