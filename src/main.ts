import { Express, NextFunction, Request, Response, RequestHandler } from 'express';
import { AsyncLocalStorage } from 'async_hooks';

type Timing = {
  name: string;
  time: number;
};

type Store = {
  timings: Timing[];
  start: number;
};

type Aggregate = {
  count: number;
  totalTime: number;
  parts: Record<string, { total: number; count: number }>;
};

const aggregates: Record<string, Aggregate> = {};

const storage = new AsyncLocalStorage<Store>();

const UI_CSS = `
  :root {
    --bg: #0f172a;
    --card: #1e293b;
    --text: #f1f5f9;
    --muted: #94a3b8;
    --accent: #38bdf8;
    --danger: #f43f5e;
  }
  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    line-height: 1.5;
    padding: 2rem;
    margin: 0;
  }
  .container { max-width: 800px; margin: 0 auto; }
  h1 { font-size: 2.5rem; margin-bottom: 2rem; font-weight: 800; letter-spacing: -0.025em; display: flex; align-items: center; gap: 0.75rem; }
  .card {
    background: var(--card);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 1rem;
    padding: 1.5rem;
    
    margin-bottom: 1.5rem;
    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
    transition: transform 0.2s;
  }
  .card:hover { transform: translateY(-2px); border-color: rgba(56, 189, 248, 0.3); }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 1rem; }
  .route { font-size: 1.125rem; font-weight: 700; color: var(--accent); margin: 0; font-family: 'JetBrains Mono', monospace; }
  .stats { font-size: 0.875rem; color: var(--muted); }
  .stats strong { color: var(--text); }
  .breakdown { display: flex; flex-direction: column; gap: 0.25rem; }
  .row { display: flex; justify-content: space-between; align-items: center; padding: 0.625rem 0.75rem; border-radius: 0.5rem; transition: background 0.1s; }
  .row:hover { background: rgba(255,255,255,0.03); }
  .name { font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; display: flex; align-items: center; gap: 0.75rem; }
  .time { font-family: 'JetBrains Mono', monospace; font-weight: 600; font-size: 0.875rem; }
  .bottleneck { color: var(--danger); }
  .header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
  .reset-btn {
    background: rgba(244, 63, 94, 0.1);
    border: 1px solid var(--danger);
    color: var(--danger);
    padding: 0.5rem 1.25rem;
    border-radius: 0.625rem;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    outline: none;
  }
  .reset-btn:hover { background: var(--danger); color: white; box-shadow: 0 0 15px rgba(244, 63, 94, 0.3); }
  .reset-btn:active { transform: scale(0.95); }
`;

// ---------- Wrapper ----------
function wrap(fn: RequestHandler, type: 'middleware' | 'handler'): RequestHandler {
  const name = (fn as any).displayName || fn.name || `${type}:anonymous`;

  return async function wrapped(req: Request, res: Response, next: NextFunction) {
    const store = storage.getStore();
    const start = Date.now();

    try {
      return await fn(req, res, next);
    } finally {
      if (store) {
        store.timings.push({
          name: `${type}:${name}`,
          time: Date.now() - start,
        });
      }
    }
  };
}

// ---------- Patch app.use ----------
function patchUse(app: Express) {
  const originalUse = app.use as any;

  app.use = function (this: any, ...args: any[]) {
    const wrappedArgs = args.map((arg) => {
      if (typeof arg === 'function') {
        return wrap(arg, 'middleware');
      }
      return arg;
    });

    return originalUse.apply(this, wrappedArgs);
  } as any;
}

// ---------- Patch HTTP methods ----------
const METHODS = ['get', 'post', 'put', 'delete', 'patch'];

function patchMethods(app: Express) {
  METHODS.forEach((method) => {
    const original = (app as any)[method];

    (app as any)[method] = function (this: any, path: string, ...handlers: RequestHandler[]) {
      const wrapped = handlers.map((h, i) => {
        const type = i === handlers.length - 1 ? 'handler' : 'middleware';
        return wrap(h, type);
      });

      return original.call(this, path, ...wrapped);
    };
  });
}

// ---------- Profiler middleware ----------
function profilerMiddleware(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const store: Store = {
      timings: [],
      start: Date.now(),
    };

    storage.run(store, () => {
      res.on('finish', () => {
        const total = Date.now() - store.start;
        const key = `${req.method} ${req.route?.path || req.url}`;

        if (!aggregates[key]) {
          aggregates[key] = {
            count: 0,
            totalTime: 0,
            parts: {},
          };
        }

        const agg = aggregates[key];

        agg.count += 1;
        agg.totalTime += total;

        for (const t of store.timings) {
          if (!agg.parts[t.name]) {
            agg.parts[t.name] = { total: 0, count: 0 };
          }

          agg.parts[t.name]!.total += t.time;
          agg.parts[t.name]!.count += 1;
        }
      });
      next();
    });
  };
}

// ---------- Main entry ----------
export default function profile(app: Express, { prefix }: { prefix?: string } = { prefix: '' }) {

  patchUse(app);
  patchMethods(app);

  app.post(prefix + '/__profiler/reset', (req, res) => {
    Object.keys(aggregates).forEach((key) => delete aggregates[key]);
    res.json({ success: true });
  });

  app.get(prefix + '/__profiler', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>express-k6-profiler</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
        <style>${UI_CSS}</style>
      </head>
      <body>
        <div class="container">
          <div class="header-row">
            <h1>📊 Profiler Results</h1>
            <button id="resetBtn" class="reset-btn">Clear All Data</button>
          </div>
          ${formatToReadableHTML(formatResults())}
        </div>
        <script>
          let isPausing = false;
          const resetBtn = document.getElementById('resetBtn');
          
          resetBtn.onclick = async () => {
            isPausing = true;
            if (confirm('Clear all profiling data?')) {
              await fetch(window.location.pathname + '/reset', { method: 'POST' });
              window.location.reload();
            } else {
              isPausing = false;
            }
          };

          setInterval(() => {
            if (!isPausing) window.location.reload();
          }, 2000);
        </script>
      </body>
      </html>
    `);
  })
  console.log(`🚀 profiler initializing. see results on http://localhost:3000${prefix}/__profiler`);
  app.use(profilerMiddleware());
}

export async function track<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const store = storage.getStore();
  const start = Date.now();

  try {
    return await fn();
  } finally {
    if (store) {
      store.timings.push({
        name,
        time: Date.now() - start,
      });
    }
  }
}

function printResults() {
  console.log('\n\n=== 📊 express-k6-profiler results ===\n');

  for (const [route, data] of Object.entries(aggregates)) {
    const avgTotal = Math.round(data.totalTime / data.count);

    console.log(`${route} - avg ${avgTotal}ms (${data.count} reqs)\n`);

    const parts = Object.entries(data.parts)
      .map(([name, p]) => ({
        name,
        avg: Math.round(p.total / p.count),
      }))
      .sort((a, b) => b.avg - a.avg);

    parts.forEach((p, i) => {
      const mark = i === 0 ? '  <-- bottleneck' : '';
      console.log(`  ${p.name}: ${p.avg}ms${mark}`);
    });

    console.log('');
  }
}

function formatToReadableHTML(data: any[]) {
  if (data.length === 0) {
    return `<div class="card"><p style="text-align:center; color:var(--muted);">No data collected yet. Run some k6 tests!</p></div>`;
  }

  return data
    .sort((a, b) => b.avg - a.avg)
    .map(
      (item) => `
      <div class="card">
        <div class="header">
          <h2 class="route">${item.route}</h2>
          <span class="stats">avg: <strong>${item.avg}ms</strong> &middot; ${item.requests} reqs</span>
        </div>
        <div class="breakdown">
          ${item.breakdown
            .map(
              (b: any) => `
              <div class="row">
                <span class="name ${b.bottleneck ? 'bottleneck' : ''}">
                  ${b.name}
                  ${b.bottleneck ? '<span class="bottleneck-label">Bottleneck</span>' : ''}
                </span>
                <span class="time">${b.avg}ms</span>
              </div>
            `
            )
            .join('')}
        </div>
      </div>
    `
    )
    .join('');
}

function formatResults() {
  const output: any[] = [];

  for (const [route, data] of Object.entries(aggregates)) {
    const avgTotal = Math.round(data.totalTime / data.count);

    const parts = Object.entries(data.parts)
      .map(([name, p]) => ({
        name,
        avg: Math.round(p.total / p.count),
      }))
      .sort((a, b) => b.avg - a.avg);

    output.push({
      route,
      avg: avgTotal,
      requests: data.count,
      breakdown: parts.map((p, i) => ({
        ...p,
        bottleneck: i === 0,
      })),
    });
  }

  return output;
}

