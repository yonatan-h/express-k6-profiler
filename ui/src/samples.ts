import type { SpanFolder } from './front-types';

export const data: SpanFolder = {
  type: 'root',
  cur: {
    totalMs: 120,
    count: 30,
    snippet: '<root>',
    errors: {},
  },
  prev: {
    totalMs: 140,
    count: 30,
    snippet: '<root>',
    errors: {},
  },
  subFolders: [
    {
      type: 'middleware',
      cur: {
        totalMs: 60,
        count: 10,
        snippet: 'auth',
        errors: { '401': { count: 3, message: 'Unauthorized' } },
      },
      prev: {
        totalMs: 50,
        count: 10,
        snippet: 'auth',
        errors: { '401': { count: 5, message: 'Unauthorized' } },
      },
      subFolders: [],
    },
    {
      type: 'route',
      cur: {
        totalMs: 60,
        count: 12,
        snippet: 'GET /api/users',
        errors: { '500': { count: 2, message: 'did not work' } },
      },
      prev: {
        totalMs: 70,
        count: 12,
        snippet: 'GET /api/users',
        errors: { '500': { count: 4, message: 'did not work' } },
      },
      subFolders: [
        {
          type: 'db',
          cur: {
            totalMs: 25,
            count: 6,
            snippet: 'User.find',
            errors: {},
          },
          prev: {
            totalMs: 30,
            count: 6,
            snippet: 'User.find',
            errors: {},
          },
          subFolders: [],
        },
        {
          type: 'promise-all',
          cur: {
            totalMs: 50,
            count: 6,
            snippet: 'Promise.all',
            errors: {},
          },
          prev: {
            totalMs: 35,
            count: 6,
            snippet: 'Promise.all',
            errors: {},
          },
          subFolders: [
            {
              type: 'db',
              cur: {
                totalMs: 20,
                count: 3,
                snippet: 'Order.find()',
                errors: {},
              },
              prev: {
                totalMs: 22,
                count: 3,
                snippet: 'Order.find()',
                errors: {},
              },
              subFolders: [],
            },
            {
              type: 'db',
              cur: {
                totalMs: 18,
                count: 3,
                snippet: 'query.exec()',
                errors: {},
              },
              prev: {
                totalMs: 20,
                count: 3,
                snippet: 'query.exec()',
                errors: {},
              },
              subFolders: [],
            },
          ],
        },
      ],
    },
    {
      type: 'route',
      cur: {
        totalMs: 20,
        count: 8,
        snippet: 'POST /api/users',
        errors: {},
      },
      prev: {
        totalMs: 25,
        count: 8,
        snippet: 'POST /api/users',
        errors: {},
      },
      subFolders: [],
    },
  ],
};

export const sampleDetails = {
  snippet: 'auth',

  spanType: 'middleware' as const,

  suggestions: [
    {
      confidence: 'easy' as const,

      content:
        'Cache decoded JWT sessions for short-lived tokens to avoid repeated verification work.',

      potentialGain: 18,
    },

    {
      confidence: 'medium' as const,

      content:
        'Move getUserById() behind an in-memory request cache to reduce duplicate DB lookups during Promise.all execution.',

      potentialGain: 9,
    },

    {
      confidence: 'hard' as const,

      content:
        'Replace synchronous JWT verification with a lighter-weight session strategy for internal APIs.',

      potentialGain: 35,
    },
  ],

  filePath:
    '/Users/yonatan/projects/express-k6-profiler/src/middleware/auth.ts',

  line: 27,

  errors: {
    E401: {
      count: 14,
      message: 'Unauthorized: missing bearer token',
    },

    E_DB_TIMEOUT: {
      count: 3,
      message:
        'Database query exceeded timeout threshold of 5000ms',
    },
  },

  code: `
app.post('/api/users', async (req, res) => {
  const name = Abebe ${Math.round(Math.random() * 1000)};
  const email = abebe${Math.round(Math.random() * 10000000)};
  const password = example;
  console.log('creating', { name, email, password });
  await UserModel.create({ name, email, password });
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

  `,
};