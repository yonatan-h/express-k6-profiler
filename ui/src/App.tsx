import React, { useEffect, useState } from 'react';
import { TbAlertTriangle, TbBrandVscode, TbBulb } from 'react-icons/tb';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { getDuration, humanNum, safeDivide } from '../../shared/big-utils';
import { IoChevronDown, IoChevronForward } from 'react-icons/io5';
import type { FolderProps, SpanFolder } from './front-types';
import { sampleDetails, data } from './samples';
import { TbBrackets, TbDatabase, TbLogs, TbRouteAltRight } from 'react-icons/tb';
import type { SpanType } from '../../shared/types';
import { AiOutlineBranches, AiOutlineVerticalAlignMiddle } from 'react-icons/ai';
import { FaCircle, FaSave, FaStop } from 'react-icons/fa';
import { MdOutlineStop, MdOutlineStopCircle } from 'react-icons/md';
import { IoMdArrowDropdown } from 'react-icons/io';

const path = window.location.pathname;
const BACKEND_PREFIX = `${window.location.origin}${path}${path.endsWith('/') ? '' : '/'}api`;

export default function App() {
  return (
    <div className="bg-gray-100 w-full h-screen p-3 flex flex-col gap-3 text-gray-900">
      <StatusBar />
      <TopSummary />
      <div className="flex-1 flex gap-3 min-h-0">
        <div className="flex-1 flex flex-col gap-3 min-h-0">
          <Results />
        </div>

        <Details
          filePath={sampleDetails.filePath}
          line={sampleDetails.line}
          code={sampleDetails.code}
          errors={sampleDetails.errors}
          snippet={'auth'}
          spanType={'middleware'}
        />
      </div>
    </div>
  );
}

function Recording() {
  const startTime = new Date().setHours(0, 0, 0, 0);
  const graphWidthPx = 100;
  const barWidthPx = 4;
  const maxBarHeight = 16 * 2;
  const shownReqs = Math.floor(graphWidthPx / barWidthPx);
  const [liveReqs, setLiveReqs] = useState(Array.from({ length: shownReqs }, () => 0));
  const [now, setNow] = useState(new Date().getTime());
  const totalReqs = 102938;
  useEffect(() => {
    setInterval(() => {
      setLiveReqs((prev) => {
        const newReqs = [...prev].slice(1);
        newReqs.push(Math.round(Math.random() * 100));
        return newReqs;
      });
    }, 1000);
  }, []);
  useEffect(() => {
    setInterval(() => {
      setNow(new Date().getTime());
    }, 333);
  }, []);
  // live requests and graph
  // minutes
  // total requests
  // stop button
  // cpu and ram usage
  //
  const dur = getDuration(now - startTime);
  const scaleHeight = maxBarHeight / Math.max(...liveReqs);
  return (
    <div className="flex  gap-6 items-center">
      <p className="flex gap-2 items-center">
        <div>
          <div className="rounded-full p-2 bg-red-100 flex justify-center items-center border border-red-200">
            <FaCircle className="text-red-600 " />
          </div>
        </div>
        <div className="flex flex-col justify-between">
          <span className="uppercase flex items-center text-xs text-gray-500">Recording</span>

          <span className="flex gap-px items-center ">
            {dur.hours > 0 && <span>{dur.hoursStr}:</span>}
            {<span>{dur.minutesStr}</span>}:{<span>{dur.secondsStr}</span>}
          </span>
        </div>
      </p>

      <div className="flex flex-col justify-between">
        <div className="flex items-end">
          {liveReqs.map((height, i) => {
            return (
              <div
                className=" bg-gray-200 border-t"
                key={i}
                style={{ width: barWidthPx + 'px', height: height * scaleHeight + 'px' }}
              />
            );
          })}
          <div className="h-full w-1 bg-red-300"></div>
        </div>
        <span className="text-gray-500 text-xs">{liveReqs[liveReqs.length - 1]} live requests</span>
      </div>

      <button className="h-full flex gap-1 items-center hover:border-gray-100 rounded">
        <FaStop className="text-gray-600" />
        Stop
      </button>
    </div>
  );
}

function DropDown() {
  const [isOpen, setIsOpen] = useState(false);

  const forCurrent = true;
  const options = [
    {
      id: 'hello1',
      title: 'Run #1',
      time: new Date().toString(),
      avgLatency: 120,
      totalReqs: 10234,
    },
    {
      id: 'hello2',
      title: 'Run #2',
      time: new Date().toString(),
      avgLatency: 84,
      totalReqs: 8421,
    },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded border border-gray-400 px-3 py-1  text-sm bg-white"
      >
        <div className="text-xs">
          <div>Run #1</div>
        </div>

        <IoMdArrowDropdown className="text-gray-500" />
      </button>

      {isOpen && (
        <div className="absolute mt-2 rounded shadow-md border border-gray-400 bg-white min-w-[500px] z-50">
          {forCurrent ? <p className="p-3">Select Run</p> : <p className="p-3">Select Baseline</p>}
          <hr className="border-gray-200" />
          {options.map((o) => {
            const dur = getDuration(Date.now() - new Date(o.time).getTime());

            return (
              <button key={o.id} className="w-full rounded px-3 py-1 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="">{o.title}</div>

                  <div className=" text-gray-500">
                    {dur.hours > 0 && `${dur.hours}h `}
                    {dur.minutes}m ago
                  </div>
                </div>

                <div className="flex gap-4 text-xs text-gray-500">
                  <span>{o.avgLatency}ms</span>
                  <span>{o.totalReqs.toLocaleString()} reqs</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
function Recorded() {
  const avgLatency = 120;
  const totalReqs = 10;
  const status = 'k6 Running';
  const liveReqs = 5;
  const avgCpu = 10;
  const avgRam = 10;
  return (
    <div className="flex gap-6 items-center">
      <div>
        <div className="flex flex-col gap-px items-center relative justify-center">
          <DropDown />
          <span className="text-xs text-gray-500 absolute z-50 bg-white  rounded-full ">vs</span>
          <DropDown />
        </div>
      </div>
      {/* <button className="h-full flex gap-1 items-center rounded py-2 px-3 bg-gray-600 text-white">
        <FaCircle className="text-white" />
        Start
      </button> */}

      <div className="flex flex-col text-xs">
        <span className="text-gray-500">Average Latency</span>
        <span className="">{avgLatency}ms (+120ms)</span>
      </div>

      <div className="flex flex-col text-xs">
        <span className="text-gray-500">Error Rate</span>
        <span className="">10% (-10%)</span>
      </div>

      <div className="flex flex-col text-xs">
        <span className="text-gray-500">Total Reqs</span>
        <span className="">100k (+502)</span>
      </div>
    </div>
  );
}

function StatusBar() {
  const liveReqs = 5;
  const avgRam = 50;
  const avgCpu = 50;
  const replicas = 50;
  return (
    <div className="text-xs w-full flex justify-between items-center">
      <h1 className="font-bold">KRay</h1>
      <div className=" flex gap-6 justify-end text-gray-600">
        <span className="uppercase">Status</span>
        <div className="h-4 w-px bg-gray-300"></div>
        <span>{liveReqs} Live Reqs</span>
        <span>{replicas} Replicas</span>
        <span>{avgCpu}% Avg CPU</span>
        <span>{avgRam}% Avg RAM</span>
      </div>
    </div>
  );
}

function TopSummary() {
  return (
    <div className=" border border-gray-200 rounded flex items-center justify-between gap-3 px-3 py-2 text-sm bg-white ">
      <Recording />
      {/* <Recorded /> */}
    </div>
  );
}

function Metric({ label, value, change }: { label: string; value: string; change?: string }) {
  return (
    <div className="flex flex-col text-xs">
      <span className="text-gray-500">{label}</span>
      <span className="">{value}</span>

      {change && <span className="">{change}</span>}
    </div>
  );
}

function Separator() {
  return <div className="h-full min-h-4 w-px bg-gray-200" />;
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
        className={`border border-gray-800 absolute h-full rounded-r bg-gray-200 ${
          better ? 'z-20' : ''
        }`}
        style={{ width: curWidthPx }}
      ></div>

      {prev && (
        <div
          className={`border border-dashed border-gray-900 rounded-r absolute h-full

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
        <td className="  border-y border-gray-200">
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

        <td className="py-1 px-4 border-y border-gray-200 text-gray-800">
          {cur.totalMs}ms
          {<span></span>}
        </td>

        <td className="py-1 border-y border-gray-200">
          <FolderBar cur={cur} prev={prev} maxMs={maxMs} maxWidthPx={maxWidthPx} />
        </td>

        <td className="py-1 px-4 border-y border-gray-200 text-gray-500">{cur.count}</td>
        <td className="py-1 px-4 border-y border-gray-200 text-gray-500">
          {errorCount ? (
            <span className="text-red-600 bg-red-50 px-1 rounded">{errorCount}</span>
          ) : (
            <span>-</span>
          )}
        </td>
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

function Results() {
  let maxMs = 0;
  for (const folder of data.subFolders) {
    maxMs = Math.max(maxMs, folder.cur.totalMs, folder.prev?.totalMs ?? 0);
  }
  maxMs += 10;

  const maxWidthPx = 300;
  const avgLatency = 200;
  const oldAvgLatency = 100;
  const samples = 100;
  const oldSamples = 100;
  const errorRate = 3;

  return (
    <div className="p-3 bg-white rounded flex-1 overflow-auto border border-gray-200">
      <div>
        <p>
          <span>{avgLatency}ms</span>
          <span>
            {oldAvgLatency > avgLatency
              ? '+' + (oldAvgLatency - avgLatency)
              : '-' + (avgLatency - oldAvgLatency)}
          </span>
          <span>AVG LATENCY</span>
        </p>
        <p>
          <span>{samples} (+200)</span>
          <span> requests sampled</span>
        </p>
      </div>
      <h2 className="pb-6">Where does the time go?</h2>
      <table className="border-collapse">
        <thead>
          <tr className="text-xs text-left text-gray-500 uppercase">
            <th className="py-2 font-normal px-4  border-gray-200 border-y ">Code</th>
            <th className="py-2 font-normal px-4  border-gray-200 border-y">Latency</th>
            <th className="pt-3 relative font-normal  border-gray-200 border-y">
              <Ruler
                every={5}
                max={maxMs}
                maxWidthPx={maxWidthPx}
                labelWhen={(num) => {
                  return num > 0 && num % 10 === 0 && num < maxMs - 5;
                }}
              />
            </th>
            <th className="py-2 font-normal px-4  border-gray-200 border-y">Count</th>
            <th className="py-2 font-normal px-4  border-gray-200 border-y">Errors</th>
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

function Details({
  snippet,
  spanType,
  code,
  line,
  filePath,
  errors,
}: {
  snippet: string;
  spanType: SpanType;
  code?: string;
  line?: number;
  filePath?: string;
  errors: Record<string, { count: number; message: string }>;
}) {
  const entries = Object.entries(errors);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto border rounded border-gray-200 bg-white flex flex-col gap-3">
      {/* header */}
      <div className="flex items-center gap-2 sticky top-0 bg-white p-3 border-b border-gray-200 ">
        <FolderIcon type={spanType} />
        <h2 className="font-medium">{snippet}</h2>
      </div>


      {/* errors */}
      {entries.length > 0 && (
        <div className="px-3">
          <div className="">Errors</div>

          <div className="">
            {entries.map(([code, err]) => (
              <div key={code}>
                <div className="flex items-center gap-2">
                  <TbAlertTriangle className="text-red-700" />

                  <span className="font-mono text-sm">{code}</span>
                  <span className="text-xs text-gray-500">×{err.count}</span>
                </div>

                <div className="ml-6 text-sm text-gray-700">{err.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* source */}
      {(filePath || code) && (
        <div className="px-3">
          <div className="">
            <div className="">Source</div>

            <div className="flex items-center justify-between gap-2">
              <div className="font-mono text-sm">
                {filePath}
                {line && `:${line}`}
              </div>
            </div>
          </div>

          {code && (
            <pre className="p-3 overflow-auto text-xs font-mono bg-gray-50">
              <code>{code}</code>
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function Confidence({ confidence }: { confidence: 'easy' | 'medium' | 'hard' | 'unknown' }) {
  const styles = {
    easy: 'text-emerald-700 bg-emerald-50',
    medium: 'text-amber-700 bg-amber-50',
    hard: 'text-red-700 bg-red-50',
    unknown: 'text-gray-600 bg-gray-100',
  };

  return (
    <div
      className={`
        px-1.5 py-[1px]
        rounded
        text-[10px]
        uppercase
        tracking-wide
        ${styles[confidence]}
      `}
    >
      {confidence}
    </div>
  );
}

function Nav() {
  return (
    <div className="p-2 w-full bg-white flex justify-between rounded  items-center border border-gray-200">
      <div></div>
    </div>
  );
}
