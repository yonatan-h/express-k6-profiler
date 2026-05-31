import React, { useState } from 'react';
import { useGContext } from '../../global-context';
import { CgSpinner } from 'react-icons/cg';
import { FaCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';

export default function StartCaptureButton({ text, primary }: { text: string; primary: boolean }) {
  const c = useGContext();

  const [loading, setLoading] = useState(false);
  return (
    <button
      onClick={async () => {
        setLoading(true);
        try {
          await c.startRecording(`Run #${c.recordings.length + 1}`);
        } catch (e: any) {
          toast.error(`Please try again.\n${e?.message}`, {});
        } finally {
          setLoading(false);
        }
      }}
      className={`
          flex items-center gap-2 py-1 px-3 rounded 
          ${primary ? 'bg-gray-700 text-white' : 'border-gray-300 border hover:bg-gray-50'}
          `}
    >
      {loading ? <CgSpinner className="animate-sping" /> : <FaCircle className="w-2" />}
      <span>{text}</span>
    </button>
  );
}
