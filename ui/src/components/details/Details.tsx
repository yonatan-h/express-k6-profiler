import { useGContext } from '../../global-context';
import { DetailsHeader } from './DetailsHeader';
import { DetailsStatus } from './DetailsStatus';
import { DetailsErrors } from './DetailsErrors';
import { DetailsSource } from './DetailsSource';

export function Details() {
  const c = useGContext();
  const selected = c.selectedTableData;

  if (!selected) {
    return null;
  }

  return (
    <div className="flex-1 bg-white border border-gray-200 rounded flex flex-col overflow-hidden text-xs">
      <DetailsHeader />
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        <DetailsStatus />
        <DetailsErrors />
        <DetailsSource />
      </div>
    </div>
  );
}
