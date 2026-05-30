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
        <span>{info.liveReqs} Live Reqs</span>
        <span>{info.replicas} Replicas</span>
        <span>{info.cpuPercent}% Avg CPU</span>
        <span>{info.memoryPercent}% Avg RAM</span>
      </div>
    </div>
  );
}
