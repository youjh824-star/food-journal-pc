import { useCallback, useEffect, useState } from 'react';
import { api, Sample, SampleCompareResult } from '../api/client';
import { Badge } from '../components/UI';
import { Search, RotateCcw, Trash2, X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import clsx from 'clsx';

// ── 시험항목별 스타일 ──────────────────────────────────────────────────────
const TEST_ITEM_STYLE: Record<string, { icon: string; bg: string; tag: string }> = {
  '조단백':    { icon: '🧪', bg: 'bg-blue-500/10',    tag: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  '비타민 A':  { icon: '💊', bg: 'bg-green-500/10',   tag: 'bg-green-500/15 text-green-400 border-green-500/20' },
  '비타민 E':  { icon: '💊', bg: 'bg-emerald-500/10', tag: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  '비타민 A/E':{ icon: '💊', bg: 'bg-green-500/10',   tag: 'bg-green-500/15 text-green-400 border-green-500/20' },
  '중금속':    { icon: '⚗️', bg: 'bg-orange-500/10',  tag: 'bg-orange-500/15 text-orange-400 border-orange-500/20' },
  '무기비소':  { icon: '🔍', bg: 'bg-purple-500/10',  tag: 'bg-purple-500/15 text-purple-400 border-purple-500/20' },
  'default':   { icon: '🔬', bg: 'bg-slate-500/10',   tag: 'bg-slate-500/15 text-slate-400 border-slate-500/20' },
};
function getStyle(ti: string) {
  for (const [k, s] of Object.entries(TEST_ITEM_STYLE)) {
    if (k !== 'default' && ti?.includes(k)) return s;
  }
  return TEST_ITEM_STYLE['default'];
}

// ── 재실험 비교 결과 타입 (백엔드 신규 필드) ─────────────────────────────
interface RetestEntry {
  id: number;
  sample_name: string;
  result: string | null;
  unit: string | null;
  date: string | null;
  receipt_number: string | null;
  delta?: number | null;
  delta_pct?: number | null;
  label?: string | null;
  color?: 'green' | 'yellow' | 'red' | null;
}
interface RetestRow {
  test_item: string;
  original: RetestEntry | null;
  retests: RetestEntry[];
}
interface CompareGroup {
  sample_name: string;
  entries: Sample[];
  companies: string[];
  matrix: { test_item: string; values: Record<string, { result?: string; unit?: string; receipt_number?: string; receipt_date?: string; analysis_date?: string; id: number; is_retest?: boolean }> }[];
  retest_table: RetestRow[];
  has_retest: boolean;
  has_company: boolean;
}
interface CompareResult {
  mode: 'list' | 'compare';
  groups: CompareGroup[];
  samples: Sample[];
}

// ── 샘플 그룹화 ──────────────────────────────────────────────────────────

// ── 전체 삭제 모달 ────────────────────────────────────────────────────────
function BulkDeleteModal({ totalCount, onClose, onConfirm }: { totalCount: number; onClose: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="card w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <h3 className="text-base font-semibold text-white">전체 샘플 삭제</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-lab" /></button>
        </div>
        <p className="text-sm text-slate-light"><span className="text-red-400 font-medium">{totalCount}건</span>의 샘플을 모두 삭제합니다.</p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl bg-navy-700 text-slate-light text-sm transition-colors">취소</button>
          <button onClick={onConfirm} className="flex-1 py-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 text-sm font-medium transition-colors">삭제</button>
        </div>
      </div>
    </div>
  );
}

// ── 델타 뱃지 ─────────────────────────────────────────────────────────────
function DeltaBadge({ entry }: { entry: RetestEntry }) {
  if (!entry.label) return null;
  const colorMap = {
    green:  'bg-green-500/15 text-green-400 border-green-500/25',
    yellow: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
    red:    'bg-red-500/15 text-red-400 border-red-500/25',
  };
  const cls = colorMap[entry.color ?? 'green'] ?? colorMap.green;
  const Icon = (entry.delta ?? 0) > 0 ? TrendingUp : (entry.delta ?? 0) < 0 ? TrendingDown : Minus;
  return (
    <span className={clsx('inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border font-medium', cls)}>
      <Icon className="w-3 h-3" /> {entry.label}
    </span>
  );
}

// ── 재실험 비교 뷰 ────────────────────────────────────────────────────────
function RetestCompareView({ groups }: { groups: CompareGroup[] }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-accent-light bg-accent/10 border border-accent/20 rounded-lg px-3 py-2">
        <span>🔄</span>
        <span>동일 시료명의 원본값과 재실험값을 비교합니다.</span>
      </div>

      {groups.map(g => (
        <div key={g.sample_name} className="card p-0 overflow-hidden">
          {/* 그룹 헤더 */}
          <div className="px-4 py-3 border-b border-navy-600 bg-navy-900/50 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white">{g.sample_name}</h3>
              <p className="text-xs text-slate-lab mt-0.5">
                {g.entries.length}건
                {g.has_retest && <span className="ml-2 text-yellow-400">재실험 포함</span>}
                {g.has_company && g.companies.length > 0 && <span className="ml-2">{g.companies.length}개 업체</span>}
              </p>
            </div>
            <div className="flex gap-1.5">
              {g.has_retest && <span className="text-[11px] px-2 py-0.5 rounded border bg-yellow-500/10 text-yellow-400 border-yellow-500/20">재실험</span>}
              {g.has_company && <span className="text-[11px] px-2 py-0.5 rounded border bg-blue-500/10 text-blue-400 border-blue-500/20">업체비교</span>}
            </div>
          </div>

          {/* 재실험 비교 테이블 */}
          {g.has_retest && g.retest_table.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-navy-900/40 border-b border-navy-700">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs text-slate-light w-28">시험항목</th>
                    <th className="text-left px-4 py-2 text-xs text-slate-light">원본</th>
                    <th className="text-left px-4 py-2 text-xs text-slate-light">재실험</th>
                    <th className="text-left px-4 py-2 text-xs text-slate-light w-32">변화량</th>
                  </tr>
                </thead>
                <tbody>
                  {g.retest_table.map(row => {
                    const st = getStyle(row.test_item);
                    return (
                      <tr key={row.test_item} className="border-t border-navy-800 hover:bg-navy-900/30 transition-colors">
                        {/* 시험항목 */}
                        <td className="px-4 py-3">
                          <span className={clsx('text-[11px] px-2 py-0.5 rounded border font-medium', st.tag)}>
                            {row.test_item}
                          </span>
                        </td>

                        {/* 원본 */}
                        <td className="px-4 py-3">
                          {row.original ? (
                            <div>
                              <p className="font-mono text-white text-sm font-semibold">
                                {row.original.result ?? '-'}
                                <span className="text-xs text-slate-lab ml-1">{row.original.unit}</span>
                              </p>
                              <p className="text-[10px] text-slate-lab mt-0.5">{row.original.sample_name}</p>
                              <p className="text-[10px] text-slate-lab">{row.original.date}</p>
                            </div>
                          ) : <span className="text-slate-lab text-xs">-</span>}
                        </td>

                        {/* 재실험 (여러 건 세로 나열) */}
                        <td className="px-4 py-3">
                          {row.retests.length > 0 ? (
                            <div className="space-y-2">
                              {row.retests.map((r, i) => (
                                <div key={i} className="border-l-2 border-yellow-500/40 pl-2">
                                  <p className="font-mono text-yellow-300 text-sm font-semibold">
                                    {r.result ?? '-'}
                                    <span className="text-xs text-slate-lab ml-1">{r.unit}</span>
                                  </p>
                                  <p className="text-[10px] text-slate-lab mt-0.5">{r.sample_name}</p>
                                  <p className="text-[10px] text-slate-lab">{r.date}</p>
                                </div>
                              ))}
                            </div>
                          ) : <span className="text-slate-lab text-xs">-</span>}
                        </td>

                        {/* 변화량 */}
                        <td className="px-4 py-3">
                          <div className="space-y-1.5">
                            {row.retests.map((r, i) => (
                              <div key={i}>
                                <DeltaBadge entry={r} />
                                {r.delta !== null && r.delta !== undefined && (
                                  <p className="text-[10px] text-slate-lab mt-0.5 font-mono">
                                    {(r.delta ?? 0) >= 0 ? '+' : ''}{r.delta?.toFixed(4)}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* 업체 비교 매트릭스 (업체가 있을 때만) */}
          {g.has_company && g.companies.length > 1 && g.matrix.length > 0 && (
            <div className="overflow-x-auto border-t border-navy-700">
              <p className="px-4 pt-3 text-xs text-slate-lab font-medium">업체별 비교</p>
              <table className="w-full text-sm">
                <thead className="bg-navy-900/30">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs text-slate-light">시험항목</th>
                    {g.companies.map(co => (
                      <th key={co} className="text-left px-4 py-2 text-xs text-slate-light min-w-[130px]">{co}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {g.matrix.map(mrow => (
                    <tr key={mrow.test_item} className="border-t border-navy-800">
                      <td className="px-4 py-2 font-medium text-white text-xs">{mrow.test_item || '-'}</td>
                      {g.companies.map((co, ci) => {
                        const cell = mrow.values[co];
                        const borderColors = ['border-l-cyan-400','border-l-purple-400','border-l-green-400','border-l-yellow-400','border-l-orange-400'];
                        return (
                          <td key={co} className={clsx('px-4 py-2 border-l-2', borderColors[ci % borderColors.length])}>
                            {cell ? (
                              <div>
                                <p className="font-mono text-accent-light text-sm">
                                  {cell.result ?? '-'} <span className="text-xs text-slate-lab">{cell.unit}</span>
                                  {cell.is_retest && <span className="ml-1 text-[10px] text-yellow-400">재실험</span>}
                                </p>
                                <p className="text-[10px] text-slate-lab mt-0.5">{cell.analysis_date}</p>
                              </div>
                            ) : <span className="text-slate-lab">-</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 상세 목록 */}
          <div className="overflow-x-auto border-t border-navy-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-light uppercase">
                  <th className="text-left px-4 py-2">시료명</th>
                  <th className="text-left px-4 py-2">시험항목</th>
                  <th className="text-left px-4 py-2">접수번호</th>
                  <th className="text-left px-4 py-2">분析일</th>
                  <th className="text-left px-4 py-2">결과</th>
                  <th className="text-left px-4 py-2">상태</th>
                </tr>
              </thead>
              <tbody>
                {g.entries.map(e => (
                  <tr key={e.id} className="border-t border-navy-800">
                    <td className="px-4 py-2 text-white text-xs">{e.sample_name || '-'}</td>
                    <td className="px-4 py-2 text-xs">{e.test_item}</td>
                    <td className="px-4 py-2 font-mono text-xs text-slate-lab">{e.receipt_number || '-'}</td>
                    <td className="px-4 py-2 font-mono text-xs text-slate-lab">{e.analysis_date || '-'}</td>
                    <td className="px-4 py-2 font-mono text-accent-light text-sm">{e.result_value ?? '-'} <span className="text-xs text-slate-lab">{e.unit}</span></td>
                    <td className="px-4 py-2">
                      {e.is_retest
                        ? <span className="text-[11px] px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">재실험</span>
                        : <span className="text-[11px] px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">원본</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── 샘플 테이블 ───────────────────────────────────────────────────────────
// 각 Sample 1건 = 1행 (그룹화 없이 flat)
function SampleTableRow({ s }: { s: Sample }) {
  const st = getStyle(s.test_item ?? '');
  return (
    <tr className="border-t border-navy-800 hover:bg-navy-800/40 transition-colors group">
      {/* 접수번호 (LIMS) */}
      <td className="px-3 py-2.5 font-mono text-xs text-slate-light whitespace-nowrap">
        {s.sample_id || '-'}
      </td>
      {/* 시료명 */}
      <td className="px-3 py-2.5 text-sm text-white font-medium max-w-[200px]">
        <span className="block truncate" title={s.sample_name}>{s.sample_name || '-'}</span>
        {s.is_retest && (
          <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">재실험</span>
        )}
      </td>
      {/* 시험항목 */}
      <td className="px-3 py-2.5">
        <span className={clsx('text-[11px] px-2 py-0.5 rounded border font-medium whitespace-nowrap', st.tag)}>
          {s.test_item || '-'}
        </span>
      </td>
      {/* 결과 */}
      <td className="px-3 py-2.5 font-mono text-sm text-white whitespace-nowrap">
        {s.result_value ?? '-'}
      </td>
      {/* 기준값 비교 (재실험이면 변화량, 아니면 빈칸) */}
      <td className="px-3 py-2.5">
        {s.is_retest && s.result_change ? (
          <span className="text-xs text-yellow-300 font-mono">{s.result_change}</span>
        ) : s.is_retest && s.previous_result_value ? (
          <span className="text-xs text-slate-lab font-mono">기존 {s.previous_result_value}</span>
        ) : (
          <span className="text-slate-700">-</span>
        )}
      </td>
      {/* 단위 */}
      <td className="px-3 py-2.5 text-xs text-slate-lab whitespace-nowrap">
        {s.unit || '-'}
      </td>
      {/* 접수일 */}
      <td className="px-3 py-2.5 font-mono text-xs text-slate-lab whitespace-nowrap">
        {s.receipt_date || '-'}
      </td>
      {/* 분析일 */}
      <td className="px-3 py-2.5 font-mono text-xs text-slate-lab whitespace-nowrap">
        {s.analysis_date || '-'}
      </td>
    </tr>
  );
}

function SampleTable({ samples }: { samples: Sample[] }) {
  if (samples.length === 0) return null;
  return (
    <div className="card p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-navy-700 bg-navy-900/60">
              {['접수번호','시료명','시험항목','결과','기준값 비교','단위','접수일','분析일'].map(h => (
                <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-slate-lab tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {samples.map(s => <SampleTableRow key={s.id} s={s} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────
export default function Samples() {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [compareData, setCompareData] = useState<CompareResult | null>(null);
  const [testItems, setTestItems] = useState<{ name: string; count: number }[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [testItemFilter, setTestItemFilter] = useState('');
  const [abnormalOnly, setAbnormalOnly] = useState(false);
  const [retestOnly, setRetestOnly] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const loadTestItems = useCallback(() => {
    api.sampleTestItems().then(d => { setTestItems(d.items); setTotalCount(d.total); }).catch(() => {});
  }, []);

  const loadSamples = useCallback(async () => {
    if (debouncedSearch) {
      try {
        const cmp = await api.sampleCompare(debouncedSearch, testItemFilter || undefined) as CompareResult;
        setCompareData(cmp);
        if (cmp.mode === 'list') setSamples(cmp.samples as Sample[]);
        else setSamples([]);
        return;
      } catch { setCompareData(null); }
    } else {
      setCompareData(null);
    }
    const params: Record<string, string> = {};
    if (debouncedSearch) params.search = debouncedSearch;
    if (testItemFilter) params.test_item = testItemFilter;
    if (abnormalOnly) params.abnormal_only = 'true';
    if (retestOnly) params.retest_only = 'true';
    setSamples(await api.samples(params));
  }, [debouncedSearch, testItemFilter, abnormalOnly, retestOnly]);

  useEffect(() => { loadTestItems(); }, [loadTestItems]);
  useEffect(() => { loadSamples(); }, [loadSamples]);

  const resetFilters = () => { setSearch(''); setTestItemFilter(''); setAbnormalOnly(false); setRetestOnly(false); };
  const handleBulkDelete = async () => {
    setShowBulkDelete(false);
    await api.deleteAllSamples();
    setSamples([]); setTotalCount(0); loadTestItems();
  };

  const isCompareMode = compareData?.mode === 'compare' && (compareData.groups?.length ?? 0) > 0;
  const displayCount = isCompareMode
    ? compareData!.groups.reduce((s, g) => s + g.entries.length, 0)
    : samples.length;

  return (
    <div>
      {showBulkDelete && <BulkDeleteModal totalCount={totalCount} onClose={() => setShowBulkDelete(false)} onConfirm={handleBulkDelete} />}

      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold text-white">업무 목록</h1>
          <p className="text-xs text-slate-lab mt-0.5">전체 {totalCount}건 · 검색결과 {displayCount}건</p>
        </div>
        {totalCount > 0 && (
          <button onClick={() => setShowBulkDelete(true)} className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 border border-red-500/30 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors">
            <Trash2 className="w-4 h-4" /> 전체 삭제
          </button>
        )}
      </div>

      {/* 검색 & 필터 */}
      <div className="flex gap-2 mb-3 flex-wrap items-center">
        <select className="input-field w-36 text-sm" value={testItemFilter} onChange={e => setTestItemFilter(e.target.value)}>
          <option value="">전체</option>
          {testItems.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
        </select>
        <select
          className="input-field w-28 text-sm"
          value={abnormalOnly ? 'abnormal' : retestOnly ? 'retest' : ''}
          onChange={e => { setAbnormalOnly(e.target.value === 'abnormal'); setRetestOnly(e.target.value === 'retest'); }}
        >
          <option value="">전체</option>
          <option value="retest">재실험만</option>
          <option value="abnormal">이상만</option>
        </select>
        <div className="relative flex-1 min-w-[200px] max-w-lg">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-lab" />
          <input
            className="input-field pl-10 text-sm"
            placeholder="시료명 검색 → 원본/재실험 값 자동 비교"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button onClick={resetFilters} className="btn-secondary flex items-center gap-1 text-sm">
          <RotateCcw className="w-4 h-4" /> 초기화
        </button>
      </div>

      {/* 시험항목 탭 */}
      <div className="flex flex-wrap gap-1.5 mb-4 pb-3 border-b border-navy-700">
        <button
          onClick={() => setTestItemFilter('')}
          className={clsx('px-3 py-1 rounded-full text-xs font-medium border transition-colors',
            !testItemFilter ? 'bg-accent border-accent text-white' : 'bg-navy-800 border-navy-600 text-slate-light hover:text-white')}
        >
          전체 <span className="opacity-70">{totalCount}</span>
        </button>
        {testItems.map(item => {
          const ist = getStyle(item.name);
          return (
            <button key={item.name} onClick={() => setTestItemFilter(item.name === testItemFilter ? '' : item.name)}
              className={clsx('px-3 py-1 rounded-full text-xs border transition-colors',
                testItemFilter === item.name ? `${ist.tag} font-medium` : 'bg-navy-800 border-navy-600 text-slate-light hover:text-white')}>
              {item.name} <span className="opacity-70">{item.count}</span>
            </button>
          );
        })}
      </div>

      {/* 컨텐츠 */}
      {isCompareMode ? (
        <RetestCompareView groups={compareData!.groups as CompareGroup[]} />
      ) : samples.length === 0 ? (
        <div className="text-center py-16 text-slate-lab">
          <div className="text-4xl mb-3">🔬</div>
          <p className="text-sm">데이터가 없습니다. 엑셀 파일을 업로드해 주세요.</p>
          {debouncedSearch && <p className="text-xs mt-1 text-slate-700">"{debouncedSearch}" 검색 결과 없음</p>}
        </div>
      ) : (
        <SampleTable samples={samples} />
      )}
    </div>
  );
}
