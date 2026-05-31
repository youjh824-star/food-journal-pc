import { useEffect, useMemo, useState } from 'react';
import {
  CalcActions, CalcInput, CalcPanel, CalcResultPanel, CalcSteps, FormulaBlock, BeginnerNote,
} from './CalcUI';
import { calcPurity } from './math';
import { parsePositive } from './units';
import type { CalcOutput } from './types';

interface Props {
  onResult: (output: CalcOutput | null, summary: string) => void;
  initial?: Record<string, string>;
  onFavorite?: (inputs: Record<string, string>) => void;
}

export default function PurityCalculator({ onResult, initial, onFavorite }: Props) {
  const [needed, setNeeded] = useState(initial?.needed ?? '');
  const [purity, setPurity] = useState(initial?.purity ?? '95');
  const [copied, setCopied] = useState(false);

  const output = useMemo(() => {
    const nn = parsePositive(needed);
    const np = parsePositive(purity);
    if (nn == null || np == null) return null;
    return calcPurity(nn, np);
  }, [needed, purity]);

  useEffect(() => {
    onResult(output, output?.copyText ?? '');
  }, [output, onResult]);

  const reset = () => { setNeeded(''); setPurity('95'); };
  const copy = async () => {
    if (!output?.copyText) return;
    await navigator.clipboard.writeText(output.copyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <CalcPanel title="순도 보정">
      <FormulaBlock
        formula="실제 필요량 = 계산 필요량 ÷ (순도 ÷ 100)"
        symbols={[
          { symbol: '계산 필요량', meaning: '순도 100% 기준 필요량' },
          { symbol: '순도', meaning: '시약 라벨 순도 (%)' },
        ]}
      />

      <BeginnerNote>
        예: 순도 95% 시약으로 10 g이 필요하다면, 실제로는 10 ÷ 0.95 ≈ 10.53 g을 저울에 달아야 합니다.
      </BeginnerNote>

      <div className="space-y-4 mb-6 mt-4">
        <CalcInput label="계산 필요량 (100% 기준)" hint="예: 10 g" placeholder="10" value={needed} onChange={setNeeded} />
        <CalcInput label="시약 순도 (%)" hint="예: 95" placeholder="95" value={purity} onChange={setPurity}
          unit={<span className="calc-unit">%</span>} />
      </div>

      <div className="space-y-4">
        <CalcResultPanel label="실제 필요량" value={output?.resultUnit ?? null} warnings={output?.warnings} />
        {output && <CalcSteps steps={output.steps} />}
        <CalcActions
          onCopy={copy}
          onReset={reset}
          copied={copied}
          onFavorite={onFavorite ? () => onFavorite({ needed, purity }) : undefined}
        />
      </div>
    </CalcPanel>
  );
}
