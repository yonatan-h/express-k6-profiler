import React, { useEffect, useState } from 'react';
import {
  extr,
  makeRecording,
  safeDivide,
  type ReturnGetSpanTableData,
} from '../../shared/big-utils';
import { type ESpanTableData, type Recording, type ResponseData } from '../../shared/types';
import {
  get,
  K_ACTIVE_RECORD,
  K_BASE_I,
  K_CUR_I,
  K_RECORDS,
  K_RES,
  K_SELECTED_TD,
  set,
} from './storage';
import type { DebugError, ESpanTableDataExtra, RecordingExtra, StageType } from './ui-types';

//context
interface GlobalContextValue {
  recordings: Recording<RecordingExtra>[];
  responseDatas: ResponseData[];
  debugErrors: { total: number; errors: DebugError[] };
  loading: boolean;
  fetchError: string | null;
  stage: StageType;
  startRecording: (title: string) => Promise<void>;
  getActiveRecording: () => Recording<RecordingExtra>;
  stopRecording: () => void;
  cancelRecording: () => void;
  saveRecording: (partial: Partial<Recording<RecordingExtra>>) => void;
  editRecord: (partial: Partial<Recording<RecordingExtra>> & { id: string }) => void;
  deleteRecord: (id: string) => void;
  baseRecord: null | Recording<RecordingExtra>;
  curRecord: null | Recording<RecordingExtra>;
  setBaseRecord: (id: string | null) => void;
  setCurRecord: (id: string | null) => void;
  tableData: null | ReturnGetSpanTableData<ESpanTableDataExtra>;
  selectedTableData: ESpanTableData<ESpanTableDataExtra> | null;
  selectTableData: (spanKey: string | null) => void;
}

const defaultGlobalContext: GlobalContextValue = {
  recordings: [],
  responseDatas: [],
  debugErrors: { total: 0, errors: [] },
  loading: false,
  fetchError: null,
  stage: 'idle',
  startRecording: async () => {},
  getActiveRecording: () => ({}) as any,
  stopRecording: () => {},
  cancelRecording: () => {},
  saveRecording: () => {},
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
  const makeAmbientRecording = (): Recording<RecordingExtra> => {
    return makeRecording({
      startTimeMs: new Date().getTime(),
      endTimeMs: null,
      extra: { requestsPerSec: [], userHasSaved: false, isAmbient: true },
    });
  };

  const [savedRecords, setSavedRecords] = useState<Recording<RecordingExtra>[]>(get(K_RECORDS, []));
  useEffect(() => set(K_RECORDS, savedRecords), [savedRecords]);

  const [activeRecording, setActiveRecording] = useState<Recording<RecordingExtra>>(
    get(K_ACTIVE_RECORD, makeAmbientRecording()),
  );
  useEffect(() => set(K_ACTIVE_RECORD, activeRecording), [activeRecording]);

  const [baseId, setBaseId] = useState<string | null>(get(K_BASE_I, null));
  useEffect(() => set(K_BASE_I, baseId), [baseId]);

  const [curId, setCurId] = useState<string | null>(get(K_CUR_I, null));
  useEffect(() => set(K_CUR_I, curId), [curId]);

  const [selectedTDKey, setSelectedTDKey] = useState<string | null>(get(K_SELECTED_TD, null));
  useEffect(() => set(K_SELECTED_TD, selectedTDKey), [selectedTDKey]);
  //---

  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const debugErrors = extr.getDebugErrors(activeRecording.responseDatas);

  const getStage = (): StageType => {
    const reqThres = 2;
    const totalReqs = extr.getRecordingInfo(activeRecording).totalRequests;
    const isRecording = activeRecording.endTimeMs === null && !activeRecording.extra.isAmbient;

    if (isRecording && totalReqs >= reqThres) {
      return 'running-k6';
    } else if (isRecording && totalReqs < reqThres) {
      return 'listening';
    } else if (
      activeRecording.endTimeMs !== null &&
      !activeRecording.extra.isAmbient &&
      !activeRecording.extra.userHasSaved
    ) {
      return 'saving';
    } else if (activeRecording.extra.isAmbient && savedRecords.length > 0) {
      return 'view-results';
    } else if (activeRecording.extra.isAmbient) {
      return 'idle';
    } else {
      console.error('unknown state');
      return 'idle';
    }
  };

  const stage = getStage();

  let baseRecord = savedRecords.find((r) => r.id === baseId) || null;
  let curRecord =
    savedRecords.find((r) => r.id === curId) ||
    (curId === activeRecording.id ? activeRecording : null);

  // If we haven't selected anything yet, default curRecord to the most recent saved, or active
  if (!curRecord && curId === null) {
    curRecord = savedRecords.length > 0 ? savedRecords[savedRecords.length - 1] : activeRecording;
  }

  if (stage !== 'view-results') {
    curRecord = activeRecording;
    baseRecord = null;
  }

  if (curRecord?.id === activeRecording.id) {
    baseRecord = null;
  }

  const getTableData = (): ReturnGetSpanTableData<ESpanTableDataExtra> | null => {
    if (!curRecord) return null;
    return extr.getSpanTableData(
      Object.values(curRecord.responseDatas),
      () => ({}),
      baseRecord?.responseDatas ? Object.values(baseRecord.responseDatas) : undefined,
    );
  };

  const tableData = getTableData();

  const selectedTableData = tableData?.flatTable.find((td) => td.spanKey === selectedTDKey) || null;
  const selectTableData = (spanKey: string | null) => {
    if (spanKey && tableData && !tableData.flatTable.find((td) => td.spanKey === spanKey)) {
      console.error('could not set selected TD span key. not found. skipping');
      return;
    }
    setSelectedTDKey(spanKey);
  };

  const refresh = async () => {
    let res: any;
    try {
      setLoading(true);
      setFetchError(null);
      res = await fetch(`${BACKEND_PREFIX}/all`);
      if (!res.ok) throw new Error('API error');
      const data = (await res.json()) as ResponseData;
      setActiveRecording((prev) => {
        if (prev.endTimeMs !== null) return prev; // stopped, don't update
        return makeRecording({
          ...prev,
          responseDatas: {
            ...prev.responseDatas,
            [data.backendId]: data,
          },
          extra: {
            ...prev.extra,
            requestsPerSec: [...prev.extra.requestsPerSec, data.status.current.requestsPerSec],
          },
        });
      });
    } catch (error) {
      setFetchError('Failed to fetch recordings');
    } finally {
      setLoading(false);
      setTick((t) => t + 1);
    }
  };

  const stopRecording = () => {
    if (activeRecording.endTimeMs === null && !activeRecording.extra.isAmbient) {
      setActiveRecording((prev) => makeRecording({ ...prev, endTimeMs: new Date().getTime() }));
    } else {
      console.error('no record to stop');
    }
  };

  const cancelRecording = () => {
    if (!activeRecording.extra.isAmbient) {
      setActiveRecording((prev) =>
        makeRecording({
          ...prev,
          endTimeMs: null,
          extra: { ...prev.extra, isAmbient: true },
        }),
      );
    }
  };

  const saveRecording = (partial: Partial<Recording<RecordingExtra>>) => {
    if (!activeRecording.extra.isAmbient && activeRecording.endTimeMs !== null) {
      const updated = makeRecording({
        ...activeRecording,
        ...partial,
        extra: { ...activeRecording.extra, userHasSaved: true },
      });
      setSavedRecords((prev) => [...prev, updated]);
      setCurId(updated.id);
      if (baseId === null && savedRecords.length > 0) {
        setBaseId(savedRecords[savedRecords.length - 1].id);
      }
      setActiveRecording(makeAmbientRecording());
    } else {
      console.error('cant save');
    }
  };

  const startRecording = async (title: string) => {
    const iters = Math.max(5, Object.values(activeRecording.responseDatas).length);
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
    setActiveRecording(
      makeRecording({
        id: new Date().getTime().toString(),
        title,
        responseDatas: {},
        extra: { requestsPerSec: [], userHasSaved: false, isAmbient: false },
        startTimeMs: new Date().getTime(),
        endTimeMs: null,
      }),
    );
  };

  const editRecord = (partial: Partial<Recording<RecordingExtra>> & { id: string }) => {
    const id = partial.id;

    const index = savedRecords.findIndex((r) => r.id === id);
    if (index === -1) {
      console.error(`Recording with id=${id} not found`);
      return;
    }

    const newRecordings = [...savedRecords];
    newRecordings[index] = makeRecording({
      ...savedRecords[index],
      ...partial,
    });
    setSavedRecords(newRecordings);
  };

  const deleteRecord = (id: string) => {
    setSavedRecords([...savedRecords].filter((r) => r.id !== id));
  };

  useEffect(() => {
    const replicaCount = Object.values(activeRecording.responseDatas).length;
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
        setBaseRecord: setBaseId,
        setCurRecord: (id: string | null) => {
          setCurId(id);
          if (id === activeRecording.id) {
            setBaseId(null);
          }
        },
        getActiveRecording: () => activeRecording,
        startRecording,
        stopRecording,
        cancelRecording,
        saveRecording,
        editRecord,
        deleteRecord,
        recordings: [...savedRecords].sort((a, b) => -(a.endTimeMs || 0) + (b.endTimeMs || 0)),
        responseDatas: Object.values(activeRecording.responseDatas),
        debugErrors,
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
