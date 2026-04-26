import type { ChartData } from '../../frontend-data-types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const HEX_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#a855f7', // purple-500
  '#f59e0b', // amber-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#f43f5e', // rose-500
  '#6366f1', // indigo-500
  '#14b8a6', // teal-500
  '#f97316', // orange-500
  '#d946ef', // fuchsia-500
  '#84cc16', // lime-500
  '#0ea5e9', // sky-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
];

const CustomYAxisTick = ({ x, y, payload }: any) => {
  const [method, ...pathParts] = payload.value.split(' ');
  const path = pathParts.join(' ');
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={-10} y={0} dy={4} textAnchor="end" fill="#374151" fontSize={12}>
        <tspan fill="#9ca3af" fontWeight="bold">{method}</tspan>{' '}
        <tspan>{path}</tspan>
      </text>
    </g>
  );
};

export function EndpointsAndContributors({ chart }: { chart: ChartData }) {
  const visibleEndpoints = chart.endPoints.filter((e) => !e.hidden && (e.current || e.prev));

  if (visibleEndpoints.length === 0) {
    return (
      <div className="text-gray-500 mt-8">No endpoint data available yet. Send some requests!</div>
    );
  }

  // Calculate unique codeIds and their corresponding names, and assign a color
  const codeIdMap = new Map<string, { name: string; color: string }>();
  let colorIndex = 0;

  visibleEndpoints.forEach((ep) => {
    const processSpans = (spans: any[]) => {
      spans.forEach((span) => {
        if (!codeIdMap.has(span.codeId)) {
          codeIdMap.set(span.codeId, {
            name: span.name,
            color: HEX_COLORS[colorIndex % HEX_COLORS.length],
          });
          colorIndex++;
        }
      });
    };
    if (ep.current) processSpans(ep.current.spans);
    if (ep.prev) processSpans(ep.prev.spans);
  });

  const chartData = visibleEndpoints.map((ep) => {
    const dataPoint: any = {
      name: `${ep.current?.method || ep.prev?.method} ${ep.current?.path || ep.prev?.path}`,
    };

    if (ep.current) {
      const epAvgMs = ep.current.totalRequests > 0 ? ep.current.totalMs / ep.current.totalRequests : 0;
      const sumSpansAvgMs = ep.current.spans.reduce((acc, span) => acc + span.avgMs, 0);
      const unaccountedAvgMs = Math.max(0, epAvgMs - sumSpansAvgMs);

      dataPoint.current_totalAvgMs = epAvgMs;
      dataPoint.current_unaccounted = unaccountedAvgMs;
      ep.current.spans.forEach((span) => {
        dataPoint[`current_${span.codeId}`] = span.avgMs;
      });
    }

    if (ep.prev) {
      const epAvgMs = ep.prev.totalRequests > 0 ? ep.prev.totalMs / ep.prev.totalRequests : 0;
      const sumSpansAvgMs = ep.prev.spans.reduce((acc, span) => acc + span.avgMs, 0);
      const unaccountedAvgMs = Math.max(0, epAvgMs - sumSpansAvgMs);

      dataPoint.prev_totalAvgMs = epAvgMs;
      dataPoint.prev_unaccounted = unaccountedAvgMs;
      ep.prev.spans.forEach((span) => {
        dataPoint[`prev_${span.codeId}`] = span.avgMs;
      });
    }

    return dataPoint;
  });

  const chartHeight = Math.max(visibleEndpoints.length * 80 + 40, 200);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      const hasCurrent = p.current_totalAvgMs !== undefined;
      const hasPrev = p.prev_totalAvgMs !== undefined;

      const renderSection = (prefix: 'current_' | 'prev_', title: string, totalAvgMs: number) => {
        const sectionPayload = [...payload]
          .filter((entry: any) => entry.dataKey.startsWith(prefix) && entry.value > 0)
          .reverse();

        if (sectionPayload.length === 0 && totalAvgMs === 0) return null;

        return (
          <div className="mb-4 last:mb-0">
            <p className="font-semibold text-gray-800 mb-2">{title} <span className="font-normal text-gray-500">({totalAvgMs.toFixed(1)}ms)</span></p>
            <div className="flex flex-col gap-1.5 pl-2 border-l-2 border-gray-200">
              {sectionPayload.map((entry: any, index: number) => {
                const codeId = entry.dataKey.replace(prefix, '');
                const name = codeId === 'unaccounted' 
                  ? 'Un-instrumented / Overhead' 
                  : codeIdMap.get(codeId)?.name || codeId;
                  
                return (
                  <div key={index} className="flex items-center justify-between gap-6">
                    <div className="flex items-center gap-2 max-w-[250px]">
                      <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: entry.color, opacity: prefix === 'prev_' ? 0.4 : 1 }} />
                      <span className="text-gray-600 truncate font-mono text-xs" title={name}>{name}</span>
                    </div>
                    <span className="font-medium text-gray-900 text-xs">{entry.value.toFixed(1)}ms</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      };

      return (
        <div className="bg-white p-4 border border-gray-200 shadow-xl rounded-lg text-sm z-50 min-w-[280px]">
          <p className="font-bold mb-3 pb-2 border-b border-gray-100">{label}</p>
          {hasCurrent && renderSection('current_', 'Current State', p.current_totalAvgMs)}
          {hasPrev && renderSection('prev_', 'Previous State', p.prev_totalAvgMs)}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-6 mt-4 w-full">
      <div>
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Average Latency Contribution</h2>

        {/* Recharts Barchart */}
        <div className="w-full bg-gray-50/50 p-4 rounded-xl border border-gray-100" style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 10, right: 30, left: 150, bottom: 10 }}
              barCategoryGap="15%"
            >
              <XAxis 
                type="number" 
                tickFormatter={(value) => `${value}ms`}
                tick={{ fill: '#6b7280', fontSize: 12 }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickLine={false}
              />
              <YAxis 
                dataKey="name" 
                type="category" 
                tick={<CustomYAxisTick />}
                axisLine={false}
                tickLine={false}
                width={150}
              />
              <Tooltip 
                content={<CustomTooltip />} 
                cursor={{ fill: '#f3f4f6' }}
              />
              
              {/* PREV Stacked Bars */}
              {Array.from(codeIdMap.entries()).map(([codeId, { color }]) => (
                <Bar 
                  key={`prev_${codeId}`} 
                  dataKey={`prev_${codeId}`} 
                  stackId="prev" 
                  fill={color}
                  fillOpacity={0.35}
                  isAnimationActive={true}
                />
              ))}
              <Bar 
                dataKey="prev_unaccounted" 
                stackId="prev" 
                fill="#e5e7eb"
                fillOpacity={0.5}
                isAnimationActive={true}
              />

              {/* CURRENT Stacked Bars */}
              {Array.from(codeIdMap.entries()).map(([codeId, { color }]) => (
                <Bar 
                  key={`current_${codeId}`} 
                  dataKey={`current_${codeId}`} 
                  stackId="current" 
                  fill={color} 
                  isAnimationActive={true}
                />
              ))}
              <Bar 
                dataKey="current_unaccounted" 
                stackId="current" 
                fill="#d1d5db" 
                isAnimationActive={true}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Color Key */}
        <div className="mt-8 border-t border-gray-100 pt-6">
          <h3 className="text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wider">
            Code Contributors
          </h3>
          <div className="flex flex-col gap-3">
            {Array.from(codeIdMap.entries()).map(([codeId, { name, color }]) => (
              <div key={codeId} className="flex items-start gap-3">
                <div className="flex gap-1 mt-0.5 shrink-0">
                  <div className="w-3 h-3 rounded-sm shadow-sm" style={{ backgroundColor: color, opacity: 0.35 }}></div>
                  <div className="w-3 h-3 rounded-sm shadow-sm" style={{ backgroundColor: color }}></div>
                </div>
                <span className="text-sm font-medium text-gray-700 break-all bg-gray-50 px-2 py-0.5 rounded border border-gray-200 font-mono">
                  {name}
                </span>
              </div>
            ))}
            <div className="flex items-start gap-3">
              <div className="flex gap-1 mt-0.5 shrink-0">
                <div className="w-3 h-3 rounded-sm shadow-sm" style={{ backgroundColor: '#e5e7eb', opacity: 0.5 }}></div>
                <div className="w-3 h-3 rounded-sm shadow-sm" style={{ backgroundColor: '#d1d5db' }}></div>
              </div>
              <span className="text-sm font-medium text-gray-700 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                Un-instrumented / Overhead
              </span>
            </div>
            
            <div className="mt-4 flex items-center gap-4 text-xs font-medium text-gray-500">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-gray-400 opacity-35"></div> Previous State</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-gray-400"></div> Current State</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
