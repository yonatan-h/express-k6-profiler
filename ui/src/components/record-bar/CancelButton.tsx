import { FiX } from 'react-icons/fi';
import { useGContext } from '../../global-context';

export default function CancelButton() {
  const c = useGContext();
  return (
    <button
      onClick={() => {
        c.cancelRecording();
      }}
      className="h-full flex gap-1 items-center hover:border-gray-100 rounded text-xs text-gray-500 hover:text-red-600"
    >
      <FiX className="" />
      Cancel
    </button>
  );
}
