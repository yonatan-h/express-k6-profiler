import React from 'react';
import { FaLongArrowAltRight } from 'react-icons/fa';
import { IoMdArrowDropright } from 'react-icons/io';

type StageType = 'idle' | 'start-capture' | 'run-k6' | 'view-results';
export default function Progress({ stage }: { stage: StageType }) {
  const typeList: StageType[] = ['idle', 'start-capture', 'run-k6', 'view-results'];
  return (
    <div className="flex gap-2 items-center text-xs">
      {typeList.map((t, i) => (
        <React.Fragment key={t}>
          <Stage stage={t} curStage={stage} />
          {i !== typeList.length - 1 && <IoMdArrowDropright />}
        </React.Fragment>
      ))}
    </div>
  );
}

function Stage({ stage, curStage }: { stage: StageType; curStage: StageType }) {
  const stageContentMap: Record<StageType, string> = {
    idle: 'Idle',
    'start-capture': 'Start Capture',
    'run-k6': 'Run K6',
    'view-results': 'View Results',
  };

  return <p className={`${stage === curStage ? 'border-b' : ''}`}>{stageContentMap[stage]}</p>;
}
