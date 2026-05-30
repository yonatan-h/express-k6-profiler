import { useState, useEffect } from 'react';
import { extr, getDuration, safeDivide } from '../../../../shared/big-utils';
import { FaCircle, FaStop } from 'react-icons/fa';
import { useGContext } from '../../global-context';
import type { Recording } from '../../../../shared/types';
import type { RecordingExtra } from '../../ui-types';

const pad = (liveReqs: number[], maxLiveReqs: number): number[] => {
  const totalArr = [...Array.from({ length: maxLiveReqs }, () => 0), ...liveReqs];
  return totalArr.slice(totalArr.length - maxLiveReqs);
};
export function RecordingSummary({ recording }: { recording: Recording<RecordingExtra> }) {
  const c = useGContext();
  const recordingInfo = extr.getRecordingInfo(recording);

  const barWidthPx = 4;
  const maxBarHeight = 16 * 2;
  const duration = recordingInfo.duration;
  const maxLiveReqs = 20;
  const liveReqs = pad(recording.extra.liveRequests, maxLiveReqs);
  const scaleHeight = safeDivide(maxBarHeight, Math.max(...liveReqs)) || 1;
  return (
    <div className="flex  gap-6 items-center">
      <p className="flex gap-2 items-center">
        <div>
          <div className="rounded-full p-2 bg-red-100 flex justify-center items-center border border-red-200">
            <FaCircle className="text-red-600 " />
          </div>
        </div>
        <div className="flex flex-col justify-between">
          <span className="uppercase flex items-center text-xs text-gray-500">Recording</span>

          <span className="flex gap-px items-center ">
            {duration.hours > 0 && <span>{duration.hoursStr}:</span>}
            {<span>{duration.minutesStr}</span>}:{<span>{duration.secondsStr}</span>}
          </span>
        </div>
      </p>

      <div className="flex flex-col justify-between">
        <div className="flex items-end">
          {liveReqs.map((height, i) => {
            return (
              <div
                className=" bg-gray-200 border-t"
                key={i}
                style={{ width: barWidthPx + 'px', height: height * scaleHeight + 'px' }}
              />
            );
          })}
          <div className="h-full w-1 bg-red-300"></div>
        </div>
        <span className="text-gray-500 text-xs">{liveReqs[liveReqs.length - 1]} live requests</span>
      </div>

      <button className="h-full flex gap-1 items-center hover:border-gray-100 rounded">
        <FaStop className="text-gray-600" />
        Stop
      </button>
    </div>
  );
}
