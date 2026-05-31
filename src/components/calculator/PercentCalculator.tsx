import { useEffect, useMemo, useState } from 'react';
import {
  CalcActions, CalcInput, CalcPanel, CalcResultPanel, CalcSteps, FormulaBlock,
} from './CalcUI';
import { calcPercent } from './math';
import { parsePositive } from './units';
import type { CalcOutput } from './types';

interface Props {
  onResult: (output: CalcOutput | null, summary: string) => void;
  initial?: Record<string, string>;
  onFavorite?: (inputs: Record<string, string>) => void;
}

export default function PercentCalculator({ onResult, initial, onFavorite }: Props) {
  const [mass, setMass] = useState(initial?.mass ?? '');
  const [vol, setVol] = useState(initial?.vol ?? '');
  const [copied, setCopied] = useState(false);

  const output = useMemo(() => {
    const ng = parsePositive(mass);
    const nv = parsePositive(vol);
    if (ng == null || nv == null) return null;
    return calcPercent(ng, nv);
  }, [mass, vol]);

  useEffect(() => {
    onResult(output, output?.copyText ?? '');
  }, [output, onResult]);

  const reset = () => { setMass(''); setVol(''); };
  const copy = async () => {
    if (!output?.copyText) return;
    await navigator.clipboard.writeText(output.copyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <CalcPanel title="퍼센트 농도">
      <FormulaBlock
        formula="% = (g ÷ mL) × 100"
        symbols={[
          { symbol: '%', meaning: '질량/부피 퍼센트 농도 (w/v %)' },
          { symbol: 'g', meaning: '용질 질량' },
          { symbol: 'mL', meaning: '최종 용액 부피' },
        ]}
      />

      <div className="space-y-4 mb-6">
        <CalcInput label="용질 질량 (g)" hint="예: 1 g" placeholder="1" value={mass} onChange={setMass}
          unit={<span className="calc-unit">g</span>} />
        <CalcInput label="최종 부피 (mL)" hint="예: 100 mL" placeholder="100" value={vol} onChange={setVol}
          unit={<span className="calc-unit">mL</span>} />
      </div>

      <div className="space-y-4">
        <CalcResultPanel label="농도 (%)" value={output?.resultUnit ?? null} warnings={output?.warnings} />
        {output && <CalcSteps steps={output.steps} />}
        <CalcActions
          onCopy={copy}
          onReset={reset}
          copied={copied}
          onFavorite={onFavorite ? () => onFavorite({ mass, vol }) : undefined}
        />
      </div>
    </CalcPanel>
  );
}
