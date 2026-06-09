import { useState } from 'react';
import { extr, humanNum } from '../../../../shared/big-utils';
import type { ESpanTableData } from '../../../../shared/types';
import type { ESpanTableDataExtra } from '../../ui-types';
import ChangeSpan from '../common/ChangeSpan';
import { FolderBar } from './FolderBar';
import FolderIcon from './FolderIcon';
import FolderPad from './FolderPad';

export default function Folder({
  data,
  maxMs,
  maxWidthPx,
  visibility = true,
}: {
  data: ESpanTableData<ESpanTableDataExtra>;
  maxMs: number;
  maxWidthPx: number;
  visibility?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(data.depth < 1);

  const hasChildren = data.nested.length > 0;
  const errorCount = data.totalErrorCount;

  const latencyCT = extr.getChangeType(data.totalLatencyContributionMs, {
    judge: 'less-is-better',
    thresChange: 10,
  });

  return (
    <>
      <tr className={`text-xs ${visibility ? '' : 'hidden'}`}>
        <td className="  border-y border-gray-200">
          <button
            className=" hover:bg-gray-100  w-full text-left flex"
            onClick={() => setIsOpen(!isOpen)}
          >
            {Array.from({ length: data.depth + 1 }).map((_, i) => {
              if (!hasChildren || i !== data.depth) return <FolderPad key={i} dir="line" />;
              return <FolderPad key={i} dir={isOpen ? 'down' : 'right'} />;
            })}

            <span className="py-1 flex gap-1">
              <FolderIcon type={data.span.type} /> {data.snippet}
            </span>
            <FolderPad dir="none" />
          </button>
        </td>

        <td className="py-1 border-y border-gray-200">
          <FolderBar change={data.avgLatencyContributionMs} maxMs={maxMs} maxWidthPx={maxWidthPx} />
        </td>
        <td className="py-1 px-4 border-y border-gray-200 text-gray-800 flex gap-1">
          <span>{humanNum(data.avgLatencyContributionMs.cur)}ms </span>
          {data.avgLatencyContributionMs.hasPrev && latencyCT.type != 'neutral' && (
            <ChangeSpan change={data.avgLatencyContributionMs} append="ms" changeType={latencyCT} />
          )}
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
          visibility={isOpen && visibility}
          key={`${folder.snippet}-${i}`}
          data={folder}
          maxMs={maxMs}
          maxWidthPx={maxWidthPx}
        />
      ))}
    </>
  );
}
