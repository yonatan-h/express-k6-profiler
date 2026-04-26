import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import type { ChartData } from '../../frontend-data-types';

export function SystemInfoHeader({
  requestsTimeSeries,
  chart,
}: {
  requestsTimeSeries: { timestamp: number; requests: number }[];
  chart: ChartData;
}) {
  const tsData = requestsTimeSeries.slice(-60);
  const currentReqs = tsData[tsData.length - 1]?.requests || 0;

  return (
    <div className="flex items-center gap-4 bg-white border border-gray-200 rounded shadow-sm px-4 h-12 mb-4 shrink-0">
      <div>
        AVG Latency
        {chart.latency} ms
      </div>
      <div className="flex items-center gap-3 w-1/4 border-r border-gray-200 pr-4 h-8">
        <span className="text-[10px] font-semibold text-gray-500 uppercase">Live Req</span>
        <div className="flex-1 h-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={tsData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <Area
                type="step"
                dataKey="requests"
                stroke="#3b82f6"
                fill="#bfdbfe"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <span className="text-sm font-bold text-gray-800 w-8 text-right">{currentReqs}</span>
      </div>

      <div className="flex-1 flex items-center gap-3 overflow-x-auto h-full scrollbar-hide py-2">
        {Object.values(chart.currentInfos).map((i) => (
          <div
            key={i.backendId}
            className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded px-2 h-full"
          >
            <span
              className="text-[10px] font-medium text-gray-600 border-r border-gray-200 pr-2 truncate max-w-[80px]"
              title={i.backendId}
            >
              {i.backendId}
            </span>
            <div className="flex flex-col text-[9px] gap-0.5 justify-center">
              {[
                { k: 'cpuPercent', l: 'CPU', c: 'bg-blue-500' },
                { k: 'memoryPercent', l: 'MEM', c: 'bg-purple-500' },
              ].map(({ k, l, c }) => (
                <div key={l} className="flex items-center gap-1.5">
                  <span className="text-gray-500 w-5">{l}</span>
                  <div className="w-12 bg-gray-200 rounded-full h-1">
                    <div
                      className={`h-1 flex rounded-full ${c}`}
                      style={{
                        width: `${Math.min(100, Math.max(0, i[k as keyof typeof i] as number))}%`,
                      }}
                    />
                  </div>
                  <span className="font-semibold w-6 text-right">
                    {(i[k as keyof typeof i] as number).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
