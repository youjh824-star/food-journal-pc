import { useState } from 'react';
import { api } from '../api/client';
import type { ReportData } from '../api/types';
import { PageHeader } from '../components/UI';
import { FileText, Download, Printer, RefreshCw, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';

// ── 날짜 헬퍼 ────────────────────────────────────────────────────────────────

function localDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getPreset(preset: string): { start: string; end: string } {
  const today = new Date();
  const end = localDateStr(today);
  if (preset === 'week') {
    const s = new Date(today); s.setDate(s.getDate() - 6);
    return { start: localDateStr(s), end };
  }
  if (preset === 'month') {
    const s = new Date(today); s.setDate(s.getDate() - 29);
    return { start: localDateStr(s), end };
  }
  if (preset === 'this_month') {
    return { start: localDateStr(new Date(today.getFullYear(), today.getMonth(), 1)), end };
  }
  if (preset === 'last_month') {
    const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const last = new Date(today.getFullYear(), today.getMonth(), 0);
    return { start: localDateStr(first), end: localDateStr(last) };
  }
  // 3months
  const s = new Date(today); s.setDate(s.getDate() - 89);
  return { start: localDateStr(s), end };
}

// ── Excel 내보내기 ────────────────────────────────────────────────────────────

function exportExcel(data: ReportData) {
  const wb = XLSX.utils.book_new();

  // 요약 시트
  const summaryRows = [
    ['업무 보고서', '', ''],
    ['기간', data.period.label, ''],
    ['생성일시', data.generated_at, ''],
    [''],
    ['항목', '값'],
    ['총 분석 건수', data.summary.total_samples],
    ['업무일지 수', data.summary.total_logs],
    ['시험항목 수', data.summary.test_item_count],
    ['프로젝트 수', data.summary.project_count],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), '요약');

  // 시험항목별
  const tiRows = [['시험항목', '건수'], ...data.by_test_item.map(r => [r.name, r.value])];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(tiRows), '시험항목별');

  // 장비별
  const eqRows = [['장비', '건수'], ...data.by_equipment.map(r => [r.name, r.value])];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(eqRows), '장비별');

  // 시험항목×장비
  if (data.test_item_equipment.length > 0) {
    const equipments = [...new Set(data.test_item_equipment.map(r => r.equipment))];
    const testItems = [...new Set(data.test_item_equipment.map(r => r.test_item))];
    const matrix: Record<string, Record<string, number>> = {};
    for (const r of data.test_item_equipment) {
      if (!matrix[r.test_item]) matrix[r.test_item] = {};
      matrix[r.test_item][r.equipment] = r.count;
    }
    const header = ['시험항목', ...equipments, '합계'];
    const rows = testItems.map(ti => {
      const row = matrix[ti] ?? {};
      const total = Object.values(row).reduce((s, v) => s + v, 0);
      return [ti, ...equipments.map(eq => row[eq] ?? 0), total];
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([header, ...rows]), '시험항목×장비');
  }

  // 프로젝트별
  const prRows = [['프로젝트', '건수'], ...data.by_project.map(r => [r.name, r.value])];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(prRows), '프로젝트별');

  // 일간 추이
  const dayRows = [['날짜', '건수'], ...data.daily.map(r => [r.name, r.value])];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dayRows), '일간추이');

  XLSX.writeFile(wb, `업무보고서_${data.period.start}_${data.period.end}.xlsx`);
}

// ── 인쇄용 보고서 ─────────────────────────────────────────────────────────────

function ReportPreview({ data }: { data: ReportData }) {
  const equipments = [...new Set(data.test_item_equipment.map(r => r.equipment))];
  const testItems = [...new Set(data.test_item_equipment.map(r => r.test_item))];
  const matrix: Record<string, Record<string, number>> = {};
  for (const r of data.test_item_equipment) {
    if (!matrix[r.test_item]) matrix[r.test_item] = {};
    matrix[r.test_item][r.equipment] = r.count;
  }

  return (
    <div id="report-content" className="space-y-6">
      {/* 헤더 */}
      <div className="card border-accent/30">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">업무 분석 보고서</h2>
            <p className="text-sm text-slate-light mt-1">기간: {data.period.label}</p>
            <p className="text-xs text-slate-lab mt-0.5">생성: {data.generated_at}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-right">
            {[
              { label: '총 분석', value: data.summary.total_samples, unit: '건' },
              { label: '업무일지', value: data.summary.total_logs, unit: '건' },
              { label: '시험항목', value: data.summary.test_item_count, unit: '종' },
              { label: '프로젝트', value: data.summary.project_count, unit: '개' },
            ].map(kpi => (
              <div key={kpi.label} className="bg-navy-900/60 rounded-lg px-4 py-2">
                <p className="text-xs text-slate-lab">{kpi.label}</p>
                <p className="text-xl font-bold font-mono text-accent-light">{kpi.value}<span className="text-xs text-slate-lab ml-1">{kpi.unit}</span></p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 시험항목 × 장비 매핑 */}
      {testItems.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-3">시험항목별 사용 장비</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-navy-900/60">
                  <th className="text-left px-3 py-2 text-xs text-slate-lab border border-navy-600">시험항목</th>
                  {equipments.map(eq => (
                    <th key={eq} className="text-center px-3 py-2 text-xs text-slate-lab border border-navy-600 whitespace-nowrap">{eq}</th>
                  ))}
                  <th className="text-center px-3 py-2 text-xs text-slate-lab border border-navy-600">합계</th>
                </tr>
              </thead>
              <tbody>
                {testItems.map(ti => {
                  const row = matrix[ti] ?? {};
                  const total = Object.values(row).reduce((s, v) => s + v, 0);
                  const maxEq = Object.entries(row).sort((a, b) => b[1] - a[1])[0]?.[0];
                  return (
                    <tr key={ti} className="border-t border-navy-800 hover:bg-navy-900/40">
                      <td className="px-3 py-2 font-medium text-white border border-navy-700">{ti}</td>
                      {equipments.map(eq => (
                        <td key={eq} className="px-3 py-2 text-center border border-navy-700">
                          {row[eq] ? (
                            <span className={eq === maxEq ? 'text-accent-light font-semibold' : 'text-slate-light'}>
                              {row[eq]}
                            </span>
                          ) : <span className="text-slate-700">-</span>}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-center font-semibold text-white border border-navy-700">{total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 시험항목별 */}
        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-3">시험항목별 분석 건수</h3>
          <div className="space-y-2">
            {data.by_test_item.map(r => {
              const pct = data.summary.total_samples > 0 ? Math.round(r.value / data.summary.total_samples * 100) : 0;
              return (
                <div key={r.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-light">{r.name}</span>
                    <span className="text-white font-mono">{r.value}건 ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-navy-700 rounded-full overflow-hidden">
                    <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 장비별 */}
        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-3">장비별 분석 건수</h3>
          <div className="space-y-2">
            {data.by_equipment.map(r => {
              const total = data.by_equipment.reduce((s, x) => s + x.value, 0);
              const pct = total > 0 ? Math.round(r.value / total * 100) : 0;
              return (
                <div key={r.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-light">{r.name}</span>
                    <span className="text-white font-mono">{r.value}건 ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-navy-700 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 프로젝트별 */}
      {data.by_project.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-3">프로젝트별 분석 건수</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {data.by_project.map(r => (
              <div key={r.name} className="bg-navy-900/60 rounded-lg px-3 py-2 flex items-center justify-between">
                <span className="text-xs text-slate-light truncate mr-2">{r.name}</span>
                <span className="text-sm font-mono text-white font-semibold flex-shrink-0">{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────

const PRESETS = [
  { id: 'week', label: '최근 7일' },
  { id: 'month', label: '최근 30일' },
  { id: 'this_month', label: '이번 달' },
  { id: 'last_month', label: '지난 달' },
  { id: '3months', label: '최근 3개월' },
  { id: 'custom', label: '직접 입력' },
] as const;

export default function ReportsPage() {
  const today = localDateStr(new Date());
  const [preset, setPreset] = useState<string>('month');
  const [customStart, setCustomStart] = useState(localDateStr(new Date(Date.now() - 29 * 86400000)));
  const [customEnd, setCustomEnd] = useState(today);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ReportData | null>(null);

  const { start, end } = preset === 'custom'
    ? { start: customStart, end: customEnd }
    : getPreset(preset);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.reportData(start, end);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : '보고서 생성 실패');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      <style>{`
        @media print {
          body > * { display: none !important; }
          #report-content, #report-content * { display: revert !important; }
          #report-content { color: #000 !important; background: #fff !important; }
          .card { border: 1px solid #ccc !important; background: #fff !important; margin-bottom: 16px; break-inside: avoid; }
          h2, h3 { color: #000 !important; }
          td, th { color: #000 !important; border-color: #ccc !important; }
          .text-accent-light, .text-white, .text-slate-light { color: #000 !important; }
          .bg-accent { background: #3b82f6 !important; }
          .bg-purple-500 { background: #8b5cf6 !important; }
        }
      `}</style>

      <PageHeader title="보고서 생성" subtitle="기간을 선택하고 업무 보고서를 생성하세요" />

      {/* 조건 설정 */}
      <div className="card space-y-4">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => setPreset(p.id)}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                preset === p.id
                  ? 'bg-accent text-white font-medium'
                  : 'bg-navy-700 text-slate-light hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {preset === 'custom' && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-lab" />
              <input type="date" className="input-field" value={customStart} onChange={e => setCustomStart(e.target.value)} max={customEnd} />
            </div>
            <span className="text-slate-lab">~</span>
            <input type="date" className="input-field" value={customEnd} onChange={e => setCustomEnd(e.target.value)} min={customStart} max={today} />
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <span className="text-sm text-slate-light">
            <span className="text-accent-light font-mono">{start}</span>
            <span className="mx-2 text-slate-lab">~</span>
            <span className="text-accent-light font-mono">{end}</span>
          </span>
          <button
            onClick={generate}
            disabled={loading}
            className="btn-primary flex items-center gap-2 ml-auto"
          >
            {loading
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> 생성 중...</>
              : <><FileText className="w-4 h-4" /> 보고서 생성</>}
          </button>
        </div>
      </div>

      {error && <div className="card text-red-400 text-sm">{error}</div>}

      {data && (
        <>
          {/* 액션 버튼 */}
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => exportExcel(data)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600/20 text-green-400 border border-green-600/30 hover:bg-green-600/30 text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" /> Excel 다운로드
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-navy-700 text-slate-light hover:text-white border border-navy-600 text-sm font-medium transition-colors"
            >
              <Printer className="w-4 h-4" /> 인쇄 / PDF 저장
            </button>
          </div>

          <ReportPreview data={data} />
        </>
      )}
    </div>
  );
}
