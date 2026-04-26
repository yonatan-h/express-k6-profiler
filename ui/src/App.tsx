import { useEffect, useState } from 'react';
import { getChartData } from './convert';
import type { ResponseData } from '../../shared-types';
import { SystemInfoHeader } from './components/system-info-header/SystemInfoHeader';
import { getPrevBackendState, storePrevBackendState } from './comparison-storage';
import { EndpointsAndContributors } from './components/endpoints-and-contributors/EndpointsAndContributors';

const path = window.location.pathname;
const BACKEND_PREFIX = `${window.location.origin}${path}${path.endsWith('/') ? '' : '/'}api`;

export default function App() {
  const [prevBackends, setPrevBackends] = useState<Record<string, ResponseData>>({});
  const [currentBackends, setCurrentBackends] = useState<Record<string, ResponseData>>({});
  const [requestsTimeSeries, setRequestsTimeSeries] = useState<
    { timestamp: number; requests: number }[]
  >([]);

  const restorePrevBackends = () => {
    setPrevBackends(getPrevBackendState());
  };

  useEffect(() => {
    restorePrevBackends();
  }, []);

  useEffect(() => {
    const id = setInterval(async () => {
      // Because we injected a <base> tag in development, relative fetches would hit 3011.
      // So we explicitly construct the absolute URL to ensure we hit the 3010 backend securely.
      try {
        const res = await fetch(`${BACKEND_PREFIX}/all`);
        const data: ResponseData = await res.json();
        const newBackend = { ...currentBackends };
        newBackend[data.backendId] = data;
        setCurrentBackends(newBackend);
        setRequestsTimeSeries((prev) => [
          ...prev,
          { timestamp: Date.now(), requests: data.currentInfo.liveRequests },
        ]);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      }
    }, 1000);

    return () => clearInterval(id);
  }, []);

  const saveState = async () => {
    try {
      await fetch(`${BACKEND_PREFIX}/reset`);
      storePrevBackendState(currentBackends);
      restorePrevBackends();
    } catch (e) {
      alert('could not store');
    }
  };

  const chart = getChartData(currentBackends, prevBackends);
  const hasPrev = Object.keys(prevBackends).length > 0;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* ── Top Nav — compact h-10 ── */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[1200px] mx-auto px-6 h-10 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <h1 className="text-base font-bold tracking-tight text-gray-900">KRay</h1>
            <span className="text-[11px] text-gray-400 hidden sm:block">Express latency profiler</span>
          </div>
          <button
            onClick={() => saveState()}
            title={hasPrev ? 'Save current data as the new baseline and reset counters' : 'Save current data as a baseline to compare against'}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all bg-gray-900 text-white hover:bg-gray-700 active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/>
            </svg>
            {hasPrev ? 'New Baseline' : 'Set Baseline'}
          </button>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 max-w-[1200px] mx-auto w-full px-6 py-3 flex flex-col gap-3">
        <SystemInfoHeader requestsTimeSeries={requestsTimeSeries} chart={chart} />

        {/* Verdict — single compact strip, only when comparing */}
        {hasPrev && chart.prevLatency > 0 && (() => {
          const deltaMs = chart.latency - chart.prevLatency;
          const deltaPct = Math.abs((deltaMs / chart.prevLatency) * 100).toFixed(1);
          const improved = deltaMs < 0;
          return (
            <div className={`rounded-lg px-4 h-9 flex items-center gap-3 border text-xs ${improved ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
              <span>{improved ? '🎉' : '📈'}</span>
              <span className={`font-semibold ${improved ? 'text-emerald-700' : 'text-red-700'}`}>
                {improved
                  ? `Saved ${Math.abs(deltaMs).toFixed(0)}ms — ${deltaPct}% faster than baseline`
                  : `${Math.abs(deltaMs).toFixed(0)}ms slower than baseline (+${deltaPct}%)`}
              </span>
              <span className="text-gray-400 ml-auto">
                {chart.latency.toFixed(0)}ms now · was {chart.prevLatency.toFixed(0)}ms
              </span>
            </div>
          );
        })()}

        <EndpointsAndContributors chart={chart} />
      </main>
    </div>
  );
}


