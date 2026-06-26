import { FaCircle } from 'react-icons/fa';
import CancelButton from './CancelButton';

export default function ListeningStage() {
  return (
    <div className="w-full flex justify-between items-center">
      <div className="flex gap-2 items-center">
        <FaCircle className="w-2 text-red-600 animate-pulse" />
        <span className="font-semibold text-gray-800">Capturing Traffic...</span>
      </div>
      <CancelButton />
    </div>
  );
}
