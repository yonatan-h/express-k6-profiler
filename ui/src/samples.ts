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
