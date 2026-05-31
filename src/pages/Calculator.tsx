import { useCallback, useRef, useState } from 'react';
import clsx from 'clsx';
import { Clock, Star, Trash2, FlaskConical } from 'lucide-react';
import { PageHeader } from '../components/UI';
import DilutionCalculator from '../components/calculator/DilutionCalculator';
import StandardCalculator from '../components/calculator/StandardCalculator';
import ConvertCalculator from '../components/calculator/ConvertCalculator';
import PercentCalculator from '../components/calculator/PercentCalculator';
import PurityCalculator from '../components/calculator/PurityCalculator';
import { CALCULATOR_TABS, type CalcFavorite, type CalcHistoryEntry, type CalculatorId } from '../components/calculator/types';
import type { CalcOutput } from '../components/calculator/types';
import {
  clearHistory, loadFavorites, loadHistory, pushHistory, saveFavorite, deleteFavorite,
} from '../components/calculator/storage';

export default function CalculatorPage() {
  const [tab, setTab] = useState<CalculatorId>('dilution');
  const [history, setHistory] = useState<CalcHistoryEntry[]>(() => loadHistory());
  const [favorites, setFavorites] = useState<CalcFavorite[]>(() => loadFavorites());
  const [preset, setPreset] = useState<Record<string, string> | undefined>();
  const [presetKey, setPresetKey] = useState(0);
  const lastSaved = useRef('');

  const handleResult = useCallback((output: CalcOutput | null, summary: string) => {
    if (!output?.result || !output.copyText || output.copyText === lastSaved.current) return;
    lastSaved.current = output.copyText;
    const tabInfo = CALCULATOR_TABS.find((t) => t.id === tab)!;
    setHistory(pushHistory({
      calculatorId: tab,
      title: tabInfo.label,
      summary: summary || output.resultUnit,
    }));
  }, [tab]);

  const switchTab = (id: CalculatorId) => {
    setTab(id);
    lastSaved.current = '';
    setPreset(undefined);
    setPresetKey((k) => k + 1);
  };

  const addFavorite = (inputs: Record<string, string>, label?: string) => {
    const tabInfo = CALCULATOR_TABS.find((t) => t.id === tab)!;
    setFavorites(saveFavorite({
      calculatorId: tab,
      label: label || `${tabInfo.short} 프리셋`,
      inputs,
    }));
  };

  const applyFavorite = (fav: CalcFavorite) => {
    setTab(fav.calculatorId);
    setPreset(fav.inputs);
    setPresetKey(Date.now());
    lastSaved.current = '';
  };

  const calcProps = {
    onResult: handleResult,
    initial: preset,
    onFavorite: addFavorite,
  };

  return (
    <div className="calc-page max-w-6xl mx-auto">
      <PageHeader
        title="실험실 계산기"
        subtitle="농도·희석·표준용액 — 공식 설명과 단계별 계산 과정 포함"
      />

      {/* Tabs */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
        {CALCULATOR_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => switchTab(t.id)}
            className={clsx(
              'calc-tab-pill shrink-0 min-h-[44px] px-4 sm:px-5 text-sm font-medium',
              tab === t.id ? 'calc-tab-pill-active' : 'calc-tab-pill-idle',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
        {/* Main calculator */}
        <div key={presetKey}>
          {tab === 'dilution' && <DilutionCalculator {...calcProps} />}
          {tab === 'standard' && <StandardCalculator {...calcProps} />}
          {tab === 'convert' && <ConvertCalculator {...calcProps} />}
          {tab === 'percent' && <PercentCalculator {...calcProps} />}
          {tab === 'purity' && <PurityCalculator {...calcProps} />}
        </div>

        {/* Sidebar: history & favorites */}
        <aside className="space-y-4">
          <div className="calc-sidebar rounded-xl border border-slate-200/10 bg-navy-800/80 p-4">
            <h3 className="text-sm font-medium text-slate-light flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-yellow-400" /> 즐겨찾기
            </h3>
            {favorites.length === 0 ? (
              <p className="text-xs text-slate-lab">계산기에서 ★ 버튼으로 현재 입력값을 저장하세요.</p>
            ) : (
              <ul className="space-y-2 max-h-40 overflow-y-auto">
                {favorites.map((f) => (
                  <li key={f.id} className="flex items-center gap-2 text-sm">
                    <button
                      type="button"
                      onClick={() => applyFavorite(f)}
                      className="flex-1 text-left px-2 py-2 rounded bg-navy-900 hover:bg-navy-700 text-slate-200 truncate"
                    >
                      <span className="text-accent-light text-xs block">{CALCULATOR_TABS.find((t) => t.id === f.calculatorId)?.short}</span>
                      {f.label}
                    </button>
                    <button type="button" onClick={() => setFavorites(deleteFavorite(f.id))} className="text-slate-lab hover:text-red-400 p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="calc-sidebar rounded-xl border border-slate-200/10 bg-navy-800/80 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-light flex items-center gap-2">
                <Clock className="w-4 h-4" /> 최근 계산
              </h3>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={() => { clearHistory(); setHistory([]); }}
                  className="text-[10px] text-slate-lab hover:text-red-400"
                >
                  전체 삭제
                </button>
              )}
            </div>
            {history.length === 0 ? (
              <p className="text-xs text-slate-lab">계산 결과가 자동 저장됩니다.</p>
            ) : (
              <ul className="space-y-2 max-h-52 overflow-y-auto">
                {history.map((h) => (
                  <li key={h.id} className="text-xs px-2 py-2 rounded bg-navy-900 text-slate-light">
                    <span className="text-accent-light font-medium">{h.title}</span>
                    <p className="font-mono text-white mt-0.5">{h.summary}</p>
                    <p className="text-slate-lab mt-0.5">
                      {new Date(h.timestamp).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="calc-sidebar rounded-xl border border-slate-200/10 bg-navy-800/80 p-4 hidden lg:block">
            <h3 className="text-sm font-medium text-slate-light flex items-center gap-2 mb-2">
              <FlaskConical className="w-4 h-4 text-accent" /> 사용 팁
            </h3>
            <ul className="text-xs text-slate-lab space-y-1.5 list-disc list-inside">
              <li>값 입력 시 결과가 즉시 갱신됩니다.</li>
              <li>단위가 다르면 자동으로 mg/L 기준으로 통일합니다.</li>
              <li>μL 이하·고희석 시 경고가 표시됩니다.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
