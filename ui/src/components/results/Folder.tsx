import { useState } from 'react';
import { FaChevronRight } from 'react-icons/fa';
import { extr, humanNum, safeDivide } from '../../../../shared/big-utils';
import type { ESpanTableData } from '../../../../shared/types';
import { useGContext } from '../../global-context';
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
  const [isOpen, setIsOpen] = useState(false);
  const c = useGContext();

  const hasChildren = data.nested.length > 0;
  const errorCount = data.span.errors.count;
  const isSelected = c.selectedTableData?.spanKey === data.spanKey;

  return (
    <>
      <tr
        className={`text-xs hover:bg-blue-100 cursor-pointer  ${visibility ? '' : 'hidden'} ${
          isSelected ? 'bg-blue-100 ' : ''
        }`}
        onClick={() => {
          c.selectTableData(data.spanKey);
          setIsOpen(!isSelected);
        }}
      >
        {/* code */}
        <td className={`border-y border-gray-200 pl-2 `}>
          <div className="flex items-stretch gap-1 h-full">
            {Array.from({ length: data.depth + 1 }).map((_, i) => {
              const isLeaf = i === data.depth;
              if (!hasChildren && isLeaf && data.depth === 0) return <FolderPad key={i} dir='dot' />;
              if (!hasChildren && isLeaf && data.depth !== 0) return <FolderPad key={i} dir='line' />;
              if (!isLeaf) return <FolderPad key={i} dir="line" />;
              return (
                <button
                  key={i}
                  type="button"
                  className="hover:bg-blue-100 rounded flex justify-center items-center transition-colors focus:outline-none"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                  }}
                >
                  <FolderPad dir={isOpen ? 'down' : 'right'} />
                </button>
              );
            })}

            <span className="py-0.5 flex gap-1 items-center select-none">
              <FolderIcon type={data.span.type} /> {data.snippet}
            </span>
          </div>
        </td>

        {/* latency bar */}
        <td className="py-1.5 px-4 border-y border-gray-200 text-gray-800">
          <FolderBar change={data.avgLatencyContributionMs} maxMs={maxMs} maxWidthPx={maxWidthPx} />
        </td>

        {/* count */}
        <td className="py-1 px-4 border-y border-gray-200 text-gray-500">
          {humanNum(data.totalCount.cur)}
        </td>

        {/* errors */}
        <td className="py-1 px-4 border-y border-gray-200 text-gray-500">
          {errorCount ? (
            <span
              className="flex items-center gap-1 text-red-600 bg-red-50 border-gray-400 px-1.5  rounded "
              title="Click to view errors in sidebar"
            >
              {humanNum(errorCount)}
              <FaChevronRight className="w-2 h-2 opacity-70" />
            </span>
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
