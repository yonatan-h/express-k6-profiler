import { useEffect, useState } from 'react';
import { getChartData } from './convert';
import type { ResponseData } from '../../shared-types';
import { SystemInfoHeader } from './components/system-info-header/SystemInfoHeader';
import { getPrevBackendState, storePrevBackendState } from './comparison-storage';
import type { ChartData, ChartSpanType } from './frontend-data-types';
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

  const chart = getChartData(currentBackends, {});
  return (
    <div className="p-4 h-screen max-w-[1200px] px-[100px] m-auto flex flex-col gap-6 border-x-1 border-gray-100">
      <div>
        <h1 className="text-4xl font-bold">KRay</h1>
        <p>Find hidden latency in your Express</p>
      </div>
      <button onClick={() => saveState()}>Save State</button>
      <SystemInfoHeader requestsTimeSeries={requestsTimeSeries} chart={chart} />
      {/* <pre>{JSON.stringify(chart, null, 2)}</pre> */}
      <EndpointsAndContributors chart={chart} />
    </div>
  );
}
