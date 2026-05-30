import { useGContext } from '../../global-context';
import { type Recording } from '../../../../shared/types';
import { RecordingSummary } from './RecordingSummary';
import type { RecordingExtra } from '../../ui-types';
import { extr, makeRecording } from '../../../../shared/big-utils';
import { RecordedSummary } from './RecordedSummary';
import NoRecordSummary from './NoRecordSummary';


export function TopSummary() {
  const c = useGContext();
  const lastRecord: Recording<RecordingExtra> | undefined = c.recordings[c.recordings.length - 1];
  // const lastRecord = makeRecording({ extra: { liveRequests: [1, 5, 9, 22] } });
  const isRecording = lastRecord && extr.getRecordingInfo(lastRecord).recording;
  return (
    <div className=" border border-gray-200 rounded flex items-center justify-between gap-3 px-3 py-2 text-sm bg-white ">
      {isRecording && <RecordingSummary recording={lastRecord} />}
      {!isRecording && lastRecord && <RecordedSummary />}
      {!isRecording && !lastRecord && <NoRecordSummary />}
    </div>
  );
}
