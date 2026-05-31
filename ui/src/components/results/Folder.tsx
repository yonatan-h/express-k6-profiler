import { useState } from 'react';
import { extr, humanNum } from '../../../../shared/big-utils';
import type { ESpanTableData } from '../../../../shared/types';
import type { ESpanTableDataExtra } from '../../ui-types';
import FolderIcon from './FolderIcon';
import FolderPad from './FolderPad';

export default function Folder({
  data,
  depth,
  maxMs,
  maxWidthPx,
}: {
  data: ESpanTableData<ESpanTableDataExtra>;
  depth: number;
  maxMs: number;
  maxWidthPx: number;
}) {
  const [isOpen, setIsOpen] = useState(true);

  const hasChildren = data.nested.length > 0;
  const errorCount = data.totalErrorCount;

  const latencyInfo = extr.getChangeType(data.totalLatencyContributionMs, {
    judge: 'less-is-better',
    thresChange: 1,
  });

  return (
    <>
      <tr className="text-xs">
        <td className="  border-y border-gray-200">
          <button
            className=" hover:bg-gray-100  w-full text-left flex"
            onClick={() => setIsOpen(!isOpen)}
          >
            {Array.from({ length: depth + 1 }).map((_, i) => {
              if (!hasChildren || i !== depth) return <FolderPad key={i} dir="line" />;
              return <FolderPad key={i} dir={isOpen ? 'down' : 'right'} />;
            })}

            <span className="py-1 flex gap-1">
              <FolderIcon type={data.span.type} /> {data.snippet}
            </span>
            <FolderPad dir="none" />
          </button>
        </td>

        <td className="py-1 px-4 border-y border-gray-200 text-gray-800">
          {humanNum(data.totalLatencyContributionMs.cur)}ms
          {
            <span>
              {latencyInfo.vertArrow} {latencyInfo.sign} {data.totalLatencyContributionMs.change}
            </span>
          }
        </td>

        <td className="py-1 border-y border-gray-200">
          {/* <FolderBar cur={data.totalLatencyContributionMs.cur} prev={data.totalLatencyContributionMs.prev} maxMs={maxMs} maxWidthPx={maxWidthPx} /> */}
        </td>

        <td className="py-1 px-4 border-y border-gray-200 text-gray-500">{data.totalCount.cur}</td>
        <td className="py-1 px-4 border-y border-gray-200 text-gray-500">
          {errorCount ? (
            <span className="text-red-600 bg-red-50 px-1 rounded">{1}</span>
          ) : (
            <span>-</span>
          )}
        </td>
      </tr>
      {data.nested.map((folder, i) => (
        <Folder
          key={`${folder.snippet}-${i}`}
          data={folder}
          depth={depth + 1}
          maxMs={maxMs}
          maxWidthPx={maxWidthPx}
        />
      ))}
    </>
  );
}
