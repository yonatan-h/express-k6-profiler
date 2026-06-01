import { extr, humanNum } from '../../../shared/big-utils';
import type { Change, ChangeType } from '../../../shared/types';
import { useGContext } from '../global-context';
import Folder from '../components/results/Folder';
import NoResultsYet from '../components/results/NoResultsYet';

export default function Results() {
  const c = useGContext();

  const curResponseDatas = Object.values(c.curRecord?.responseDatas || c.responseDatas);
  const prevResponseDatas = c.baseRecord
    ? Object.values(c.baseRecord.responseDatas || {})
    : undefined;
  const data = extr.getSpanTableData(curResponseDatas, [], () => ({}), prevResponseDatas);

  const maxMs = extr.getMaxSpanLatencyMs(Object.values(c.curRecord?.responseDatas || {}));
  const aggrInfo = extr.kpiWithChanges(curResponseDatas, prevResponseDatas);

  const maxWidthPx = 300;

  if (Object.values(c.responseDatas).length <= 0) {
    return <NoResultsYet />;
  }

  const latChangeType = extr.getChangeType(aggrInfo.avgLatency, {
    judge: 'less-is-better',
    thresPercent: 5,
  });

  const reqChangeType = extr.getChangeType(aggrInfo.totalRequests, {
    judge: 'more-is-better',
    thresPercent: 5,
  });

  const errChangeType = extr.getChangeType(aggrInfo.errorRate, {
    judge: 'less-is-better',
    thresPercent: 5,
  });

  return (
    <div className="p-3 bg-white rounded flex-1 overflow-auto border border-gray-200">
      <table className="w-full border-collapse mb-6 text-xs">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="px-3 py-2 text-left text-gray-600">Avg latency</th>
            <th className="px-3 py-2 text-left text-gray-600">Requests</th>
            <th className="px-3 py-2 text-left text-gray-600">Error rate</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 text-lg">
          <tr>
            <td className="px-3 py-2">
              <span>{humanNum(aggrInfo.avgLatency.cur)}ms </span>
              <ChangeSpan changeType={latChangeType} change={aggrInfo.avgLatency} append="ms" />
            </td>
            <td className="px-3 py-2">
              <span>{humanNum(aggrInfo.totalRequests.cur)}</span>
              <ChangeSpan changeType={reqChangeType} change={aggrInfo.totalRequests} />
            </td>
            <td className="px-3 py-2">
              <span>{aggrInfo.errorRate.cur.toFixed(1)}%</span>
              <ChangeSpan changeType={reqChangeType} change={aggrInfo.errorRate} append="%" />
            </td>
          </tr>
        </tbody>
      </table>
      <h2 className="pb-6">Latency Breakdown</h2>
      <table className="border-collapse w-full text-xs">
        <thead>
          <tr className="uppercase text-gray-500">
            <th className="px-4 py-2 font-normal border-y border-gray-200">Code</th>
            <th className="px-4 py-2 font-normal border-y border-gray-200">Latency</th>
            <th className="px-4 py-2 font-normal border-y border-gray-200">
              {/* <Ruler
                every={5}
                max={maxMs}
                maxWidthPx={maxWidthPx}
                labelWhen={(num) => num > 0 && num % 10 === 0 && num < maxMs - 5}
              /> */}
              Ruler
            </th>
            <th className="px-4 py-2 font-normal border-y border-gray-200">Count</th>
            <th className="px-4 py-2 font-normal border-y border-gray-200">Errors</th>
          </tr>
        </thead>
        <tbody className="group">
          {data.map((folder, i) => {
            return (
              <Folder
                key={`${folder.span.filePath}-${folder.span.snippet}-${i}`}
                data={folder}
                maxMs={maxMs}
                depth={0}
                maxWidthPx={maxWidthPx}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ChangeSpan({
  change,
  changeType,
  append = '',
  className = '',
  rounded = true,
}: {
  change: Change;
  append?: string;
  changeType: ReturnType<typeof extr.getChangeType>;
  className?: string;
  rounded?: boolean;
}) {
  if (!change.hasPrev) return null;

  const colorMap: Record<ChangeType, string> = {
    neutral: 'text-gray-500',
    better: 'text-green-700',
    worse: 'text-red-700',
    new: '',
  };

  return (
    <span
      className={[className, colorMap[changeType.type], rounded && ''].filter(Boolean).join(' ')}
    >
      {' '}
      {changeType.sign}
      {humanNum(change.changePercent)}
      {append}
    </span>
  );
}
