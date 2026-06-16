import { useGContext } from '../../global-context';
import FolderIcon from '../results/FolderIcon';

export function DetailsHeader() {
  const c = useGContext();
  const selected = c.selectedTableData;
  if (!selected) return null;

  const { span, snippet } = selected;
  const spanType = span.type;

  return (
    <div className="flex justify-between items-center bg-gray-50 border-b border-gray-300 px-3 py-2">
      <div className="flex items-center gap-1.5 min-w-0">
        <FolderIcon type={spanType} />
        <span className="text-gray-700 truncate font-medium" title={snippet}>
          {snippet}
        </span>
        <span className="text-gray-500 lowercase italic">
          ({spanType})
        </span>
      </div>
      <button 
        onClick={() => c.selectTableData(null)} 
        className=""
        title="Close"
      >
        ✕
      </button>
    </div>
  );
}
