import React, { useState } from 'react';
import { useGContext } from '../../global-context';

export default function DebugLogsPopup() {
  const {
    debugErrors: { total, errors },
  } = useGContext();
  const [isOpen, setIsOpen] = useState(false);

  if (total === 0) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 left-4 bg-white border border-gray-700 rounded px-2 text-xs  "
      >
        Debug Errors ({total})
      </button>

      {isOpen && (
        <div className="fixed bottom-12 left-4 w-1/2 h-[50vh] overflow-auto bg-white border rounded p-2 text-xs font-mono shadow z-9999">
          <div className="flex justify-end">
            <button onClick={() => setIsOpen(false)} className="underline mb-2 font-bold">
              Close
            </button>
          </div>
          {errors.map((err, i) => (
            <div key={i} className="mb-2 border-b border-black pb-2">
              <div>
                <span className="font-bold">{err.backendId}</span> –{' '}
                {new Date(err.lastTimestampMs).toLocaleTimeString()}
                {err.count > 1 && <span> (×{err.count})</span>}
              </div>
              <div className="font-bold">{err.message}</div>
              <pre className="whitespace-pre-wrap">{err.trace}</pre>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
