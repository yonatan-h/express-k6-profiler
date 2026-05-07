import React, { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { safeDivide } from '../../shared/utils';

const path = window.location.pathname;
const BACKEND_PREFIX = `${window.location.origin}${path}${path.endsWith('/') ? '' : '/'}api`;

export default function App() {
  return (
    <div className="bg-gray-100 w-screen h-screen flex flex-col gap-3">
      <div className="flex gap-3 h-screen">
        <div className="  rounded flex flex-col gap-3">
          <Suggestions />
        </div>
        <div className="flex-1 flex flex-col gap-3">
      <TopSummary />
          <RawInfo />
        </div>
      </div>
    </div>
  );
}

function TopSummary() {
  return (
    <div className="bg-white rounded p-3 flex gap-3 justify-between">
      <div className="flex gap-3">
        <p>
          <p className="text-xs">Avg latency</p>
          <p className="pr-2 font-bold">240 ms</p>
          <p className="text-xs text-green-700 font-bold">▼ 25%</p>
        </p>

        <div className="w-0.5 border border-gray-200" />
        <p>
          <p className="text-xs">Requests</p>
          <p className="pr-2 ">240</p>
          <p className="text-xs text-green-700 font-bold">▼ 25%</p>
        </p>

        <div className="w-0.5 border border-gray-200" />
        <p>
          <p className="text-xs">Error rate</p>
          <p className="pr-2 ">2.1%</p>
          <p className="text-xs text-green-700 font-bold">▼ 25%</p>
        </p>

        <div className="w-0.5 border border-gray-200" />
      </div>

      <BaseLine />
    </div>
  );
}

function BaseLine() {
  return (
    <div className="flex gap-2 items-center">
      <span className="text-xs">Compare:</span>
      <select className="border border-gray-300 text-xs p-1 rounded">
        <option>Baseline 1 (saved 2h ago)</option>
        <option>None (Raw stats only)</option>
      </select>

      <div className="w-0.5 border border-gray-200 h-full" />
      <button className="text-xs bg-gray-700 text-white py-2 px-3 rounded">Save</button>
    </div>
  );
}

function Suggestions() {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <div className={`bg-white rounded p-3 ${isOpen ? `w-[300px]` : ``}`}>
      <div className={`flex items-center pb-3 ${isOpen ? `justify-between` : 'justify-center'}`}>
        {isOpen && (
          <h2 className={`flex justify-center items-center `}>
            <span>Suggestions</span>
            <span className="bg-gray-100 px-2 rounded mx-3">5</span>
          </h2>
        )}
        <button
          className="bg-gray-700 text-white text-xs px-3 py-1 rounded"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? '◀' : '▶'}
        </button>
      </div>
      <div className="flex flex-col gap-5">
        {[1, 1, 1, 1, 1].map((_, i) => {
          return (
            <React.Fragment key={i}>
              {<hr className="border border-gray-200 " />}
              <SuggestionBox isOpen={isOpen} />
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

function SuggestionBox({ isOpen }: { isOpen: boolean }) {
  if (!isOpen) {
    return (
      <span className="bg-gray-100 px-2 rounded mr-1 bg-green-100 text-green-700 text-xs">
        -5ms
      </span>
    );
  }
  return (
    <div className="text-xs flex">
      <div className="flex-1 flex flex-col gap-2">
        <div className="flex">
          <p className="font-bold">Remove console.log</p>
          <span className="bg-gray-100 px-2 rounded mr-1 bg-green-100 text-green-700">-5ms</span>
        </div>

        <p className="text-xs">Found 12 console.log calls in</p>
        <div className="flex flex-wrap gap-1 font-mono">
          <span className="bg-gray-200 px-1 rounded">route</span>
          <span className="bg-gray-200 px-1 rounded">GET /api/endpoint</span>
        </div>
        <div>
          <button className="border border-gray-200 px-2 rounded">📁 route-handler.ts:23 </button>
        </div>
      </div>
    </div>
  );
}

function BDTable() {
  return (
    <div>
      <table>
        <thead>
          <tr className="text-xs">
            <th className="text-start px-1">Method</th>
            <th className="text-start px-1">Endpoint</th>
            <th className="text-start px-1">Latency</th>
            <th className="text-start px-1">Reqs</th>
            <th className="text-start px-1">Avg ms</th>
            <th className="text-start px-1">Errors</th>
          </tr>
        </thead>
        <tbody>
          <tr className="text-sm">
            <th className="font-normal">GET</th>
            <td className="font-normal">/api/users/order/6</td>
            <td className="font-normal">60%</td>
            <td className="font-normal">140</td>
            <td className="font-normal">30ms</td>
            <td className="font-normal">
              <span>5 more</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

interface FolderProps {
  totalMs: number;
  count: number;
  snippet: string;
  errors: Record<string, { count: number; message: string }>;
}
interface SpanFolder {
  cur: FolderProps;
  prev: FolderProps | null;
  subFolders: SpanFolder[];
}

function Folder({
  data: { cur, prev, subFolders },
  depth,
  maxMs,
}: {
  data: SpanFolder;
  depth: number;
  maxMs: number;
}) {
  const [isOpen, setIsOpen] = useState(true);

  const hasChildren = subFolders && subFolders.length > 0;
  const errorCount = Object.values(cur.errors).reduce((acc, curr) => acc + curr.count, 0);

  // Scale accurately relative to the root total time.
  const maxWidth = 100;
  const curWidth = safeDivide(cur.totalMs, maxMs) * maxWidth;
  const prevWidth = safeDivide(prev.totalMs, maxMs) * maxWidth;

  // <th className="pb-2 font-normal pr-4">Latency Share</th>
  // <th className="pb-2 font-normal pr-4">Code</th>
  // <th className="pb-2 font-normal pr-4">Count</th>
  // <th className="pb-2 font-normal">Errors</th>
  return (
    <>
      <tr className="text-xs">
        <td className="py-1 pl-4 border border-gray-200">
          {prev && (
            <div className="flex justify-end w-full">
              <span className='pr-1 text-gray-500'>{prev.totalMs}ms</span>
              <div
                className="h-[1rem] w-full bg-gray-100 rounded-l border-l border-y  border-gray-300"
                style={{ width: prevWidth + 'px' }}
              ></div>
            </div>
          )}
          <div className="flex justify-end w-full">
              <span className='pr-1'>{cur.totalMs}ms</span>
            <div
              className="h-[1rem] w-full bg-gray-200 rounded-l border-l border-y border-gray-300"
              style={{ width: curWidth + 'px' }}
            ></div>
          </div>
        </td>
        <td className="py-1 px-4 border border-gray-200">{cur.snippet}</td>
        <td className="py-1 px-4 border border-gray-200">{cur.count}</td>
        <td className="py-1 px-4 border border-gray-200">{Object.values(cur.errors).length}</td>
      </tr>
      {subFolders.map((folder, i) => (
        <Folder key={`${cur.snippet}-${i}`} data={folder} depth={depth + 1} maxMs={maxMs} />
      ))}
    </>
  );
}

function RawInfo() {
  const data: SpanFolder = {
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
        cur: {
          totalMs: 40,
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
            cur: {
              totalMs: 30,
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
                cur: {
                  totalMs: 20,
                  count: 3,
                  snippet: '|-> Order.find()',
                  errors: {},
                },
                prev: {
                  totalMs: 22,
                  count: 3,
                  snippet: '|-> Order.find()',
                  errors: {},
                },
                subFolders: [],
              },
              {
                cur: {
                  totalMs: 18,
                  count: 3,
                  snippet: '|-> query.exec()',
                  errors: {},
                },
                prev: {
                  totalMs: 20,
                  count: 3,
                  snippet: '|-> query.exec()',
                  errors: {},
                },
                subFolders: [],
              },
            ],
          },
        ],
      },
      {
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

  let maxMs = 50;
  for (const folder of data.subFolders) {
    maxMs = Math.max(maxMs, folder.cur.totalMs, folder.prev?.totalMs ?? 0);
  }

  return (
    <div className="p-3 bg-white rounded flex-1 overflow-auto">
      <h2 className="pb-6">Where does the time go?</h2>
      <table className="border-collapse">
        <thead>
          <tr className="text-xs text-left ">
            <th className="py-2 font-normal px-4 border border-gray-200 text-right">Latency</th>
            <th className="py-2 font-normal px-4 border border-gray-200 ">Code</th>
            <th className="py-2 font-normal px-4 border border-gray-200 ">Count</th>
            <th className="py-2 font-normal px-4 border border-gray-200 ">Errors</th>
          </tr>
        </thead>
        <tbody>
          {data.subFolders.map((folder, i) => {
            return (
              <Folder key={`${folder.cur.snippet}-${i}`} data={folder} maxMs={maxMs} depth={0} />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Nav() {
  return (
    <div className="p-2 w-full bg-white flex justify-between rounded  items-center">
      <h1 className="font-bold">KRay</h1>
      <div></div>
    </div>
  );
}
