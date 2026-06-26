import { useGContext } from '../../global-context';
import { DetailsErrors } from './DetailsErrors';

export function Details() {
  const c = useGContext();
  const selected = c.selectedTableData;

  if (!selected || selected.span.errors.count === 0) {
    return null;
  }

  return (
    <div className="flex-1 bg-white border border-gray-200 rounded flex flex-col overflow-hidden text-xs">
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        <DetailsErrors />
      </div>
    </div>
  );
}
