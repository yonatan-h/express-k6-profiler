import { FaCircle } from 'react-icons/fa';
import Progress from './Progress';

export default function NoRecordSummary() {
  return (
    <div className="w-full flex flex-col gap-3 ">
      <Progress stage='idle' />
      <div className='flex gap-3 items-center'>        
        <button className="bg-gray-700 text-white px-3 py-1 rounded flex gap-2 items-center">
          <FaCircle className="w-2" />
          <span>Start Test Capture</span>
        </button>
      </div>
    </div>
  );
}
