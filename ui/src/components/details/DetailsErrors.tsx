import { humanNum } from '../../../../shared/big-utils';
import { useGContext } from '../../global-context';

export function DetailsErrors() {
  const c = useGContext();
  const selected = c.selectedTableData;
  if (!selected) return null;

  const { errors } = selected.span;
  if (errors.count === 0) return null;

  return (
    <div className="">
      <h3 className="font-semibold text-gray-500 uppercase tracking-wider mb-2">
        Errors ({humanNum(errors.count)})
      </h3>
      <div className="flex flex-col gap-2">
        {errors.samples.map((sample, idx) => (
          <pre
            key={idx}
            className="bg-red-50 text-red-700 border border-red-100 p-2 rounded whitespace-pre-wrap font-mono text-[10px] leading-relaxed"
          >
            {sample}
          </pre>
        ))}
      </div>
    </div>
  );
}
