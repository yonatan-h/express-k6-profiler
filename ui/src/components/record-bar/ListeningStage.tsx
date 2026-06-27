import { FaCircle } from 'react-icons/fa';
import CancelButton from './CancelButton';

export default function ListeningStage() {
  return (
    <div className="flex h-full py-1 justify-between w-full">
      <div className="flex-1 flex gap-2 items-center text-sm px-4">
        <FaCircle className="text-red-500 w-3 h-3 animate-pulse" />
        <span className="font-semibold text-gray-800">Waiting for Traffic...</span>
      </div>
      <CancelButton />
    </div>
  );
}
