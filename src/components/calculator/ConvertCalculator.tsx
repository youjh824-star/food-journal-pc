import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  CalcActions, CalcInput, CalcPanel, CalcResultPanel, CalcSteps, BeginnerNote,
} from './CalcUI';
import { calcUnitConvert } from './math';
import { CONVERT_PAIRS, parsePositive } from './units';
import type { CalcOutput } from './types';

interface Props {
  onResult: (output: CalcOutput | null, summary: string) => void;
  initial?: Record<string, string>;
  onFavorite?: (inputs: Record<string, string>) => void;
}

export default function ConvertCalculator({ onResult, initial, onFavorite }: Props) {
  const [pair, setPair] = useState<'ppm-mgL' | 'ppb-ugL' | 'ngmL-ugL'>(
    (initial?.pair as 'ppm-mgL' | 'ppb-ugL' | 'ngmL-ugL') ?? 'ppm-mgL',
  );
  const [value, setValue] = useState(initial?.value ?? '');
  const [copied, setCopied] = useState(false);

  const pairInfo = CONVERT_PAIRS.find((p) => p.id === pair)!;

  const output = useMemo(() => {
    const n = parsePositive(value);
    if (n == null) return null;
    return calcUnitConvert(n, pair);
  }, [value, pair]);

  useEffect(() => {
    onResult(output, output?.copyText ?? '');
  }, [output, onResult]);

  const reset = () => setValue('');
  const copy = async () => {
    if (!output?.copyText) return;
    await navigator.clipboard.writeText(output.copyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <CalcPanel title="ppm / ppb 단위 변환">
      <BeginnerNote>
        수용액(물) 기준 밀도 ≈ 1 g/mL일 때, <strong>1 ppm ≈ 1 mg/L</strong>, <strong>1 ppb ≈ 1 μg/L</strong>로 생각하면 됩니다.
      </BeginnerNote>

      <div className="flex flex-wrap gap-2 my-5">
        {CONVERT_PAIRS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPair(p.id)}
            className={clsx(
              'calc-tab-pill min-h-[44px] px-4 text-sm',
              pair === p.id ? 'calc-tab-pill-active' : 'calc-tab-pill-idle',
            )}
          >
            {p.from} ↔ {p.to}
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-lab mb-4">{pairInfo.note}</p>

      <div className="space-y-4 mb-6">
        <CalcInput
          label={`입력 (${pairInfo.from})`}
          hint={`예: 10 ${pairInfo.from}`}
          placeholder="10"
          value={value}
          onChange={setValue}
          unit={<span className="calc-unit">{pairInfo.from}</span>}
        />
      </div>

      <div className="space-y-4">
        <CalcResultPanel label={`결과 (${pairInfo.to})`} value={output?.resultUnit ?? null} />
        {output && <CalcSteps steps={output.steps} />}
        <CalcActions
          onCopy={copy}
          onReset={reset}
          copied={copied}
          onFavorite={onFavorite ? () => onFavorite({ pair, value }) : undefined}
        />
      </div>
    </CalcPanel>
  );
}
