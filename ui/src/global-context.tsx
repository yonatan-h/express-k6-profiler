import React, { useEffect, useState } from 'react';
import { type Recording, type ResponseData } from '../../shared/types';
import { extr, makeRecording } from '../../shared/big-utils';
import type { RecordingExtra, StageType } from './ui-types';

//context
interface GlobalContextValue {
  recordings: Recording<RecordingExtra>[];
  responseDatas: ResponseData[];
  refreshRate: number;
  loading: boolean;
  fetchError: string | null;
  refreshIntervalMs: number;
  stage: StageType;
  startRecording: (title: string) => Promise<void>;
  getLastRecord: () => Recording<RecordingExtra> | undefined;
  stopRecording: () => void;
  editRecord: (partial: Recording<RecordingExtra> & { id: string }) => void;
  deleteRecord: (id: string) => void;
  baseRecord: null | Recording<RecordingExtra>;
  curRecord: null | Recording<RecordingExtra>;
  setBaseRecord: (id: string) => void;
  setCurRecord: (id: string) => void;
}

const defaultGlobalContext: GlobalContextValue = {
  recordings: [],
  responseDatas: [],
  refreshRate: -1,
  loading: false,
  fetchError: null,
  refreshIntervalMs: 0,
  stage: 'idle',
  startRecording: async () => {},
  getLastRecord: () => undefined,
  stopRecording: () => {},
  editRecord: () => {},
  deleteRecord: () => {},
  baseRecord: null,
  curRecord: null,
  setBaseRecord: () => {},
  setCurRecord: () => {},
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
  const [baseIndex, setBaseIndex] = useState<number>(-1);
  const [curIndex, setCurIndex] = useState<number>(-1);

  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const responseDatas = Object.values(responseDatasMap);
  const recordings = records;

  const getLast = (recordings: Recording<RecordingExtra>[]) => {
    const lastRecord: Recording<RecordingExtra> | undefined = recordings?.[recordings.length - 1];
    return lastRecord;
  };

  const refresh = async () => {
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

    setResponseDataMap(() => {
      const oldLength = Object.keys(responseDatas).length;
      const newLength = Object.keys(newResponseDatas).length;
      if (newLength !== oldLength) {
        if (newLength <= 0) {
          setRefreshRateMs(defaultRefreshRate);
        } else {
          setRefreshRateMs(defaultRefreshRate / newLength);
        }
      }
      return newResponseDatas;
    });

    setRecords((prevRecords) => {
      const lastRecord = getLast(prevRecords);
      if (lastRecord && lastRecord.endTimeMs === null) {
        const startTimeMs = lastRecord.startTimeMs;
        const nextRecords = prevRecords.slice(0, -1);
        return [
          ...nextRecords,
          makeRecording({
            ...lastRecord,
            responseDatas: newResponseDatas,
            startTimeMs,
            extra: {
              ...lastRecord.extra,
              liveRequests: [...lastRecord.extra.liveRequests, data.status.current.liveRequests],
            },
          }),
        ];
      }
      return prevRecords;
    });
  };

  const stopRecording = () => {
    const lastRecord = getLast(recordings);
    if (lastRecord?.endTimeMs === null) {
      const newLastRecord = makeRecording({ ...lastRecord, endTimeMs: new Date().getTime() });
      const newRecords = [...records.slice(0, -1), newLastRecord];
      setCurIndex(newRecords.length - 1);
      setRecords(newRecords);
    } else {
      console.log('no record to stop');
    }
  };

  const startRecording = async (title: string) => {
    const lastRecord = getLast(recordings);
    if (lastRecord?.endTimeMs === null) {
      lastRecord.endTimeMs = new Date().getTime();
    }

    const iters = Math.max(5, Object.values(responseDatasMap).length);
    await Promise.all(
      Array({ length: iters }).map(async () => {
        const res = await fetch(`${BACKEND_PREFIX}/reset`, { method: 'POST' });
        if (!res.ok) {
          const body = await res.json();
          const message = body?.error?.message || body?.error || res.statusText;
          throw new Error(message);
        }
      }),
    );
    const newRecord: Recording<RecordingExtra> = {
      id: new Date().getTime().toString(),
      title,
      responseDatas: {},
      extra: { liveRequests: [], userHasSaved: false },
      startTimeMs: new Date().getTime(),
      endTimeMs: null,
    };
    setRecords([...records, newRecord]);
  };

  const getStage = (): StageType => {
    const reqThres = 2;
    const last = getLast(recordings);
    const totalReqs = last ? extr.getRecordingInfo(last).totalRequests : -1;
    const isRecording = last?.endTimeMs === null || false;
    const hasRecordings = recordings.length > 0;

    if (isRecording && totalReqs >= reqThres) {
      return 'running-k6';
    } else if (isRecording && totalReqs < reqThres) {
      return 'listening';
    } else if (!hasRecordings) {
      return 'idle';
    } else if (hasRecordings && !isRecording && last?.extra.userHasSaved === true) {
      return 'view-results';
    } else if (hasRecordings && !isRecording && last?.extra.userHasSaved === false) {
      return 'saving';
    } else {
      console.error('Unknown State');
      return 'view-results';
    }
  };

  const editRecord = (partial: Recording<RecordingExtra> & { id: string }) => {
    const id = partial.id;
    const index = recordings.findIndex((r) => r.id === id);
    if (index === -1) {
      console.error(`Recording with id=${id} not found`);
      return;
    }

    const newRecordings = [...recordings];
    newRecordings[index] = makeRecording({
      ...recordings[index],
      ...partial,
    });
    setRecords(newRecordings);
  };

  const deleteRecord = (id: string) => {
    setRecords([...records].filter((r) => r.id !== id));
  };

  useEffect(() => {
    const interval = setInterval(refresh, refreshIntervalMs);
    refresh();
    return () => clearInterval(interval);
  }, [refreshIntervalMs, getStage()]);

  return (
    <GlobalContext.Provider
      value={{
        baseRecord: recordings[baseIndex] || null,
        setBaseRecord: (id: string) => setBaseIndex(records.findIndex((r) => r.id === id)),
        setCurRecord: (id: string) => setCurIndex(records.findIndex((r) => r.id === id)),
        curRecord: recordings[curIndex] || null,
        getLastRecord: () => getLast(recordings),
        startRecording,
        stopRecording,
        editRecord,
        deleteRecord,
        recordings,
        responseDatas,
        refreshRate: refreshIntervalMs,
        loading,
        fetchError,
        refreshIntervalMs,
        stage: getStage(),
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
}

export function useGContext() {
  return React.useContext(GlobalContext);
}
