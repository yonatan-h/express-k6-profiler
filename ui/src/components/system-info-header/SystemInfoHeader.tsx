import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import type { ChartData } from '../../frontend-data-types';

function latencyLabel(ms: number): { color: string; label: string; dot: string } {
  if (ms < 100) return { color: 'text-emerald-600', label: 'Fast', dot: 'bg-emerald-500' };
  if (ms < 500) return { color: 'text-amber-600', label: 'Moderate', dot: 'bg-amber-400' };
  return { color: 'text-red-600', label: 'Slow', dot: 'bg-red-500' };
}

export function SystemInfoHeader({
  requestsTimeSeries,
  chart,
}: {
  requestsTimeSeries: { timestamp: number; requests: number }[];
  chart: ChartData;
}) {
  const tsData = requestsTimeSeries.slice(-60);
  const currentReqs = tsData[tsData.length - 1]?.requests ?? 0;
  const backends = Object.values(chart.currentInfos);
  const isComparing = chart.prevLatency > 0;
  const deltaMs = isComparing ? chart.latency - chart.prevLatency : null;
  const { color, label, dot } = latencyLabel(chart.latency);

  return (
    <div className="bg-white border border-gray-200 rounded-lg flex items-center px-4 gap-6 h-11">

      {/* Latency — the most important number, slightly larger */}
      <div className="flex items-center gap-2 shrink-0">
        <div className={`w-1.5 h-5 rounded-full ${dot}`} />
        <span className="text-xl font-bold tabular-nums text-gray-900">
          {chart.latency < 1 ? '<1' : chart.latency.toFixed(0)}
          <span className="text-xs font-medium text-gray-400 ml-0.5">ms</span>
        </span>
        <span className={`text-xs font-semibold ${color}`}>{label}</span>
        {deltaMs !== null && (
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${deltaMs > 0 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
            {deltaMs > 0 ? '+' : ''}{deltaMs.toFixed(0)}ms
          </span>
        )}
      </div>

      {/* Thin separator */}
      <div className="w-px h-6 bg-gray-200 shrink-0" />

      {/* Live requests — number + tiny sparkline together */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-gray-400">live</span>
        <span className="text-sm font-bold text-gray-900 tabular-nums">{currentReqs}</span>
        <div className="w-14 h-6 opacity-60">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={tsData} margin={{ top: 1, right: 0, left: 0, bottom: 1 }}>
              <Area type="monotone" dataKey="requests" stroke="#3b82f6" strokeWidth={1.5}
                fill="#dbeafe" isAnimationActive={false} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sampled */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-xs text-gray-400">sampled</span>
        <span className="text-sm font-bold text-gray-900 tabular-nums">{chart.totalRequests.toLocaleString()}</span>
      </div>

      {/* Backend health — only show if present, right-aligned */}
      {backends.length > 0 && (
        <div className="flex items-center gap-3 ml-auto overflow-x-auto">
          {backends.map((i) => {
            const maxUsage = Math.max(i.cpuPercent, i.memoryPercent);
            return (
              <div key={i.backendId} className="flex items-center gap-2 text-xs shrink-0">
                <span className="font-mono text-gray-400 truncate max-w-[80px]" title={i.backendId}>{i.backendId}</span>
                {([['cpuPercent', 'CPU'], ['memoryPercent', 'MEM']] as const).map(([k, lbl]) => {
                  const val = i[k as keyof typeof i] as number;
                  return (
                    <span key={lbl} className={`${val > 80 ? 'text-red-500' : 'text-gray-500'}`}>
                      {lbl} <span className="font-semibold">{val.toFixed(0)}%</span>
                    </span>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
