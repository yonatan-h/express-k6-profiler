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
