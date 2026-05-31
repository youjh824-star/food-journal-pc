import clsx from 'clsx';
import type { ReactNode } from 'react';

export function CalcPanel({ title, children, className }: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={clsx('calc-panel rounded-xl border border-slate-200/10 bg-[#f8fafc] dark:bg-slate-900/40 text-slate-900 dark:text-slate-100 shadow-sm', className)}>
      {title && (
        <div className="px-4 py-3 border-b border-slate-200/60 dark:border-slate-700/60">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
        </div>
      )}
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function FormulaBlock({ formula, symbols }: {
  formula: string;
  symbols: { symbol: string; meaning: string }[];
}) {
  return (
    <div className="rounded-lg bg-slate-100 dark:bg-navy-900/60 border border-slate-200 dark:border-navy-600 px-4 py-3 mb-5">
      <p className="text-lg font-mono font-semibold text-slate-800 dark:text-accent-light text-center tracking-wide">
        {formula}
      </p>
      <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        {symbols.map(({ symbol, meaning }) => (
          <div key={symbol} className="flex gap-2">
            <dt className="font-mono font-bold text-accent dark:text-accent-light min-w-[2rem]">{symbol}</dt>
            <dd className="text-slate-600 dark:text-slate-light">{meaning}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function CalcInput({ label, hint, unit, value, onChange, placeholder, inputMode = 'decimal' }: {
  label: string;
  hint?: string;
  unit?: ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: 'decimal' | 'text';
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          inputMode={inputMode}
          className="calc-input flex-1 min-h-[44px]"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^\d.\-eE]/g, ''))}
          placeholder={placeholder}
        />
        {unit}
      </div>
      {hint && <p className="text-[11px] text-slate-500 dark:text-slate-lab mt-1">{hint}</p>}
    </div>
  );
}

export function UnitSelect({ value, onChange, options }: {
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string }[];
}) {
  return (
    <select
      className="calc-input min-h-[44px] w-24 sm:w-28 shrink-0 text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.id} value={o.id}>{o.label}</option>
      ))}
    </select>
  );
}

export function CalcResultPanel({ label, value, warnings }: {
  label: string;
  value: string | null;
  warnings?: string[];
}) {
  return (
    <div className="calc-result rounded-xl border-2 border-accent/30 bg-white dark:bg-navy-900/80 p-5 text-center">
      <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-lab mb-2">{label}</p>
      <p className="text-3xl sm:text-4xl font-bold font-mono text-accent dark:text-accent-light break-all">
        {value ?? '—'}
      </p>
      {warnings && warnings.length > 0 && (
        <ul className="mt-4 text-left space-y-1.5">
          {warnings.map((w, i) => (
            <li key={i} className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded px-2 py-1.5 border border-amber-200/50 dark:border-amber-700/30">
              ⚠ {w}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function CalcSteps({ steps }: { steps: { label: string; expression: string }[] }) {
  if (!steps.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 dark:border-navy-600 bg-white/80 dark:bg-navy-900/50 p-4">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-lab uppercase mb-3">계산 과정</p>
      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li key={i} className="text-sm">
            <span className="text-slate-500 dark:text-slate-lab text-xs mr-2">{s.label}</span>
            <span className="font-mono text-slate-800 dark:text-slate-200">{s.expression}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function CalcActions({ onCopy, onReset, onFavorite, copied }: {
  onCopy: () => void;
  onReset: () => void;
  onFavorite?: () => void;
  copied?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2 pt-2">
      <button type="button" onClick={onCopy} className="calc-btn calc-btn-primary min-h-[44px] flex-1 sm:flex-none">
        {copied ? '복사됨 ✓' : '결과 복사'}
      </button>
      <button type="button" onClick={onReset} className="calc-btn calc-btn-secondary min-h-[44px] flex-1 sm:flex-none">
        초기화
      </button>
      {onFavorite && (
        <button type="button" onClick={onFavorite} className="calc-btn calc-btn-secondary min-h-[44px] flex-1 sm:flex-none">
          ★ 즐겨찾기
        </button>
      )}
    </div>
  );
}

export function BeginnerNote({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs text-slate-600 dark:text-slate-light bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-lg px-3 py-2">
      💡 {children}
    </p>
  );
}
