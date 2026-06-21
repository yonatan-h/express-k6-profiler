import { FiActivity, FiAlertCircle, FiAlertTriangle, FiBarChart2, FiClock, FiCode, FiHash } from 'react-icons/fi';
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

  const maxMs = c.tableData?.maxAvgSpanLatencyMs || 0;
  const kpis = extr.kpiWithChanges(curResponseDatas, prevResponseDatas);
  const isEmpty = !c.tableData?.table?.length;

  const maxWidthPx = 150;

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
      <table className="border-collapse mb-6 text-xs">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="px-3 py-2 text-left text-gray-600">
              <div className="flex items-center gap-1"><FiClock /> Avg latency</div>
            </th>
            <th className="px-3 py-2 text-left text-gray-600">
              <div className="flex items-center gap-1"><FiBarChart2 /> Requests</div>
            </th>
            <th className="px-3 py-2 text-left text-gray-600">
              <div className="flex items-center gap-1"><FiAlertTriangle /> Error rate</div>
            </th>
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
      {
        (!isEmpty) &&
        <>

      <h2 className="pb-6">Latency Breakdown</h2>
      <table className="border-collapse text-xs">
        <thead>
          <tr className="uppercase text-gray-500 text-left">
            <th className="px-4 py-2 font-normal border-y border-gray-200">
              <div className="flex items-center gap-1"><FiCode /> Code</div>
            </th>
            <th className=" pt-2 font-normal border-y border-gray-200">
              <Ruler numDivisions={10} max={maxMs} maxWidthPx={maxWidthPx} />
            </th>
            <th className="px-4 py-2 font-normal border-y border-gray-200">
              <div className="flex items-center gap-1"><FiClock /> Latency</div>
            </th>
            <th className="px-4 py-2 font-normal border-y border-gray-200">
              <div className="flex items-center gap-1"><FiHash /> Count</div>
            </th>
            <th className="px-4 py-2 font-normal border-y border-gray-200">
              <div className="flex items-center gap-1"><FiAlertCircle /> Errors</div>
            </th>
          </tr>
        </thead>
        <tbody className="group">
          {(c.tableData?.table || []).map((folder, i) => (
            <Folder
              key={`${folder.span.filePath || ''}-${folder.span.snippet}-${i}`}
              data={folder}
              maxMs={maxMs}
              maxWidthPx={maxWidthPx}
            />
          ))}
        </tbody>
      </table>
        </>
      }
      
      {isEmpty && (
        <div className="flex flex-col items-center py-12 text-gray-500">
          <p>No data yet. Make some requests to see latency breakdown.</p>
        </div>
      )}
    </div>
  );
}
