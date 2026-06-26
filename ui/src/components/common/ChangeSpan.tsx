import { extr, humanNum } from '../../../../shared/big-utils';
import type { Change } from '../../../../shared/types';
import { FaArrowRight } from 'react-icons/fa';

export default function ChangeSpan({
  change,
  changeType,
  append = '',
  className = '',
  showNew = false,
}: {
  change: Change;
  append?: string;
  changeType: ReturnType<typeof extr.getChangeType>;
  className?: string;
  showNew?: boolean;
}) {
  if (!change.hasPrev) {
    if (showNew) return <span>new</span>;
    return <span className={`text-gray-900 text-lg ${className}`}>{humanNum(change.cur)}{append}</span>;
  }

  const colorMap: Record<string, string> = {
    neutral: 'text-gray-400',
    better: 'text-green-600',
    worse: 'text-red-600',
    new: '',
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-gray-400 text-lg">
        {humanNum(change.prev || 0)}{append}
      </span>
      <FaArrowRight className={`${colorMap[changeType.type]} text-xs`} />
      <span className="text-gray-900 text-lg ">
        {humanNum(change.cur)}{append}
      </span>
    </div>
  );
}
