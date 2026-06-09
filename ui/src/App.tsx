import React, { useState } from 'react';
import { ToastContainer } from 'react-toastify';
import { Details } from './components/details/Details';
import { TopSummary } from './components/record-bar/RecordBar';
import Results from './components/results/Results';
import { StatusBar } from './components/status-bar/StatusBar';
import { GlobalContextProvider } from './global-context';

export default function App() {
  return (
    <GlobalContextProvider>
      <ToastContainer />
      <div className="bg-gray-100 w-full h-screen p-3 flex flex-col gap-3 text-gray-900">
        <StatusBar />
        <TopSummary />

        <div className="flex-1 flex gap-3 min-h-0">
          <div className="flex-1 flex flex-col gap-3 min-h-0">
            <Results />
          </div>

          <Details />
        </div>
      </div>
    </GlobalContextProvider>
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
