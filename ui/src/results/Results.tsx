import { extr, humanNum } from '../../../shared/big-utils';
import { useGContext } from '../global-context';
import Folder from './Folder';
import NoResultsYet from './NoResultsYet';
import Ruler from './Ruler';

export default function Results() {
  console.log('results');
  const c = useGContext();

  const curResponseDatas = Object.values(c.curRecord?.responseDatas || c.responseDatas);
  const prevResponseDatas = c.baseRecord ? Object.values(c.baseRecord || {}) : undefined;
  const data = extr.getSpanTableData(curResponseDatas, [], () => ({}), prevResponseDatas);

  const maxMs = extr.getMaxSpanLatencyMs(Object.values(c.curRecord?.responseDatas || {}));
  const aggrInfo = extr.kpiWithChanges(curResponseDatas, prevResponseDatas);

  const maxWidthPx = 300;

  if (Object.values(c.responseDatas).length <= 0) {
    return <NoResultsYet />;
  }

  console.log('results -mid');

  const latChangeType = extr.getChangeType(aggrInfo.avgLatency, {
    moreIsBetter: false,
    thresPercent: 5,
  });
  const reqChangeType = extr.getChangeType(aggrInfo.avgLatency, {
    moreIsBetter: true,
    thresPercent: 10,
  });
  const errChangeType = extr.getChangeType(aggrInfo.avgLatency, {
    moreIsBetter: false,
    thresPercent: 5,
  });

  console.log('results -end');
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
              <div>{humanNum(aggrInfo.avgLatency.cur)}ms</div>
              <div className="text-gray-500">
                {aggrInfo.avgLatency.hasPrev && (
                  <span>
                    {latChangeType.sign} {humanNum(aggrInfo.avgLatency.change)}
                  </span>
                )}
              </div>
            </td>
            <td className="px-3 py-2">
              <div>{humanNum(aggrInfo.totalRequests.cur)}</div>
              <div className="text-gray-500">
                {aggrInfo.totalRequests.hasPrev
                  ? `${aggrInfo.totalRequests.change >= 0 ? '+' : ''}${humanNum(aggrInfo.totalRequests.change)}`
                  : '-'}
              </div>
            </td>
            <td className="px-3 py-2">
              <div>{aggrInfo.errorRate.cur.toFixed(1)}%</div>
              <div className="text-gray-500">
                {aggrInfo.errorRate.hasPrev
                  ? `${aggrInfo.errorRate.change >= 0 ? '+' : ''}${aggrInfo.errorRate.change.toFixed(1)}%`
                  : '-'}
              </div>
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
              <Ruler
                every={5}
                max={maxMs}
                maxWidthPx={maxWidthPx}
                labelWhen={(num) => num > 0 && num % 10 === 0 && num < maxMs - 5}
              />
            </th>
            <th className="px-4 py-2 font-normal border-y border-gray-200">Count</th>
            <th className="px-4 py-2 font-normal border-y border-gray-200">Errors</th>
          </tr>
        </thead>
        <tbody className="group">
          {data.map((folder, i) => {
            return (
              <Folder
                key={`${folder.span.spanCodeId}-${i}`}
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
