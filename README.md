# express-k6-profiler

_To find bottlenecks in an Express app during k6 load testing, use express-k6-profiler._



k6 showed me my backend latency was high.

But not why.

This shows exactly where time is spent inside your Express app.

It breaks down request time into middleware, route handlers, and database calls.

---

![k6 average latency results](https://raw.githubusercontent.com/yonatan-h/express-k6-profiler/main/read-me-example/k6-result.png)
_shows `avg=704.1ms` but where is that time going?_

![express-k6-profiler dashboard](https://raw.githubusercontent.com/yonatan-h/express-k6-profiler/main/read-me-example/ekp-result.png)
_...reveals `GET /api/users/:id` as the bottleneck_

---
## What this solves
Common use case: k6 shows high latency, but you need to find the exact bottleneck inside your Express app.

Use this if:
- k6 testing shows high latency but you don’t know why  
- you want to see time spent in middleware vs handlers vs DB queries
- you don’t want full tracing setup (Jaeger, OpenTelemetry, etc.)
  
---

## Install

```bash
npm install express-k6-profiler
```
## Usage

```javascript
const { profile } = require('express-k6-profiler');
const app = express();
profile(app);//<- enable profiling

```
Run k6 test, then open `your-backend.com/__profile`

### Custom path

If your app is mounted under a prefix (e.g. `/api`) or you're using Kubernetes/ingress routing, you can change where the profiler is exposed:

```js
profile(app, { prefix: '/your/secret/path' });
```
Then open `your-backend.com/your/secret/path/__profile`

### Tracking DB queries & heavy logic

You can track specific operations like database calls:

```javascript
const { track } = require('express-k6-profiler');

app.get('/api/users/:id', async (req, res) => {
  const user = await track('my get user query',
    () => User.findById(req.params.id)
  );
  
  await track('my mapping logic',
    () => {/* a 50ms blocking work here*/}
  );

  res.json({ user });
});
```

## Why not just use k6?
k6 tells you how slow an app is.
But does not tell you:
- which middleware is slow
- which route is the problem
- if the database is the bottleneck

## Note
- Adds a small overhead  
- Use in staging/testing (not production)


## Status (Alpha)
Feedback and issues are highly welcome!
