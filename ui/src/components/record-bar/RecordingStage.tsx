import { FaCircle, FaStop } from 'react-icons/fa';
import CancelButton from './CancelButton';
import { extr, makeRecording, safeDivide } from '../../../../shared/big-utils';
import { useGContext } from '../../global-context';
import type { RecordingExtra } from '../../ui-types';

const pad = (liveReqs: number[], maxLiveReqs: number): number[] => {
  const totalArr = [...Array.from({ length: maxLiveReqs }, () => 0), ...liveReqs];
  return totalArr.slice(totalArr.length - maxLiveReqs);
};
export function RecordingStage() {
  const c = useGContext();
  const recording = c.getActiveRecording();
  const recordingInfo = extr.getRecordingInfo(recording);

  const barWidthPx = 4;
  const maxBarHeight = 16 * 1.1;
  const maxLiveReqs = 20;

  const duration = recordingInfo.duration;
  const liveReqs = pad(recording.extra.liveRequests, maxLiveReqs);
  const scaleHeight = safeDivide(maxBarHeight, Math.max(...liveReqs)) || 0;
  return (
    <div className="w-full flex flex-col gap-3">
      <div className="flex justify-between items-center w-full">
        <div className="flex gap-6 items-center">
          <div className="flex gap-2 items-center">
            <div>
              <div className="rounded-full p-2 bg-red-100 flex justify-center items-center border border-red-200">
                <FaCircle className="text-red-600 animate-pulse" />
              </div>
            </div>
            <div className="flex flex-col justify-between">
              <span className="flex items-center text-xs text-gray-500">Capturing K6 Traffic</span>

              <span className="flex gap-px items-center ">
                {duration.hours > 0 && <span>{duration.hoursStr}:</span>}
                {<span>{duration.minutesStr}</span>}:{<span>{duration.secondsStr}</span>}
              </span>
            </div>
          </div>

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
            <span className="text-gray-500 text-xs">
              {liveReqs[liveReqs.length - 1]} Live Requests
            </span>
          </div>
        </div>

        <div className="flex gap-3 items-center">
          <CancelButton />
          <button
            onClick={() => {
              c.stopRecording();
            }}
            className="h-full flex gap-1 items-center hover:border-gray-100 rounded text-xs font-medium"
          >
            <FaStop className="text-gray-600" />
            Stop
          </button>
        </div>
      </div>
    </div>
  );
}
