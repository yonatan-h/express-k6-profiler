import { useEffect, useRef, useState } from 'react';
import { useGContext } from '../../global-context';
import { makeRecording } from '../../../../shared/big-utils';
import type { RecordingExtra } from '../../ui-types';

export function SaveLastRecordingModal() {
  const c = useGContext();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const lastRecord =
    c.getLastRecord() ||
    makeRecording<RecordingExtra>({ extra: { liveRequests: [0], userHasSaved: false } });

  const [title, setTitle] = useState(lastRecord?.title || '');

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log('hello');
    c.editRecord({ ...lastRecord, title, extra: { ...lastRecord.extra, userHasSaved: true } });
  };

  const handleCancel = () => {
    c.deleteRecord(lastRecord.id);
  };

  useEffect(() => {}, []);

  return (
    <>
      {<div className="bg-black opacity-50 fixed top-0 bottom-0 left-0 right-0 z-10"></div>}
      <dialog
        open
        className="border border-gray-300 p-3 rounded fixed top-1/3 z-20 m-auto min-w-[300px]"
      >
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <h2 className="font-bold">Save Capture</h2>

          <div className="flex flex-col gap-2">
            <label className="text-xs" htmlFor="run-title">
              Title
            </label>
            <input
              id="run-title"
              ref={inputRef}
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="outline-0 border p-2 rounded border-gray-700"
              placeholder="Enter title"
            />
          </div>

          <div className="flex gap-3 ">
            <button
              type="button"
              onClick={handleCancel}
              className="border-gray-300 border rounded py-1 px-3"
            >
              Cancel
            </button>
            <button type="submit" className="bg-gray-700 text-white py-1 px-3 rounded">
              Save
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
