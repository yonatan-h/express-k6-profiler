import { useState } from 'react';
import type { ChartData, ChartEndpoint, LatenyContributor } from '../../frontend-data-types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList, ReferenceLine } from 'recharts';

const HEX_COLORS = [
  '#3b82f6', '#10b981', '#a855f7', '#f59e0b', '#ec4899',
  '#06b6d4', '#f43f5e', '#6366f1', '#14b8a6', '#f97316',
  '#d946ef', '#84cc16', '#0ea5e9', '#ef4444', '#8b5cf6',
];

function getAvgMs(ep: ChartEndpoint) {
  return ep.totalRequests > 0 ? ep.totalMs / ep.totalRequests : 0;
}
function getErrorRate(ep: ChartEndpoint) {
  const total = Object.values(ep.errors).reduce((s, e) => s + e.count, 0);
  return ep.totalRequests > 0 ? (total / ep.totalRequests) * 100 : 0;
}
function getDominantSpan(ep: ChartEndpoint) {
  return ep.spans.length ? [...ep.spans].sort((a, b) => b.avgMs - a.avgMs)[0] : null;
}

const Y_WIDTH = 210;

// Fixed x positions for each column — creates table-like vertical alignment
const COL_RANK   = -205; // rank  (#1, #2 …)
const COL_METHOD = -182; // method (GET, POST …)
const COL_PATH   = -134; // path  (/api/orders …)

const CustomYAxisTick = ({ x, y, payload, endpointMeta, isComparing }: any) => {
  const [method, ...pathParts] = payload.value.split(' ');
  const path = pathParts.join(' ');
  const meta = endpointMeta?.[payload.value] as { rank: number; delta: number | null; errorRate: number } | undefined;
  const rank = meta?.rank;
  const delta = meta?.delta;
  const errorRate = meta?.errorRate ?? 0;
  const rowY = isComparing ? -6 : 4; // shift up a bit when there's a second delta line

  return (
    <g transform={`translate(${x},${y})`}>
      {/* Column 1: rank */}
      {rank !== undefined && (
        <text x={COL_RANK} y={rowY} textAnchor="start" fontSize={10} fontWeight="700" fontFamily="inherit"
          fill={rank === 1 ? '#ef4444' : rank === 2 ? '#f97316' : '#9ca3af'}>
          #{rank}
        </text>
      )}
      {/* Column 2: method — fixed-width slot so paths always start at the same x */}
      <text x={COL_METHOD} y={rowY} textAnchor="start" fontSize={10} fontWeight="600" fontFamily="inherit" fill="#9ca3af">
        {method}
      </text>
      {/* Column 3: path */}
      <text x={COL_PATH} y={rowY} textAnchor="start" fontSize={11} fontFamily="inherit" fill="#374151">
        {path}
      </text>
      {/* Row 2: delta or error rate — aligned with path column */}
      {isComparing && (errorRate > 0 || (delta !== null && delta !== undefined)) && (
        <text x={COL_PATH} y={8} textAnchor="start" fontSize={9} fontWeight="600" fontFamily="inherit"
          fill={errorRate > 0 ? '#ef4444' : (delta ?? 0) > 0 ? '#ef4444' : '#10b981'}>
          {errorRate > 0
            ? `⚠ ${errorRate.toFixed(1)}% errors`
            : `${(delta ?? 0) > 0 ? '▲' : '▼'} ${Math.abs(delta ?? 0).toFixed(0)}ms`}
        </text>
      )}
    </g>
  );
};

const CustomBarShape = (props: any) => {
  const { x, y, width, height, fill, fillOpacity } = props;
  if (!width || width <= 0) return null;
  return <rect x={x} y={y} width={width} height={height} fill={fill} fillOpacity={fillOpacity ?? 1} rx={2} />;
};

export function EndpointsAndContributors({ chart }: { chart: ChartData }) {
  const visible = chart.endPoints.filter((e) => !e.hidden && (e.current || e.prev));
  const [selectedCodeId, setSelectedCodeId] = useState<string | null>(null);

  const isComparing = visible.some((e) => e.prev !== null);

  if (visible.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <div className="text-3xl mb-2">🔍</div>
        <p className="font-semibold text-gray-700 text-sm">No data yet — run a load test to see latency breakdown</p>
        <div className="mt-4 flex justify-center flex-wrap gap-1.5 text-xs text-gray-400">
          {['1. Run k6', '2. Set Baseline', '3. Change code', '4. Run again', '5. See result'].map((s, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <span className="bg-gray-100 px-2 py-0.5 rounded">{s}</span>
              {i < 4 && <span className="text-gray-300">→</span>}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // Sort by avg ms descending — biggest bottleneck first
  const sorted = [...visible].sort((a, b) => {
    const aMs = a.current ? getAvgMs(a.current) : (a.prev ? getAvgMs(a.prev) : 0);
    const bMs = b.current ? getAvgMs(b.current) : (b.prev ? getAvgMs(b.prev) : 0);
    return bMs - aMs;
  });

  // Build codeId→color map
  const codeIdMap = new Map<string, { name: string; color: string }>();
  let ci = 0;
  sorted.forEach((ep) => {
    const add = (spans: any[]) => spans.forEach((s) => {
      if (!codeIdMap.has(s.codeId)) codeIdMap.set(s.codeId, { name: s.name, color: HEX_COLORS[ci++ % HEX_COLORS.length] });
    });
    if (ep.current) add(ep.current.spans);
    if (ep.prev) add(ep.prev.spans);
  });

  // Metadata per endpoint key for Y-axis tick
  const endpointMeta: Record<string, { rank: number; delta: number | null; errorRate: number }> = {};
  sorted.forEach((ep, i) => {
    const key = `${ep.current?.method || ep.prev?.method} ${ep.current?.path || ep.prev?.path}`;
    const curr = ep.current ? getAvgMs(ep.current) : null;
    const prev = ep.prev ? getAvgMs(ep.prev) : null;
    endpointMeta[key] = {
      rank: i + 1,
      delta: curr !== null && prev !== null ? curr - prev : null,
      errorRate: ep.current ? getErrorRate(ep.current) : 0,
    };
  });

  const chartData = sorted.map((ep) => {
    const dp: any = {
      name: `${ep.current?.method || ep.prev?.method} ${ep.current?.path || ep.prev?.path}`,
    };
    if (ep.current) {
      const avg = getAvgMs(ep.current);
      dp.current_totalAvgMs = avg;
      dp.current_unaccounted = Math.max(0, avg - ep.current.spans.reduce((s, sp) => s + sp.avgMs, 0));
      ep.current.spans.forEach((sp) => { dp[`current_${sp.codeId}`] = sp.avgMs; });
    }
    if (ep.prev) {
      const avg = getAvgMs(ep.prev);
      dp.prev_totalAvgMs = avg;
      dp.prev_unaccounted = Math.max(0, avg - ep.prev.spans.reduce((s, sp) => s + sp.avgMs, 0));
      ep.prev.spans.forEach((sp) => { dp[`prev_${sp.codeId}`] = sp.avgMs; });
    }
    return dp;
  });

  // Top bottleneck spotlight
  const top = sorted[0];
  const topCurrent = top?.current;
  const topDominant = topCurrent ? getDominantSpan(topCurrent) : null;
  const topDominantColor = topDominant ? codeIdMap.get(topDominant.codeId)?.color : undefined;

  // Compact row heights — key to fitting the page
  const rowHeight = isComparing ? 60 : 40;
  const chartHeight = sorted.length * rowHeight + 44;
  const targetMs = isComparing ? chart.prevLatency : null;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    const hasCurrent = p.current_totalAvgMs !== undefined;
    const hasPrev = p.prev_totalAvgMs !== undefined;
    const meta = endpointMeta[label];

    const renderSection = (prefix: 'current_' | 'prev_', title: string, totalMs: number) => {
      const items = [...payload].filter((e: any) => e.dataKey.startsWith(prefix) && e.value > 0).reverse();
      if (!items.length && !totalMs) return null;
      return (
        <div className="mb-2.5 last:mb-0">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{title}</span>
            <span className="text-xs font-bold text-gray-900">{totalMs.toFixed(1)}ms</span>
          </div>
          <div className="flex flex-col gap-0.5 pl-2 border-l-2 border-gray-100">
            {items.map((entry: any, i: number) => {
              const codeId = entry.dataKey.replace(prefix, '');
              const name = codeId === 'unaccounted' ? 'Other / overhead' : (codeIdMap.get(codeId)?.name ?? codeId);
              const pct = totalMs > 0 ? ((entry.value / totalMs) * 100).toFixed(0) : '0';
              return (
                <div key={i} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: entry.color, opacity: prefix === 'prev_' ? 0.4 : 1 }} />
                    <span className="text-[11px] text-gray-600 truncate font-mono">{name}</span>
                  </div>
                  <span className="text-[11px] font-semibold text-gray-800 shrink-0">{entry.value.toFixed(1)}ms <span className="text-gray-400 font-normal">({pct}%)</span></span>
                </div>
              );
            })}
          </div>
        </div>
      );
    };

    return (
      <div className="bg-white p-3 border border-gray-200 shadow-xl rounded-xl text-sm min-w-[240px]">
        <div className="flex items-center justify-between gap-4 mb-2 pb-1.5 border-b border-gray-100">
          <p className="font-bold text-gray-900 text-xs truncate">{label}</p>
          <div className="flex gap-2 shrink-0">
            {meta?.errorRate > 0 && <span className="text-[10px] font-bold text-red-500">⚠ {meta.errorRate.toFixed(1)}% err</span>}
            {isComparing && meta?.delta != null && (
              <span className={`text-[10px] font-bold ${meta.delta > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                {meta.delta > 0 ? '+' : ''}{meta.delta.toFixed(0)}ms
              </span>
            )}
          </div>
        </div>
        {hasCurrent && renderSection('current_', isComparing ? 'Now' : 'Response time', p.current_totalAvgMs)}
        {hasPrev && renderSection('prev_', 'Baseline', p.prev_totalAvgMs)}
      </div>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Section header */}
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
        <div>
          <span className="font-semibold text-gray-900 text-sm">Where is time being spent?</span>
          <span className="text-xs text-gray-400 ml-2">sorted by impact — fix #1 first</span>
        </div>
        {isComparing && (
          <div className="flex items-center gap-3 text-[10px] text-gray-400">
            <span className="flex items-center gap-1"><span className="inline-block w-5 h-2 rounded" style={{ background: '#3b82f6', opacity: 0.35 }} /> Baseline</span>
            <span className="flex items-center gap-1"><span className="inline-block w-5 h-2 rounded bg-blue-500" /> Now</span>
          </div>
        )}
      </div>

      {/* #1 fix-first — subtle note, not a noisy colored box */}
      {topCurrent && topDominant && (
        <div className="mx-4 mt-2 mb-1 flex items-center gap-2 text-xs text-gray-400">
          <span className="shrink-0">🎯</span>
          <span>
            Start with{' '}
            <span className="font-mono text-gray-600 font-medium">{topCurrent.method} {topCurrent.path}</span>
            {' '}—{' '}
            <span className="w-2 h-2 rounded-sm inline-block align-middle" style={{ backgroundColor: topDominantColor }} />
            {' '}
            <span className="text-gray-500 font-mono">{topDominant.name}</span>
            {' '}is taking <span className="font-semibold text-gray-600">{topDominant.avgMs.toFixed(0)}ms</span>
          </span>
        </div>
      )}

      {/* Chart */}
      <div className="px-2 pt-2 pb-1" style={{ height: chartHeight + 32 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical"
            margin={{ top: 8, right: 56, left: Y_WIDTH, bottom: 4 }}
            barCategoryGap="20%" barGap={2}>
            <XAxis type="number" tickFormatter={(v) => `${v}ms`}
              tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={{ stroke: '#f3f4f6' }} tickLine={false} />
            <YAxis dataKey="name" type="category"
              tick={<CustomYAxisTick endpointMeta={endpointMeta} isComparing={isComparing} />}
              axisLine={false} tickLine={false} width={Y_WIDTH} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />

            {targetMs !== null && targetMs > 0 && (
              <ReferenceLine x={targetMs} stroke="#f97316" strokeDasharray="3 2" strokeWidth={1.5}
                label={{ value: 'baseline', position: 'insideTopRight', fontSize: 9, fill: '#f97316' }} />
            )}

            {/* Prev bars (faded) */}
            {Array.from(codeIdMap.entries()).map(([codeId, { color }]) => (
              <Bar key={`prev_${codeId}`} dataKey={`prev_${codeId}`} stackId="prev"
                fill={color} fillOpacity={0.35} shape={<CustomBarShape />} isAnimationActive={false} />
            ))}
            <Bar dataKey="prev_unaccounted" stackId="prev" fill="#e5e7eb"
              fillOpacity={0.4} shape={<CustomBarShape />} isAnimationActive={false} />

            {/* Current bars */}
            {Array.from(codeIdMap.entries()).map(([codeId, { color }]) => (
              <Bar key={`current_${codeId}`} dataKey={`current_${codeId}`} stackId="current"
                fill={color} shape={<CustomBarShape />} isAnimationActive={false} />
            ))}
            <Bar dataKey="current_unaccounted" stackId="current" fill="#d1d5db"
              shape={<CustomBarShape />} isAnimationActive={false}>
              <LabelList dataKey="current_totalAvgMs" position="right"
                formatter={(v: any) => v > 0 ? `${v.toFixed(0)}ms` : ''}
                style={{ fontSize: 10, fill: '#6b7280', fontWeight: 600 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend — click a chip to inspect code & sub-contributors */}
      {codeIdMap.size > 0 && (
        <div className="px-4 py-2.5 border-t border-gray-100 flex flex-wrap gap-2">
          {Array.from(codeIdMap.entries()).map(([codeId, { name, color }]) => {
            const isSelected = selectedCodeId === codeId;
            return (
              <button
                key={codeId}
                onClick={() => setSelectedCodeId(isSelected ? null : codeId)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md border transition-colors text-[11px] cursor-pointer ${
                  isSelected
                    ? 'border-gray-400 bg-gray-100 text-gray-800'
                    : 'border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 text-gray-600'
                }`}
                title={`Click to inspect ${name}`}
              >
                <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: color }} />
                <span className="font-mono">{name}</span>
                {isSelected && <span className="ml-0.5 text-gray-400">✕</span>}
              </button>
            );
          })}
          <button
            className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 transition-colors text-[11px] text-gray-400 cursor-pointer"
            title="Un-instrumented code / framework overhead"
          >
            <span className="w-2 h-2 rounded-sm shrink-0 bg-gray-300" />
            <span>overhead</span>
          </button>
        </div>
      )}

      {/* Detail panel — shown when a chip is selected */}
      {selectedCodeId && (() => {
        const contributor = chart.contributors.find(
          (c) => !c.hidden && c.current?.codeId === selectedCodeId
        );
        const current: LatenyContributor | undefined = contributor?.current;
        const prev: LatenyContributor | null | undefined = contributor?.prev;
        if (!current) return null;

        const code = current.code;
        const hasDelta = prev && prev.avgMs > 0;
        const deltaMs = hasDelta ? current.avgMs - prev.avgMs : null;

        return (
          <div className="mx-4 mb-4 border border-gray-200 rounded-lg overflow-hidden">
            {/* Panel header */}
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: codeIdMap.get(selectedCodeId)?.color }} />
                <span className="font-mono text-sm font-semibold text-gray-800">{current.name}</span>
                <span className="text-xs text-gray-400 capitalize">{current.type.replace('-', ' ')}</span>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-gray-500">
                  <span className="font-semibold text-gray-800">{current.avgMs.toFixed(1)}ms</span> avg
                </span>
                {hasDelta && deltaMs !== null && (
                  <span className={`font-semibold ${deltaMs > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                    {deltaMs > 0 ? '+' : ''}{deltaMs.toFixed(1)}ms vs baseline
                  </span>
                )}
                <span className="text-gray-400">{current.count.toLocaleString()} calls</span>
              </div>
            </div>

            {/* Code snippet */}
            {code ? (
              <div className="bg-gray-950 text-gray-100">
                <div className="px-4 py-1.5 border-b border-gray-800 flex items-center gap-2 text-[10px] text-gray-500">
                  <span className="font-mono">{code.filePath}</span>
                  <span className="text-gray-700">·</span>
                  <span>line {code.lineNumber}</span>
                </div>
                <pre className="px-4 py-3 text-xs font-mono overflow-x-auto leading-relaxed">
                  <code>{code.content}</code>
                </pre>
              </div>
            ) : (
              <div className="px-4 py-3 text-xs text-gray-400 italic">
                No source location captured for this contributor.
              </div>
            )}

            {/* Sub-contributors */}
            {current.subContributors.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-200">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Sub-contributors</p>
                <div className="flex flex-col gap-1.5">
                  {current.subContributors.map((sub) => (
                    <div key={sub.codeId} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-gray-700">{sub.name}</span>
                        <span className="text-gray-400 capitalize text-[10px]">{sub.type.replace('-', ' ')}</span>
                      </div>
                      <span className="font-semibold text-gray-600">{sub.avgMs.toFixed(1)}ms</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
