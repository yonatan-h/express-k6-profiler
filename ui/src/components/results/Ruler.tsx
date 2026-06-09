import { humanNum, safeDivide } from '../../../../shared/big-utils';

export default function Ruler({
  numDivisions,
  max,
  maxWidthPx,
}: {
  numDivisions: number;
  max: number;
  maxWidthPx: number;
}) {
  const labels: number[] = [];
  for (let i = 0; i <= numDivisions; i += 1) {
    labels.push(i * safeDivide(max, numDivisions));
  }

  const canLabel = (i: number) => {
    return i % 2 === 0;
  };

  return (
    <div className="relative h-5  select-none " style={{ width: maxWidthPx + 'px' }}>
      {labels.map((label, i) => (
        <div
          key={i}
          className={`
            absolute  transform -translate-x-1/2  bottom-0
            flex flex-col items-center  text-[0.55rem]
          `}
          style={{ left: safeDivide(label, max) * 100 + '%' }}
        >
          {canLabel(i) && <span>{humanNum(label)}</span>}
          <span className="text-[0.3rem]">|</span>
        </div>
      ))}
    </div>
  );
}
