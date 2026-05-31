import { useGContext } from '../../global-context';
import { type Recording } from '../../../../shared/types';
import { RecordingStage } from './RecordingStage';
import type { RecordingExtra } from '../../ui-types';
import { extr, makeRecording } from '../../../../shared/big-utils';
import { ResultStage } from './ResultStage';
import IdleDesc from './IdleStage';
import IdleStage from './IdleStage';
import ListeningStage from './ListeningStage';
import { SaveLastRecordingModal } from './SaveRecordingModal';

export function TopSummary() {
  const c = useGContext();

  <SaveLastRecordingModal />;

  return (
    <div className=" border border-gray-200 rounded flex items-center justify-between gap-3 px-3 py-2 text-sm bg-white ">
      {c.stage === 'idle' && (
        <IdleStage
          onNext={async () => {
            await c.startRecording(`Run #${c.recordings.length + 1}`);
          }}
        />
      )}

      {c.stage === 'listening' && <ListeningStage />}
      {c.stage === 'running-k6' && <RecordingStage />}
      {c.stage === 'saving' && <SaveLastRecordingModal />}
      {(c.stage === 'view-results' || c.stage==='saving') && <ResultStage />}
    </div>
  );
}
