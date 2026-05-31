import React from 'react';
import { IoMdArrowDropright } from 'react-icons/io';
import { type StageType, typeList } from '../../ui-types';

const stageContentMap: Record<StageType, string> = {
  idle: 'Ready',
  listening: 'Recording',
  'running-k6': 'Recording',
  'saving': 'Results',
  'view-results': 'Results',
};

export default function Progress({ stage }: { stage: StageType }) {
  return (
    <div className="flex gap-2 items-center text-xs">
      <Stage stage="idle" isCur={stage === 'idle'} />
      <IoMdArrowDropright />
      <Stage stage="running-k6" isCur={stage === 'running-k6' || stage === 'listening'} />
      <IoMdArrowDropright />
      <Stage stage="view-results" isCur={stage === 'view-results' || stage === 'saving'} />
    </div>
  );
}

function Stage({ stage, isCur }: { stage: StageType; isCur: boolean }) {
  return <p className={`${isCur ? 'border-b' : ''}`}>{stageContentMap[stage]}</p>;
}
