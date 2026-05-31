import { useState } from 'react';
import { FiClock, FiCheck, FiCopy } from 'react-icons/fi';
import Progress from './Progress';
import { useGContext } from '../../global-context';
import { extr } from '../../../../shared/big-utils';
import { FaCircle } from 'react-icons/fa';

const K6_CMD = 'k6 run mytest.js';

export default function ListeningStage() {
  const c = useGContext();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(K6_CMD);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="flex gap-6 items-center">
        <p className="flex items-center gap-1">
          <FaCircle className="w-2 text-red-600 animate-pulse" />
          <span>Waiting for K6 Traffic
          </span>

        </p>
        <div className="flex gap-3">
          <div className="flex gap-2 items-center bg-gray-100 px-4 rounded py-1 border-gray-300">
            <p className="">{K6_CMD}</p>
            <button onClick={handleCopy} className="" title="Copy command">
              {copied ? (
                <>
                  <FiCheck size={14} className="animate-pulse" />
                  Copied
                </>
              ) : (
                <>
                  <FiCopy size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
