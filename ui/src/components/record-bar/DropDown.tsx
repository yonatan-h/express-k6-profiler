import { useEffect, useRef, useState } from 'react';
import { IoMdArrowDropdown } from 'react-icons/io';
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

  return (
    <div ref={dropdownRef} className="relative">
      <button
        disabled={type === 'base' && c.curRecord?.extra.isAmbient}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded border border-gray-400 px-3 py-1  text-sm bg-white disabled:text-gray-500 disabled:opacity-50"
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
        <div className="absolute mt-2 rounded shadow-md border border-gray-400 bg-white min-w-[300px] z-50">
          <p className="p-3 text-sm">
            Select
            {type === 'cur' && <span> Current</span>}
            {type === 'base' && <span> Baseline</span>}
          </p>
          <hr className="border-gray-200" />

          {type === 'base' && (
            <button
              className="w-full text-start rounded px-3 py-1 border border-transparent hover:border-gray-300 transition-colors text-gray-500 italic"
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
              className="w-full text-start rounded px-3 py-1 text-gray-500 italic"
              onClick={() => {
                c.setCurRecord(c.getActiveRecording().id);
                setIsOpen(false);
              }}
            >
              <span>Idle Capture</span>

              <div className="flex gap-1 text-xs text-gray-500">
                <span>{extr.getRecordingInfo(c.getActiveRecording()).totalRequests} Captured</span>{' '}
                |
                <span>
                  {humanNum(
                    extr.kpiWithChanges(Object.values(c.getActiveRecording().responseDatas))
                      .avgLatency.cur,
                  )}
                  ms
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
                  <div>{recording.title}</div>

                  <div className=" text-gray-500">
                    {info.ago.days > 0 && ` ${info.duration.daysStr}d`}
                    {info.ago.days <= 0 && info.ago.hours > 0 && ` ${info.duration.hours}h`}
                    {info.ago.days <= 0 && ` ${info.duration.minutes}m`}
                    <span> ago</span>
                  </div>
                </div>

                <div className="flex gap-1 text-xs text-gray-500">
                  <span>{info.totalRequests} Captured</span> |
                  <span>
                    {humanNum(
                      extr.kpiWithChanges(Object.values(recording.responseDatas)).avgLatency.cur,
                    )}
                    ms
                  </span>
                </div>
              </button>
            );
          })}

          <hr className="border-gray-200" />
          <div className="px-2 pt-2 pb-2">
            <StartCaptureButton text="Capture New" primary={false} />
          </div>
        </div>
      )}
    </div>
  );
}
