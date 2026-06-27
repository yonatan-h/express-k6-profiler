import {
  FiActivity,
  FiAlertCircle,
  FiAlertTriangle,
  FiBarChart2,
  FiClock,
  FiCode,
  FiHash,
} from 'react-icons/fi';
import { extr, humanNum } from '../../../../shared/big-utils';
import { useGContext } from '../../global-context';
import Folder from './Folder';
import ListeningInstructions from './ListeningInstructions';
import KpiTable from './KpiTable';

export default function Results() {
  const c = useGContext();

  const maxMs = c.tableData?.maxAvgSpanLatencyMs || 0;
  const isEmpty = !c.tableData?.table?.length;
  const maxWidthPx = 150;

  return (
    <div className="p-3 bg-white rounded flex-1 overflow-auto border border-gray-200">
      {c.stage !== 'listening' && <KpiTable />}
      {!isEmpty && c.stage !== 'listening' && (
        <>
          <h2 className="pb-3 text-gray-800 font-medium">Latency Breakdown</h2>
          <table className=" border-collapse text-xs">
            <thead>
              <tr className="uppercase text-gray-500 text-left">
                <th className="px-4 py-2 font-normal border-y border-gray-200">
                  <div className="flex items-center gap-1">
                    <FiCode /> Code
                  </div>
                </th>

                <th className="px-4 py-2 font-normal border-y border-gray-200">
                  <div className="flex items-center gap-1">
                    <FiClock /> Latency
                  </div>
                </th>
                <th className="px-4 py-2 font-normal border-y border-gray-200">
                  <div className="flex items-center gap-1">
                    <FiHash /> Count
                  </div>
                </th>
                <th className="px-4 py-2 font-normal border-y border-gray-200">
                  <div className="flex items-center gap-1">
                    <FiAlertCircle /> Errors
                  </div>
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
      )}

      {isEmpty && c.stage === 'idle' && (
        <div className="flex flex-col  py-12 text-gray-500">
          <p>No data yet. No traffic.</p>
        </div>
      )}

      {c.stage === 'listening' && <ListeningInstructions />}
    </div>
  );
}
