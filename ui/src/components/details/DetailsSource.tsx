import { useGContext } from '../../global-context';

export function DetailsSource() {
  const c = useGContext();
  const selected = c.selectedTableData;
  if (!selected) return null;

  const { span } = selected;
  const { code, filePath, line, col } = span;
  if (!code) return null;

  return (
    <div className="flex-1 flex flex-col min-h-0 border-t pt-3 pb-2">
      <h3 className="font-semibold text-gray-500 uppercase tracking-wider mb-1">Source Code</h3>
      {filePath && (
        <p className="text-gray-400 font-mono text-[10px] mb-1 select-all">
          {filePath}{line && `:${line}`}{col && `:${col}`}
        </p>
      )}
      <pre className="flex-1 overflow-auto bg-gray-50 p-2.5 rounded font-mono text-[10px] text-gray-800 border leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}
