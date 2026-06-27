import { extr, humanNum } from '../../../../shared/big-utils';
import { useGContext } from '../../global-context';
import ChangeSpan from '../common/ChangeSpan';

export function DetailsStatus() {
  const c = useGContext();
  const selected = c.selectedTableData;
  if (!selected) return null;

  const hasPrev = selected.avgLatencyContributionMs.hasPrev;
  const latencyCT = extr.getChangeType(selected.avgLatencyContributionMs, {
    judge: 'less-is-better',
    thresPercent: 5,
  });

  return (
    <div>
      <h3 className="font-semibold text-gray-500 uppercase tracking-wider mb-2">Status</h3>
      {!hasPrev ? (
        <p className="text-green-600 font-medium">✨ New Span (not in baseline). Contributes latency of <strong>{humanNum(selected.avgLatencyContributionMs.cur)}ms</strong></p>
      ) : (
        <ul className="list-disc pl-4 space-y-1 text-gray-800">
          <li>
            contributes latency of <strong>{humanNum(selected.avgLatencyContributionMs.cur)}ms</strong> (baseline:{' '}
            {selected.avgLatencyContributionMs.prev !== null
              ? `${humanNum(selected.avgLatencyContributionMs.prev)}ms`
              : 'N/A'}
            )
            {selected.avgLatencyContributionMs.hasPrev && (
              <span className="ml-1 font-semibold">
                <ChangeSpan
                  change={selected.avgLatencyContributionMs}
                  append="%"
                  changeType={latencyCT}
                />
              </span>
            )}
          </li>
          <li>
            <strong>{selected.totalCount.cur} calls</strong> executed (baseline:{' '}
            {selected.totalCount.prev !== null ? selected.totalCount.prev : 'N/A'}
            )
          </li>
        </ul>
      )}
    </div>
  );
}
