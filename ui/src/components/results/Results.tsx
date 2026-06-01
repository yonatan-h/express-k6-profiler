import { extr, humanNum } from '../../../../shared/big-utils';
import { useGContext } from '../../global-context';
import ChangeSpan from '../common/ChangeSpan';
import Folder from './Folder';
import NoResultsYet from './NoResultsYet';
import Ruler from './Ruler';

export default function Results() {
  const c = useGContext();

  const curResponseDatas = Object.values(c.curRecord?.responseDatas || c.responseDatas);
  const prevResponseDatas = c.baseRecord
    ? Object.values(c.baseRecord.responseDatas || {})
    : undefined;
  const data = extr.getSpanTableData(curResponseDatas, [], () => ({}), prevResponseDatas);

  const maxMs = extr.getMaxSpanLatencyMs(Object.values(c.curRecord?.responseDatas || {}));
  const kpis = extr.kpiWithChanges(curResponseDatas, prevResponseDatas);

  const maxWidthPx = 300;

  if (Object.values(c.responseDatas).length <= 0) {
    return <NoResultsYet />;
  }

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
              <span>{humanNum(latChangeType.change.cur)}ms </span>
              <ChangeSpan changeType={latChangeType} change={kpis.avgLatency} append="ms" />
            </td>
            <td className="px-3 py-2">
              <span>{humanNum(reqChangeType.change.cur)} </span>
              <ChangeSpan
                changeType={reqChangeType}
                change={kpis.totalRequests}
                asPercent
                append="%"
              />
            </td>
            <td className="px-3 py-2">
              <span>{humanNum(errChangeType.change.cur)}% </span>
              <ChangeSpan changeType={errChangeType} change={kpis.errorRate} append="%" />
            </td>
          </tr>
        </tbody>
      </table>
      <h2 className="pb-6">Latency Breakdown</h2>
      <table className="border-collapse w-full text-xs">
        <thead>
          <tr className="uppercase text-gray-500 text-left">
            <th className="px-4 py-2 font-normal border-y border-gray-200">Code</th>
            <th className="px-4 py-2 font-normal border-y border-gray-200">Latency</th>
            <th className="px-4 pt-2 font-normal border-y border-gray-200">
              <Ruler
                numDivisions={10}
                max={maxMs}
                maxWidthPx={maxWidthPx}
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
                key={`${folder.span.spanCode.filePath}-${folder.span.spanCode.snippet}-${i}`}
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
