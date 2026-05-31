import { Bar, Cell } from 'recharts';
import type { ReactElement } from 'react';

export type ChartPoint = { name: string; value: number };

export const CHART_COLORS = [
  '#22d3ee', '#a78bfa', '#34d399', '#fbbf24', '#fb7185',
  '#60a5fa', '#4ade80', '#f97316', '#e879f9', '#2dd4bf',
  '#facc15', '#818cf8',
];

export function chartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}

export const chartTick = { fill: '#64748b', fontSize: 10 };
export const chartTooltipStyle = { background: '#1e293b', border: '1px solid #334155', borderRadius: 8 };
export const chartMargin = { top: 8, right: 12, left: 0, bottom: 4 };

/** BarChart 직계 자식 — 항목별 색상 (별도 컴포넌트로 감싸면 Recharts가 막대를 못 그림) */
export function coloredBar(
  data: ChartPoint[],
  radius: [number, number, number, number] = [4, 4, 0, 0],
) {
  return (
    <Bar dataKey="value" radius={radius} minPointSize={4} fill={CHART_COLORS[0]}>
      {data.map((entry, i) => (
        <Cell key={`${entry.name}-${i}`} fill={chartColor(i)} />
      ))}
    </Bar>
  );
}

/** LineChart 포인트별 색상 dot */
export function coloredDot(props: Record<string, unknown>): ReactElement {
  const cx = Number(props.cx ?? 0);
  const cy = Number(props.cy ?? 0);
  const index = Number(props.index ?? 0);
  return <circle cx={cx} cy={cy} r={4} fill={chartColor(index)} stroke="#0f172a" strokeWidth={1} />;
}

export function coloredActiveDot(props: Record<string, unknown>): ReactElement {
  const cx = Number(props.cx ?? 0);
  const cy = Number(props.cy ?? 0);
  const index = Number(props.index ?? 0);
  return <circle cx={cx} cy={cy} r={6} fill={chartColor(index)} stroke="#fff" strokeWidth={1} />;
}

export function normalizeChartData(items: { name: string; value: number }[]): ChartPoint[] {
  return (items ?? []).map((d) => ({
    name: d.name,
    value: Number(d.value) || 0,
  }));
}

export function pieCells(count: number) {
  return Array.from({ length: count }, (_, i) => (
    <Cell key={i} fill={chartColor(i)} />
  ));
}
