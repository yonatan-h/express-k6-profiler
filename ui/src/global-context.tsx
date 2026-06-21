import React, { useEffect, useState } from 'react';
import {
  extr,
  makeRecording,
  safeDivide,
  type ReturnGetSpanTableData,
} from '../../shared/big-utils';
import { type ESpanTableData, type Recording, type ResponseData } from '../../shared/types';
import { get, K_BASE_I, K_CUR_I, K_RECORDS, K_RES, K_SELECTED_TD, set } from './storage';
import type { ESpanTableDataExtra, RecordingExtra, StageType } from './ui-types';

//context
interface GlobalContextValue {
  recordings: Recording<RecordingExtra>[];
  responseDatas: ResponseData[];
  loading: boolean;
  fetchError: string | null;
  stage: StageType;
  startRecording: (title: string) => Promise<void>;
  getLastRecord: () => Recording<RecordingExtra> | undefined;
  stopRecording: () => void;
  cancelRecording: () => void;
  editRecord: (partial: Recording<RecordingExtra> & { id: string }) => void;
  deleteRecord: (id: string) => void;
  baseRecord: null | Recording<RecordingExtra>;
  curRecord: null | Recording<RecordingExtra>;
  setBaseRecord: (id: string) => void;
  setCurRecord: (id: string) => void;
  tableData: null | ReturnGetSpanTableData<ESpanTableDataExtra>;
  selectedTableData: ESpanTableData<ESpanTableDataExtra> | null;
  selectTableData: (spanKey: string | null) => void;
}

const defaultGlobalContext: GlobalContextValue = {
  recordings: [],
  responseDatas: [],
  loading: false,
  fetchError: null,
  stage: 'idle',
  startRecording: async () => {},
  getLastRecord: () => undefined,
  stopRecording: () => {},
  cancelRecording: () => {},
  editRecord: () => {},
  deleteRecord: () => {},
  baseRecord: null,
  curRecord: null,
  setBaseRecord: () => {},
  setCurRecord: () => {},
  tableData: null,
  selectedTableData: null,
  selectTableData: () => {},
};
const GlobalContext = React.createContext<GlobalContextValue>(defaultGlobalContext);

//provider
const defaultRefRate = 1000;
const path = window.location.pathname;
const BACKEND_PREFIX = `${window.location.origin}${path}${path.endsWith('/') ? '' : '/'}api`;

export function GlobalContextProvider({ children }: { children: React.ReactNode }) {
  //core states that are saved in local storage
  const [records, setRecords] = useState<Recording<RecordingExtra>[]>(get(K_RECORDS, []));
  useEffect(() => set(K_RECORDS, records), [records]);

  const [resDatasMap, setResDatasMap] = useState<Record<string, ResponseData>>(get(K_RES, {}));
  useEffect(() => set(K_RES, resDatasMap), [resDatasMap]);

  const [baseIndex, setBaseIndex] = useState<number>(get(K_BASE_I, -1));
  useEffect(() => set(K_BASE_I, baseIndex), [baseIndex]);

  const [curIndex, setCurIndex] = useState<number>(get(K_CUR_I, -1));
  useEffect(() => set(K_CUR_I, curIndex), [curIndex]);

  const [selectedTDKey, setSelectedTDKey] = useState<string | null>(get(K_SELECTED_TD, null));
  useEffect(() => set(K_SELECTED_TD, selectedTDKey), [selectedTDKey]);
  //---

  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const recordings = records;
  const responseDatas = Object.values(resDatasMap);

  const baseRecord = recordings[baseIndex] || null;
  const curRecord = recordings[curIndex] || null;

  const tableData = curRecord
    ? extr.getSpanTableData(
        Object.values(curRecord.responseDatas),
        () => ({}),
        baseRecord.responseDatas ? Object.values(baseRecord.responseDatas) : [],
      )
    : null;
  const selectedTableData = tableData?.flatTable.find((td) => td.spanKey === selectedTDKey) || null;
  const selectTableData = (spanKey: string | null) => {
    if (spanKey && tableData && !tableData.flatTable.find((td) => td.spanKey === spanKey)) {
      console.error('could not set selected TD span key. not found. skipping');
      return;
    }
    setSelectedTDKey(spanKey);
  };

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
      if (!res.ok) throw new Error('API error');

      const data = (await res.json()) as ResponseData;
      const newResponseDatas = {
        ...resDatasMap,
        [data.backendId]: data,
      };

      setResDatasMap(newResponseDatas);

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
    } catch (error) {
      setFetchError('Failed to fetch recordings');
    } finally {
      setLoading(false);
      setTick((t) => t + 1);
    }
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

  const cancelRecording = () => {
    const lastRecord = getLast(recordings);
    if (lastRecord?.endTimeMs === null) {
      // Discard the currently active recording
      setRecords(records.slice(0, -1));
    }
  };

  const startRecording = async (title: string) => {
    const lastRecord = getLast(recordings);
    if (lastRecord?.endTimeMs === null) {
      lastRecord.endTimeMs = new Date().getTime();
    }

    const iters = Math.max(5, Object.values(resDatasMap).length);
    await Promise.all(
      Array.from({ length: iters }).map(async () => {
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
    const replicaCount = Object.values(resDatasMap).length;
    const ms = safeDivide(defaultRefRate, replicaCount) || defaultRefRate;
    const id = setTimeout(() => refresh(), ms);
    return () => clearTimeout(id);
  }, [tick]);

  return (
    <GlobalContext.Provider
      value={{
        curRecord,
        selectedTableData,
        selectTableData,
        baseRecord,
        tableData,
        setBaseRecord: (id: string) => setBaseIndex(records.findIndex((r) => r.id === id)),
        setCurRecord: (id: string) => setCurIndex(records.findIndex((r) => r.id === id)),
        getLastRecord: () => getLast(recordings),
        startRecording,
        stopRecording,
        cancelRecording,
        editRecord,
        deleteRecord,
        recordings,
        responseDatas,
        loading,
        fetchError,
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
