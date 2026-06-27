import { useState } from 'react';
import { FiCheck, FiCopy } from 'react-icons/fi';
import { useGContext } from '../../global-context';
import { extr } from '../../../../shared/big-utils';

const K6_CMD = 'k6 run mytest.js';

export default function ListeningInstructions() {
  const c = useGContext();
  const [copied, setCopied] = useState(false);

  const reqCount = extr.getRecordingInfo(c.getActiveRecording())?.totalRequests || 0;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(K6_CMD);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="pt-6 flex flex-col gap-8">
      <div className="flex gap-4">
        <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center font-semibold text-sm ">
          1
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <h2 className="text-lg font-semibold">Run your k6 test in another terminal</h2>
          </div>

          <div className="flex items-center gap-2 bg-[#0c0c0c] text-[#f9f1a5] px-3 py-3 rounded font-mono text-sm max-w-[400px]">
            <span className="text-gray-500">$</span>
            <span className="flex-1">{K6_CMD}</span>
            <button
              onClick={handleCopy}
              className="text-gray-400 hover:text-white flex items-center gap-1"
            >
              {copied ? (
                <>
                  <FiCheck size={14} /> Copied
                </>
              ) : (
                <>
                  <FiCopy size={14} /> Copy
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center font-semibold text-sm shrink-0">
          2
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold ">Come back here</h2>
          <div className="text-xs text-gray-700">
            <p className="">Results will appear here automatically.</p>
            <p className="">Received <span className='font-bold'>{reqCount}</span>  requests so far</p>
          </div>
        </div>
      </div>
    </div>
  );
}
