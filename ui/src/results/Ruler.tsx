export default function Ruler({
  every: markEvery,
  max,
  maxWidthPx,
  labelWhen,
}: {
  every: number;
  max: number;
  maxWidthPx: number;
  labelWhen: (num: number) => boolean;
}) {
  const labels: number[] = [];
  for (let i = 0; i <= max; i += markEvery) {
    labels.push(i);
  }

  //TODO: make not selectable
  return (
    <div className="relative h-5 " style={{ width: maxWidthPx + 'px' }}>
      {labels.map((label) => (
        <div
          key={label}
          className={`
            absolute  transform -translate-x-1/2  bottom-0
            flex flex-col items-center  text-[0.55rem]
          `}
          style={{ left: (label / max) * 100 + '%' }}
        >
          {labelWhen(label) && <span>{label}</span>}
          <span className="text-[0.3rem]">|</span>
        </div>
      ))}
    </div>
  );
}
