import React, { useEffect, useState } from 'react';
import { type Recording, type ResponseData } from '../../shared/types';
import { extr, makeRecording } from '../../shared/big-utils';
import type { RecordingExtra } from './ui-types';

//context
interface GlobalContextValue {
  recordings: Recording<RecordingExtra>[];
  responseDatas: ResponseData[];
  refreshRate: number;
  loading: boolean;
  fetchError: string | null;
  refreshIntervalMs: number;
}

const defaultGlobalContext: GlobalContextValue = {
  recordings: [],
  responseDatas: [],
  refreshRate: -1,
  loading: false,
  fetchError: null,
  refreshIntervalMs: 0,
};

const GlobalContext = React.createContext<GlobalContextValue>(defaultGlobalContext);

//provider
const defaultRefreshRate = 1000;
const path = window.location.pathname;
const BACKEND_PREFIX = `${window.location.origin}${path}${path.endsWith('/') ? '' : '/'}api`;

export function GlobalContextProvider({ children }: { children: React.ReactNode }) {
  const [records, setRecords] = useState<Recording<RecordingExtra>[]>([]);
  const [responseDatasMap, setResponseDataMap] = useState<Record<string, ResponseData>>({});
  const [refreshIntervalMs, setRefreshRateMs] = useState(defaultRefreshRate);

  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const responseDatas = Object.values(responseDatasMap);
  const recordings = records;

  useEffect(() => {
    const interval = setInterval(async () => {
      let res: any;
      try {
        setLoading(true);
        setFetchError(null);
        res = await fetch(`${BACKEND_PREFIX}/all`);
      } catch (error) {
        setFetchError('Failed to fetch recordings');
        return;
      }

      const data = (await res.json()) as ResponseData;
      const newResponseDatas = {
        ...responseDatasMap,
        [data.backendId]: data,
      };

      setResponseDataMap(newResponseDatas);
      const oldLength = Object.keys(responseDatasMap).length;
      const newLength = Object.keys(newResponseDatas).length;
      if (newLength != oldLength) {
        if (newLength <= 0) {
          setRefreshRateMs(defaultRefreshRate);
        } else {
          setRefreshRateMs(defaultRefreshRate / newLength);
        }
      }

      const lastRecord: undefined | Recording<RecordingExtra> = records[records.length - 1];

      if (lastRecord && extr.getRecordingInfo(lastRecord).recording) {
        const newRecords = [...records];
        newRecords.pop();

        setRecords([
          ...newRecords,
          makeRecording({
            ...lastRecord,
            extra: {
              liveRequests: [...lastRecord.extra.liveRequests, data.status.current.liveRequests],
            },
          }),
        ]);
      }
    }, refreshIntervalMs);
    return () => clearInterval(interval);
  }, [refreshIntervalMs]);

  return (
    <GlobalContext.Provider
      value={{
        recordings,
        responseDatas,
        refreshRate: refreshIntervalMs,
        loading,
        fetchError,
        refreshIntervalMs,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
}

export function useGContext() {
  return React.useContext(GlobalContext);
}
