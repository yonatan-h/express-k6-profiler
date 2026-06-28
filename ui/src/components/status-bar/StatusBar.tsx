import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { extr, humanNum, round, safeDivide } from '../../../../shared/big-utils';
import { useGContext } from '../../global-context';

export function StatusBar() {
  const c = useGContext();
  const info = extr.getStatus(c.responseDatas);

  return (
    <div className="text-xs w-full flex justify-between items-center">
      <h1 className="font-bold">KRay</h1>
      <div className=" flex gap-6 justify-end text-gray-600">
        <span className="uppercase flex gap-2 items-center">
          {c.fetchError && <AiOutlineLoading3Quarters className="animate-spin" />}
          Status
        </span>
        <div className="h-4 w-px bg-gray-300"></div>
        <span>{humanNum(round(info.reqsPerSec, 1), false)} Reqs/Sec</span>
        {info.replicas > 1 && <span>{info.replicas} Replicas</span>}
        <span>
          {info.cpuPercent}% {info.replicas > 1 ? 'Avg ' : ''}CPU
        </span>
        <span>
          {info.memoryPercent}% {info.replicas > 1 ? 'Avg ' : ''}RAM
        </span>

        <span title='Event Loop Delay (NodeJS)' className='cursor-help'>
          {humanNum(info.eventLoopLagMs)}ms {info.replicas > 1 ? 'Avg ' : ''}ELD
        </span>
      </div>
    </div>
  );
}
