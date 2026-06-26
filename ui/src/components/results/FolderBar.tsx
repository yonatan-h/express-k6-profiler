import { extr, safeDivide, humanNum } from '../../../../shared/big-utils';
import type { Change, ChangeType } from '../../../../shared/types';
import ChangeSpan from '../common/ChangeSpan';

export function FolderBar({
  change,
  maxMs,
  maxWidthPx,
}: {
  change: Change;
  maxMs: number;
  maxWidthPx: number;
}) {
  const curWidthPx = safeDivide(change.cur, maxMs) * maxWidthPx + 2;
  const prevWidthPx = safeDivide(change.prev || 0, maxMs) * maxWidthPx + 2;

  const changeType = extr.getChangeType(change, {
    judge: 'less-is-better',
    thresChange: 10,
  });
  return (
    <div className="flex flex-col justify-center">
      {change.hasPrev && (
        <div className="flex items-center gap-2 text-gray-500">
          <div
            className="border border-dashed border-gray-400 rounded-br bg-gray-50 h-3"
            style={{ width: prevWidthPx }}
          ></div>
          <span className="whitespace-nowrap text-xs">{humanNum(change.prev || 0)}ms</span>
        </div>
      )}

      <div className="flex items-center gap-2 text-gray-800">
        <div
          className="border border-gray-600 rounded-br bg-gray-200 h-3"
          style={{ width: curWidthPx }}
        ></div>
        <div className="flex items-center gap-1 whitespace-nowrap text-xs">
          <span>{humanNum(change.cur)}ms </span>
        </div>
      </div>
    </div>
  );
}
