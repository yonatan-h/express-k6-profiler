import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  type TooltipProps,
  type TooltipContentProps,
  BarChart,
} from 'recharts';

const path = window.location.pathname;
const BACKEND_PREFIX = `${window.location.origin}${path}${path.endsWith('/') ? '' : '/'}api`;


function Step1() {
  // Area Charts require NUMERICAL values to draw the graph heights!
  const data = [
    { name: '0s', latency: 45, errors: 5 },
    { name: '1s', latency: 120, errors: 7 },
    { name: '2s', latency: 80, errors: 500 },
    { name: '3s', latency: 180, errors: 9 },
    { name: '6s', latency: 50, errors: 450 },
  ];
  return (
    <ResponsiveContainer className={'border'} width={'100%'} height={500}>
      <BarChart data={data} margin={{ right: 30 }}>
        <CartesianGrid strokeDasharray="5 5" />
        <Area type={'monotone'} dataKey="latency" stackId={'1'} />
        <Area type={'monotone'} dataKey="errors" stackId={'2'} />
        <XAxis dataKey={'name'} />
        <YAxis />
        <Legend />
        <Tooltip content={MyToolTip} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function MyToolTip({ active, payload, label }: TooltipContentProps<number, string>) {
  return (
    <div>
      <p>{active && 'active'}</p>
      <p>{label}</p>
      {payload.map((p) => (
        <p>{p.value}</p>
      ))}
    </div>
  );
}

export default function App() {
  const [m, sm] = useState<ResponseType | null>(null);
  useEffect(() => {
    const id = setInterval(async () => {
      // Because we injected a <base> tag in development, relative fetches would hit 3011.
      // So we explicitly construct the absolute URL to ensure we hit the 3010 backend securely.
      const res = await fetch(`${BACKEND_PREFIX}/all`);
      const data = await res.json();
      sm(data);
    }, 500);

    return () => clearInterval(id);
  }, []);

  return (
    <div className="">
      <div className="border">
        hij
        <Step1 />
      </div>
    </div>
  );
}
