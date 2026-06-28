import { useEffect, useRef, useState } from 'react';
import { IoMdArrowDropdown, IoMdClose } from 'react-icons/io';
import { extr, humanNum } from '../../../../shared/big-utils';
import { useGContext } from '../../global-context';
import StartCaptureButton from './StartCaptureButton';
import { type Recording } from '../../../../shared/types';
import { type RecordingExtra } from '../../ui-types';

export default function DropDown({ type }: { type: 'cur' | 'base' }) {
  const [isOpen, setIsOpen] = useState(false);
  const c = useGContext();
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  let record: Recording<RecordingExtra> | null = null;
  if (type === 'cur') {
    record = c.curRecord;
  } else {
    record = c.baseRecord;
  }

  const idleInfo = extr.getRecordingInfo(c.getActiveRecording());

  return (
    <div ref={dropdownRef} className="relative">
      <button
        disabled={type === 'base' && c.curRecord?.extra.isAmbient}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 rounded border ${type === 'base' ? 'border-gray-200' : 'border-gray-400 border-2'} px-3 py-1  text-sm bg-white disabled:text-gray-500 disabled:opacity-50`}
      >
        <div className="text-xs">
          <div>
            {type === 'base' && record?.title}
            {type === 'base' && !record && 'None'}
            {type === 'cur' && !record && 'Choose'}
            {type === 'cur' && record?.extra.isAmbient && 'Idle Capture'}
            {type === 'cur' && !record?.extra.isAmbient && record?.title}
          </div>
        </div>

        <IoMdArrowDropdown className="text-gray-500" />
      </button>

      {isOpen && (
        <div className="absolute mt-2 rounded  border border-gray-400 bg-white min-w-[400px] z-50 flex flex-col gap-3 max-h-[70vh] overflow-y-auto">
          <p className="px-3 pt-3 text-sm">
            Select
            {type === 'cur' && <span> Current</span>}
            {type === 'base' && <span> Baseline</span>}
          </p>
          <hr className="border-gray-200" />

          {type === 'base' && (
            <button
              className="w-full text-start rounded px-3 py-1 border border-transparent text-gray-500 italic"
              onClick={() => {
                c.setBaseRecord(null);
                setIsOpen(false);
              }}
            >
              <span>None (unselect)</span>
            </button>
          )}

          {type === 'cur' && c.getActiveRecording().extra.isAmbient && (
            <button
              className="w-full text-start rounded px-3 py-1 text-gray-500"
              onClick={() => {
                c.setCurRecord(c.getActiveRecording().id);
                setIsOpen(false);
              }}
            >
              <span className="italic">Idle Capture</span>

              <div className="flex gap-1 text-xs text-gray-500">
                <div className="flex items-center gap-1 font-bold">
                  <span>Live</span>
                </div>
                |<span>{idleInfo.totalRequests} Requests</span> |
                <span>
                  {humanNum(
                    extr.kpiWithChanges(Object.values(idleInfo.recording.responseDatas)).avgLatency
                      .cur,
                  )}
                  ms Latency
                </span>
              </div>
            </button>
          )}

          {c.recordings.map((recording) => {
            const info = extr.getRecordingInfo(recording);
            return (
              <button
                key={recording.id}
                className={`w-full text-start rounded px-3 py-1 transition-colors`}
                onClick={() => {
                  if (type === 'cur') {
                    c.setCurRecord(recording.id);
                  } else if (type === 'base') {
                    c.setBaseRecord(recording.id);
                  }
                  setIsOpen(false);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">{recording.title}</div>

                  <button
                    className="p-1 hover:bg-gray-200 hover:text-red-600 rounded transition-colors text-gray-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      c.deleteRecord(recording.id);
                    }}
                    title="Delete recording"
                  >
                    <IoMdClose />
                  </button>
                </div>

                <div className="flex gap-1 text-xs text-gray-500">
                  <div className="flex items-center gap-1 font-bold">
                    {info.ago.days > 0 && ` ${info.ago.daysStr}d`}
                    {info.ago.days <= 0 && info.ago.hours > 0 && ` ${info.ago.hours}h`}
                    {info.ago.days <= 0 && ` ${info.ago.minutes}m`}
                    <span> ago</span>
                  </div>{' '}
                  |
                  <span>
                    {humanNum(
                      extr.kpiWithChanges(Object.values(recording.responseDatas)).avgLatency.cur,
                    )}
                    ms Latency
                  </span>
                  |<span>{info.totalRequests} Requests</span>
                </div>
              </button>
            );
          })}

          <hr className="border-gray-200" />
          <div className="px-2 pb-3">
            <StartCaptureButton text="Capture New" primary={false} />
          </div>
        </div>
      )}
    </div>
  );
}
