import { extr, humanNum } from '../../../../shared/big-utils';
import type { Change, ChangeType } from '../../../../shared/types';

export default function ChangeSpan({
  change,
  changeType,
  append = '',

  asPercent = false,
  className = '',
  rounded = true,
}: {
  change: Change;
  append?: string;
  changeType: ReturnType<typeof extr.getChangeType>;
  className?: string;
  rounded?: boolean;
  asPercent?: boolean;
}) {
  if (!change.hasPrev) return null;

  const colorMap: Record<ChangeType, string> = {
    'neutral': 'text-gray-500',
    better: 'text-green-700',
    worse: 'text-red-700',
    new: '',
  };

  return (
    <span
      className={['font-light opacity-90',className, colorMap[changeType.type], rounded && ''].filter(Boolean).join(' ')}
    >
      {changeType.vertArrow}
      {humanNum(Math.abs(asPercent ? change.changePercent : change.change))}
      {append}
    </span>
  );
}
