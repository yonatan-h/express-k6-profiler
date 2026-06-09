import { extr, safeDivide } from '../../../../shared/big-utils';
import type { Change } from '../../../../shared/types';

export function FolderBar({
  change,
  maxMs,
  maxWidthPx,
}: {
  change: Change;
  maxMs: number;
  maxWidthPx: number;
}) {
  const curWidthPx = safeDivide(change.cur, maxMs) * maxWidthPx;
  const prevWidthPx = safeDivide(change.prev || 0, maxMs) * maxWidthPx;
  const changeType = extr.getChangeType(change, { thresChange: 1, judge: 'less-is-better' });
  const better = changeType.type === 'better';
  return (
    <div className="flex items-center w-full h-4 relative">
      <div
        className={`border border-gray-800 absolute h-full rounded-br bg-gray-200 ${
          better ? 'z-20' : ''
        }`}
        style={{ width: curWidthPx }}
      ></div>

      {change.hasPrev && changeType.type !== 'neutral' && (
        <div
          className={`border border-dashed border-gray-900 rounded-br absolute h-full

          ${better ? '' : 'z-20'}`}
          style={{ width: prevWidthPx }}
        ></div>
      )}
    </div>
  );
}
