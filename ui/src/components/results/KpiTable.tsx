import { FiAlertTriangle, FiClock, FiHash } from 'react-icons/fi';
import { extr, humanNum } from '../../../../shared/big-utils';
import ChangeSpan from '../common/ChangeSpan';
import { useGContext } from '../../global-context';

export default function KpiTable() {
  const c = useGContext();

  const curResponseDatas = Object.values(c.curRecord?.responseDatas || c.responseDatas);
  const prevResponseDatas = c.baseRecord
    ? Object.values(c.baseRecord.responseDatas || {})
    : undefined;

  const hasComparison = !!c.baseRecord;

  const kpis = extr.kpiWithChanges(curResponseDatas, prevResponseDatas);

  const latChangeType = extr.getChangeType(kpis.avgLatency, {
    judge: 'less-is-better',
    thresPercent: 5,
  });

  const reqChangeType = extr.getChangeType(kpis.totalRequests, {
    judge: 'far-is-worse',
    thresPercent: 10,
  });

  const errChangeType = extr.getChangeType(kpis.errorRate, {
    judge: 'less-is-better',
    thresPercent: 5,
  });

  return (
    <table className="border-collapse mb-12 text-xs">
      <thead>
        <tr className="border-b border-gray-200 text-gray-500 uppercase">
          <th className="pl-2 pr-12 py-1 text-left font-semibold">Metric</th>
          <th className="pl-2 pr-12 py-1 text-left font-semibold">Value</th>
          {hasComparison && <th className="px-2 py-1 text-left font-semibold">Meaning</th>}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200">
        {/* Latency Row */}
        <tr>
          <td className="pl-2 pr-12 py-2  text-gray-700">
            <div className="flex items-center gap-2">
              <FiClock className="text-gray-400" /> Avg latency
            </div>
          </td>
          <td className="pl-2 pr-12">
            <ChangeSpan changeType={latChangeType} change={kpis.avgLatency} append="ms" />
          </td>
          {hasComparison && (
            <td className="px-2  text-gray-500 italic text-xs">
              {kpis.avgLatency.hasPrev &&
                (latChangeType.type === 'better' ? (
                  <span>
                    Latency improved by{' '}
                    <span className="font-bold text-green-600">
                      {humanNum(Math.abs(kpis.avgLatency.change))}ms
                    </span>
                  </span>
                ) : latChangeType.type === 'worse' ? (
                  <span>
                    Latency got worse by{' '}
                    <span className="font-bold text-red-600">
                      {humanNum(Math.abs(kpis.avgLatency.change))}ms
                    </span>
                  </span>
                ) : (
                  <span>No significant change</span>
                ))}
            </td>
          )}
        </tr>

        {/* Requests Row */}
        <tr>
          <td className="pl-2 pr-12  text-gray-700">
            <div className="flex items-center gap-2 py-2">
              <FiHash className="text-gray-400" /> Requests
            </div>
          </td>
          <td className="pl-2 pr-12 ">
            <ChangeSpan changeType={reqChangeType} change={kpis.totalRequests} />
          </td>
          {hasComparison && (
            <td className="px-2  text-gray-500 italic text-xs">
              {kpis.totalRequests.hasPrev &&
                (reqChangeType.type === 'worse'
                  ? 'Dramatic difference in #requests. Perhaps comparing different tests?'
                  : 'Similar traffic volume')}
            </td>
          )}
        </tr>

        {/* Error Rate Row */}
        <tr>
          <td className="pl-2 pr-12  text-gray-700 py-2">
            <div className="flex items-center gap-2">
              <FiAlertTriangle className="text-gray-400" /> Error rate
            </div>
          </td>
          <td className="pl-2 pr-12 ">
            <ChangeSpan changeType={errChangeType} change={kpis.errorRate} append="%" />
          </td>
          {hasComparison && (
            <td className="px-2  text-gray-500 italic text-xs">
              {kpis.errorRate.hasPrev &&
                (errChangeType.type === 'better' ? (
                  <span>
                    Error rate improved by{' '}
                    <span className="font-bold text-green-600">
                      {humanNum(Math.abs(kpis.errorRate.change))}%
                    </span>
                  </span>
                ) : errChangeType.type === 'worse' ? (
                  <span>
                    Error rate rose by{' '}
                    <span className="font-bold text-red-600">
                      {humanNum(Math.abs(kpis.errorRate.change))}%
                    </span>
                  </span>
                ) : (
                  <span>No significant change</span>
                ))}
            </td>
          )}
        </tr>
      </tbody>
    </table>
  );
}
