import React, { useState } from 'react';
import { ToastContainer } from 'react-toastify';
import { Details } from './components/details/Details';
import { TopSummary } from './components/record-bar/RecordBar';
import Results from './components/results/Results';
import { StatusBar } from './components/status-bar/StatusBar';
import { GlobalContextProvider } from './global-context';
import DebugLogsPopup from './components/common/DebugLogsPopup';

export default function App() {
  return (
    <GlobalContextProvider>
      <ToastContainer />
      <div className="bg-gray-100 w-full h-screen text-gray-900 overflow-hidden">
        <div className="max-w-[1400px] mx-auto w-full h-full p-3 flex flex-col gap-3">
          <StatusBar />
          <TopSummary />

          <div className="flex-1 flex gap-3 min-h-0">
            <div className="flex-1 flex flex-col gap-3 min-h-0">
              <Results />
            </div>

            <Details />
          </div>
          <DebugLogsPopup />
        </div>
      </div>
    </GlobalContextProvider>
  );
}
