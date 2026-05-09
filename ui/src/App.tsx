import React, { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { safeDivide } from '../../shared/utils';
import { IoChevronDown, IoChevronForward } from 'react-icons/io5';
import type { FolderProps, SpanFolder } from './front-types';
import { data } from './samples';
import { TbBrackets, TbDatabase, TbLogs, TbRouteAltRight } from 'react-icons/tb';
import type { SpanType } from '../../shared/types';
import { AiOutlineBranches, AiOutlineVerticalAlignMiddle } from 'react-icons/ai';

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
    <div className="bg-white rounded p-3 flex gap-3 justify-between border border-gray-200">
      <div className="flex gap-3">
        <p className="flex flex-col">
          <span className="text-xs">Avg latency</span>
          <span className="pr-2 font-bold">240 ms</span>
          <span className="text-xs text-green-700 font-bold">▼ 25%</span>
        </p>

        <div className="w-0.5 border border-gray-200" />
        <p>
          <span className="text-xs">Requests</span>
          <span className="pr-2 ">240</span>
          <span className="text-xs text-green-700 font-bold">▼ 25%</span>
        </p>

        <div className="w-0.5 border border-gray-200" />
        <p>
          <span className="text-xs">Error rate</span>
          <span className="pr-2 ">2.1%</span>
          <span className="text-xs text-green-700 font-bold">▼ 25%</span>
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
    <div className={`bg-white rounded p-3 ${isOpen ? `w-[300px]` : ``} border border-gray-200`}>
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

function Ruler({
  every: markEvery,
  max,
  maxWidthPx,
  labelWhen,
}: {
  every: number;
  max: number;
  maxWidthPx: number;
  labelWhen: (num: number) => boolean;
}) {
  const labels: number[] = [];
  for (let i = 0; i <= max; i += markEvery) {
    labels.push(i);
  }

  //TODO: make not selectable
  return (
    <div className="relative h-5 " style={{ width: maxWidthPx + 'px' }}>
      {labels.map((label) => (
        <div
          key={label}
          className={`
            absolute  transform -translate-x-1/2  bottom-0
            flex flex-col items-center  text-[0.55rem]
          `}
          style={{ left: (label / max) * 100 + '%' }}
        >
          {labelWhen(label) && <span>{label}</span>}
          <span className="text-[0.3rem]">|</span>
        </div>
      ))}
    </div>
  );
}
function FolderBar({
  cur,
  prev,
  maxMs,
  maxWidthPx,
}: {
  cur: FolderProps;
  prev: FolderProps | null;
  maxMs: number;
  maxWidthPx: number;
}) {
  const curWidthPx = safeDivide(cur.totalMs, maxMs) * maxWidthPx;
  const prevWidthPx = safeDivide(prev.totalMs, maxMs) * maxWidthPx;
  const better = cur.totalMs < prev.totalMs;
  return (
    <div className="flex items-center w-full h-4 relative">
      <div
        className={`border border-gray-400 absolute h-full rounded-r bg-gray-100 ${
          better ? 'z-20' : ''
        }`}
        style={{ width: curWidthPx }}
      ></div>

      {prev && (
        <div
          className={`border border-dashed border-gray-400 rounded-r absolute h-full

          ${better ? '' : 'z-20'}`}
          style={{ width: prevWidthPx }}
        ></div>
      )}
    </div>
  );
}

function FolderPad({ dir }: { dir: 'right' | 'down' | 'line' | 'none' }) {
  return (
    <div className="flex justify-center items-center w-5">
      {dir === 'right' && <IoChevronForward />}
      {dir === 'down' && <IoChevronDown />}
      {dir === 'line' && <div className="w-px h-full group-hover:border-l border-gray-200"></div>}
      {dir === 'none' && null}
    </div>
  );
}

const ICONS: Record<SpanType, React.ReactNode> = {
  route: <TbRouteAltRight />,
  middleware: <AiOutlineBranches />,
  db: <TbDatabase />,
  'promise-all': <TbBrackets />,
  'console-log': <TbLogs />,
  endpoint: <span>E</span>,
  root: <span>R</span>,
};

function FolderIcon({ type }: { type: SpanType }) {
  const accent: Record<SpanType, string> = {
    route: 'text-blue-600',
    middleware: 'text-purple-600',
    db: 'text-emerald-700',
    'promise-all': 'text-amber-600',
    'console-log': 'text-gray-600',
    endpoint: '',
    root: '',
  };

  return (
    <div
      className="
        h-4 w-4
        flex items-center justify-center
        text-[12px]
        text-gray-600
      "
      title={type}
    >
      <span className={accent[type]}>{ICONS[type]}</span>
    </div>
  );
}
function Folder({
  data: { cur, prev, subFolders, type },
  depth,
  maxMs,
  maxWidthPx,
}: {
  data: SpanFolder;
  depth: number;
  maxMs: number;
  maxWidthPx: number;
}) {
  const [isOpen, setIsOpen] = useState(true);

  const hasChildren = subFolders && subFolders.length > 0;
  const errorCount = Object.values(cur.errors).reduce((acc, curr) => acc + curr.count, 0);

  return (
    <>
      <tr className="text-xs">
        <td className="  border border-gray-200">
          <button
            className=" hover:bg-gray-100  w-full text-left flex"
            onClick={() => setIsOpen(!isOpen)}
          >
            {Array.from({ length: depth + 1 }).map((_, i) => {
              if (!hasChildren || i !== depth) return <FolderPad dir="line" />;
              return <FolderPad dir={isOpen ? 'down' : 'right'} />;
            })}

            <span className="py-1 flex gap-1">
              <FolderIcon type={type} /> {cur.snippet}
            </span>
            <FolderPad dir="none" />
          </button>
        </td>

        <td className="py-1 px-4 border border-gray-200">
          {cur.totalMs}ms
          {<span></span>}
        </td>

        <td className="py-1 border border-gray-200">
          <FolderBar cur={cur} prev={prev} maxMs={maxMs} maxWidthPx={maxWidthPx} />
        </td>

        <td className="py-1 px-4 border border-gray-200">{cur.count}</td>
        <td className="py-1 px-4 border border-gray-200">{errorCount}</td>
      </tr>
      {subFolders.map((folder, i) => (
        <Folder
          key={`${cur.snippet}-${i}`}
          data={folder}
          depth={depth + 1}
          maxMs={maxMs}
          maxWidthPx={maxWidthPx}
        />
      ))}
    </>
  );
}

function RawInfo() {
  let maxMs = 0;
  for (const folder of data.subFolders) {
    maxMs = Math.max(maxMs, folder.cur.totalMs, folder.prev?.totalMs ?? 0);
  }
  maxMs += 10;

  const maxWidthPx = 200;

  return (
    <div className="p-3 bg-white rounded flex-1 overflow-auto border border-gray-200">
      <h2 className="pb-6">Where does the time go?</h2>
      <table className="border-collapse">
        <thead>
          <tr className="text-xs text-left ">
            <th className="py-2 font-normal px-4 border border-gray-200 ">Code</th>
            <th className="py-2 font-normal px-4 border border-gray-200 ">Latency</th>
            <th className="pt-3 relative font-normal border border-gray-200 ">
              <Ruler
                every={5}
                max={maxMs}
                maxWidthPx={maxWidthPx}
                labelWhen={(num) => {
                  return num > 0 && num % 10 === 0 && num < maxMs - 5;
                }}
              />
            </th>
            <th className="py-2 font-normal px-4 border border-gray-200 ">Count</th>
            <th className="py-2 font-normal px-4 border border-gray-200 ">Errors</th>
          </tr>
        </thead>
        <tbody className="group">
          {data.subFolders.map((folder, i) => {
            return (
              <Folder
                key={`${folder.cur.snippet}-${i}`}
                data={folder}
                maxMs={maxMs}
                depth={0}
                maxWidthPx={maxWidthPx}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Nav() {
  return (
    <div className="p-2 w-full bg-white flex justify-between rounded  items-center border border-gray-200">
      <h1 className="font-bold">KRay</h1>
      <div></div>
    </div>
  );
}
