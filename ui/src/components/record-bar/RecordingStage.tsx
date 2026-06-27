import { FaCircle, FaStop } from 'react-icons/fa';
import CancelButton from './CancelButton';
import { extr, humanNum, makeRecording, round, safeDivide } from '../../../../shared/big-utils';
import { useGContext } from '../../global-context';
import type { RecordingExtra } from '../../ui-types';

const pad = (liveReqs: number[], maxLiveReqs: number): number[] => {
  const totalArr = [...Array.from({ length: maxLiveReqs }, () => 0), ...liveReqs];
  return totalArr.slice(-maxLiveReqs);
};
export function RecordingStage() {
  const c = useGContext();
  const recording = c.getActiveRecording();
  const recordingInfo = extr.getRecordingInfo(recording);

  const barWidthPx = 6;
  const maxBarHeight = 16 * 1.1;
  const maxLiveReqs = 20;

  const duration = recordingInfo.duration;
  const liveReqs = pad(recording.extra.requestsPerSec, maxLiveReqs);
  const scaleHeight = safeDivide(maxBarHeight, Math.max(...liveReqs)) || 0;

  const isTrafficFinished =
    recordingInfo.totalRequests > 0 && liveReqs.slice(-3).every((r) => r === 0);

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="flex justify-between items-center w-full">
        <div className="flex gap-6 ">
          <div className="flex gap-2 items-center">
            <div>
              <div className="rounded-full p-2 bg-red-100 flex justify-center items-center border border-red-200">
                <FaCircle className="text-red-600 animate-pulse" />
              </div>
            </div>
            <div className="flex flex-col justify-between">
              {isTrafficFinished ? (
                <span className="flex items-center text-sm font-medium ">
                  Traffic stopped. Ready to analyze?
                </span>
              ) : (
                <span className="flex items-center text-sm text-gray-500">
                  Capturing... Click Stop when finished
                </span>
              )}

              <span className="flex gap-px items-center ">
                <span className="text-gray-400 uppercase mr-2 text-xs">Elapsed: </span>
                {duration.hours > 0 && <span>{duration.hoursStr}:</span>}
                {<span>{duration.minutesStr}</span>}:{<span>{duration.secondsStr}</span>}
              </span>
            </div>
          </div>

          <div className="flex flex-col justify-end bg-gray-50 px-2 rounded">
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
              <div className="h-full w-px bg-gray-300" style={{ height: maxBarHeight }}></div>
            </div>
            <span className="text-gray-500 text-xs">
              {humanNum(round(liveReqs[liveReqs.length - 1]), false)} Requests/second
            </span>
          </div>
        </div>

        <div className="flex gap-4 items-center">
          <CancelButton />
          <button
            onClick={() => {
              c.stopRecording();
            }}
            className={`flex gap-2 items-center px-4 py-1.5 rounded-md text-sm font-semibold transition-colors shadow-sm ${
              isTrafficFinished
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-gray-800 hover:bg-gray-700 text-white'
            }`}
          >
            <FaStop size={12} />
            Stop & Analyze
          </button>
        </div>
      </div>
    </div>
  );
}
