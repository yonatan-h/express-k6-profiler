import { useEffect, useRef, useState } from 'react';
import { IoMdArrowDropdown } from 'react-icons/io';
import { extr, humanNum } from '../../../../shared/big-utils';
import { useGContext } from '../../global-context';
import StartCaptureButton from './StartCaptureButton';
import { type Recording } from '../../../../shared/types';
import { type RecordingExtra } from '../../ui-types';

export function ResultStage() {
  const c = useGContext();
  return (
    <div className="w-full flex flex-col gap-3">
      <div className="flex justify-between items-center w-full">
        <div className="flex gap-6 items-center">
          {c.recordings.length > 1 && (
            <div className="flex gap-3 items-center  justify-center">
              <span>Compare</span>
              <DropDown type="cur" />
              <span className="text-xs text-gray-500 bg-white  rounded-full ">vs</span>
              <DropDown type="base" />
            </div>
          )}

          {c.recordings.length === 1 && <DropDown type="cur" />}
        </div>

        <StartCaptureButton text="Start Capturing" primary={false} />
      </div>
    </div>
  );
}

function DropDown({ type }: { type: 'cur' | 'base' }) {
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
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded border border-gray-400 px-3 py-1  text-sm bg-white"
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
              className="w-full text-start rounded px-3 py-1 hover:bg-gray-100 transition-colors text-gray-600"
              onClick={() => {
                c.setBaseRecord(null);
                setIsOpen(false);
              }}
            >
              <span>None (unselect)</span>
            </button>
          )}

          {c.recordings.map((recording) => {
            const info = extr.getRecordingInfo(recording);
            return (
              <button
                key={recording.id}
                className="w-full text-start rounded px-3 py-1 hover:bg-gray-100 transition-colors"
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
                  <div className="">{recording.title}</div>

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
