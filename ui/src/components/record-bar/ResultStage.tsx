import { useEffect, useRef, useState } from 'react';
import { IoMdArrowDropdown } from 'react-icons/io';
import { extr, humanNum } from '../../../../shared/big-utils';
import { useGContext } from '../../global-context';
import StartCaptureButton from './StartCaptureButton';
import { type Recording } from '../../../../shared/types';
import { type RecordingExtra } from '../../ui-types';
import DropDown from './DropDown';

export function ResultStage() {
  const c = useGContext();

  const [showCompare, setShowCompare] = useState(false);

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="flex justify-between items-center w-full">
        <div className="flex gap-6 items-center">
          {c.recordings.length > 0 && (
            <div className="flex gap-3 items-center justify-center">
              <DropDown type="cur" />

              {!c.curRecord?.extra?.isAmbient && (c.baseRecord || showCompare) && (
                <>
                  <span className="text-xs text-gray-500 bg-white rounded-full">vs</span>
                  <div className="flex gap-1">
                    <DropDown type="base" />
                    <button
                      className="text-gray-700 text-xs"
                      onClick={() => {
                        c.setBaseRecord(null);
                        setShowCompare(false);
                      }}
                      title="Remove comparison"
                    >
                      ✕
                    </button>
                  </div>
                </>
              )}
              {!c.curRecord?.extra?.isAmbient && !c.baseRecord && !showCompare && c.recordings.length > 1 && (
                <button
                  className="text-xs text-gray-500 hover:text-gray-700 underline px-2 py-1"
                  onClick={() => setShowCompare(true)}
                >
                  Compare against...
                </button>
              )}
            </div>
          )}
        </div>
        <StartCaptureButton text="Start Capturing" primary={true} />
      </div>
    </div>
  );
}
