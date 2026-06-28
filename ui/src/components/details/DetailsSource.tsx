import { useGContext } from '../../global-context';

export function DetailsSource() {
  const c = useGContext();
  const selected = c.selectedTableData;
  if (!selected) return null;

  const { span } = selected;
  const { code, filePath, line, col } = span;

  return (
    <div className="flex flex-col pt-3 pb-2">
      <h3 className="font-semibold text-gray-500 uppercase tracking-wider mb-1">Source Code</h3>
      {filePath && (
        <p className="text-gray-600 font-mono text-xs mb-1 select-all">
          {filePath}
          {line && `:${line}`}
          {col && `:${col}`}
        </p>
      )}
      <pre className=" overflow-x-auto bg-gray-50 p-2.5 rounded font-mono text-xs text-gray-800 border leading-relaxed">
        {code && <code>{code}</code>}
        {!code && <p className="italic">Code not available</p>}
      </pre>
    </div>
  );
}
