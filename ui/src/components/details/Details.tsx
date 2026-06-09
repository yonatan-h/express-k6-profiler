import type { SpanType } from '../../../../shared/types';
import { useGContext } from '../../global-context';
import FolderIcon from '../results/FolderIcon';

export function Details() {
  const c = useGContext();
  const snippet = c.selectedTableData?.snippet || '';
  const spanType = c.selectedTableData?.span.type || 'root';
  const line = 1;
  const filePath = '';
  const errors = c.selectedTableData?.errors;
  const code = c.selectedTableData?.span.code;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto border rounded border-gray-200 bg-white flex flex-col gap-3">
      {/* header */}
      <div className="flex items-center gap-2 sticky top-0 bg-white p-3 border-b border-gray-200 ">
        <FolderIcon type={spanType} />
        <h2 className="font-medium">{snippet}</h2>
      </div>

      {/* source */}
      {(filePath || code) && (
        <div className="px-3">
          <div className="">
            <div className="">Source</div>

            <div className="flex items-center justify-between gap-2">
              <div className="font-mono text-sm">
                {filePath}
                {line && `:${line}`}
              </div>
            </div>
          </div>

          {code && (
            <pre className="p-3 overflow-auto text-xs font-mono bg-gray-50">
              <code>{code}</code>
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
