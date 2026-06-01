import { useEffect, useState } from 'react';
import {
  BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line,
} from 'recharts';
import { api, Statistics } from '../api/client';
import { PageHeader } from '../components/UI';
import {
  chartMargin, chartTick, chartTooltipStyle, coloredBar, coloredDot, coloredActiveDot,
  normalizeChartData,
} from '../utils/chartColors';
import clsx from 'clsx';

export default function StatisticsPage() {
  const [stats, setStats] = useState<Statistics | null>(null);
  const [period, setPeriod] = useState<30 | 90>(30);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStats(null);
    setError(null);
    api.statistics({ days: String(period) })
      .then(setStats)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : '통계 로드 실패'));
  }, [period]);

  if (error) return <div className="text-red-400 p-4">{error}</div>;
  if (!stats) return <div className="text-slate-light">로딩 중...</div>;

  const daily = normalizeChartData(stats.daily);
  const weekly = normalizeChartData(stats.weekly);
  const byEquipment = normalizeChartData(stats.by_equipment);
  const byTestItem = normalizeChartData(stats.by_test_item);
  const byProject = normalizeChartData(stats.by_project);

  // 시험항목 × 장비 매핑 테이블 구성
  const tieData = stats.test_item_equipment ?? [];
  const tieTestItems = [...new Set(tieData.map(r => r.test_item))];
  const tieEquipments = [...new Set(tieData.map(r => r.equipment))];
  const tieMatrix: Record<string, Record<string, number>> = {};
  for (const r of tieData) {
    if (!tieMatrix[r.test_item]) tieMatrix[r.test_item] = {};
    tieMatrix[r.test_item][r.equipment] = r.count;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <PageHeader title="업무 통계" subtitle="일간/주간/월간 업무량 및 장비별 통계" />
        <div className="flex gap-1 bg-slate-800 border border-slate-700 rounded-lg p-1">
          {([30, 90] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${period === p ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              {p}일
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h3 className="text-sm font-medium text-slate-light mb-4">일간 업무량 (최근 {period}일)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={daily} margin={chartMargin}>
              <XAxis dataKey="name" tick={chartTick} tickFormatter={(v) => String(v).slice(5)} />
              <YAxis tick={chartTick} domain={[0, 'auto']} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#64748b"
                strokeWidth={2}
                dot={(props: unknown) => coloredDot(props as Record<string, unknown>)}
                activeDot={(props: unknown) => coloredActiveDot(props as Record<string, unknown>)}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="text-sm font-medium text-slate-light mb-4">주간 업무량</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weekly} margin={chartMargin}>
              <XAxis dataKey="name" tick={chartTick} />
              <YAxis tick={chartTick} domain={[0, 'auto']} />
              <Tooltip contentStyle={chartTooltipStyle} />
              {coloredBar(weekly)}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="text-sm font-medium text-slate-light mb-4">장비별 업무량</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byEquipment} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
              <XAxis type="number" tick={chartTick} domain={[0, 'auto']} />
              <YAxis type="category" dataKey="name" tick={chartTick} width={80} />
              <Tooltip contentStyle={chartTooltipStyle} />
              {coloredBar(byEquipment, [0, 4, 4, 0])}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="text-sm font-medium text-slate-light mb-4">시험항목별</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byTestItem} margin={chartMargin}>
              <XAxis dataKey="name" tick={chartTick} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={chartTick} domain={[0, 'auto']} />
              <Tooltip contentStyle={chartTooltipStyle} />
              {coloredBar(byTestItem)}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="text-sm font-medium text-slate-light mb-4">프로젝트별</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byProject} margin={chartMargin}>
              <XAxis dataKey="name" tick={chartTick} interval={0} angle={-15} textAnchor="end" height={48} />
              <YAxis tick={chartTick} domain={[0, 'auto']} />
              <Tooltip contentStyle={chartTooltipStyle} />
              {coloredBar(byProject)}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 시험항목 × 장비 매핑 테이블 */}
      {tieTestItems.length > 0 && (
        <div className="card mt-6">
          <h3 className="text-sm font-medium text-slate-light mb-4">시험항목별 사용 장비</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-600">
                  <th className="text-left px-3 py-2 text-xs text-slate-lab font-medium">시험항목</th>
                  {tieEquipments.map(eq => (
                    <th key={eq} className="text-left px-3 py-2 text-xs text-slate-lab font-medium whitespace-nowrap">{eq}</th>
                  ))}
                  <th className="text-left px-3 py-2 text-xs text-slate-lab font-medium">합계</th>
                </tr>
              </thead>
              <tbody>
                {tieTestItems.map((ti, i) => {
                  const row = tieMatrix[ti] ?? {};
                  const total = Object.values(row).reduce((s, v) => s + v, 0);
                  const maxEq = Object.entries(row).sort((a, b) => b[1] - a[1])[0]?.[0];
                  return (
                    <tr key={ti} className={clsx('border-t border-navy-800', i % 2 === 0 ? 'bg-navy-900/30' : '')}>
                      <td className="px-3 py-2 font-medium text-white whitespace-nowrap">{ti}</td>
                      {tieEquipments.map(eq => (
                        <td key={eq} className="px-3 py-2 font-mono">
                          {row[eq] ? (
                            <span className={clsx(
                              'px-2 py-0.5 rounded text-xs font-medium',
                              eq === maxEq ? 'bg-accent/20 text-accent-light' : 'text-slate-light',
                            )}>
                              {row[eq]}건
                            </span>
                          ) : (
                            <span className="text-slate-700">-</span>
                          )}
                        </td>
                      ))}
                      <td className="px-3 py-2 font-mono text-xs text-slate-light font-semibold">{total}건</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
