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
          <div className="flex-1 flex flex-col gap-3 min-h-0"> <Results />
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



function Nav() {
  return (
    <div className="p-2 w-full bg-white flex justify-between rounded  items-center border border-gray-200">
      <div></div>
    </div>
  );
}
