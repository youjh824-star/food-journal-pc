import { useEffect, useMemo, useState } from 'react';
import {
  CalcActions, CalcInput, CalcPanel, CalcResultPanel, CalcSteps, FormulaBlock,
} from './CalcUI';
import { calcStandard } from './math';
import { parsePositive } from './units';
import type { CalcOutput } from './types';

interface Props {
  onResult: (output: CalcOutput | null, summary: string) => void;
  initial?: Record<string, string>;
  onFavorite?: (inputs: Record<string, string>) => void;
}

export default function StandardCalculator({ onResult, initial, onFavorite }: Props) {
  const [m, setM] = useState(initial?.m ?? '');
  const [mw, setMw] = useState(initial?.mw ?? '');
  const [v, setV] = useState(initial?.v ?? '');
  const [copied, setCopied] = useState(false);

  const output = useMemo(() => {
    const nm = parsePositive(m);
    const nmw = parsePositive(mw);
    const nv = parsePositive(v);
    if (nm == null || nmw == null || nv == null) return null;
    return calcStandard(nm, nmw, nv);
  }, [m, mw, v]);

  useEffect(() => {
    onResult(output, output?.copyText ? `${output.resultUnit}` : '');
  }, [output, onResult]);

  const reset = () => { setM(''); setMw(''); setV(''); };
  const copy = async () => {
    if (!output?.copyText) return;
    await navigator.clipboard.writeText(output.copyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <CalcPanel title="표준용액 제조">
      <FormulaBlock
        formula="g = M × MW × V"
        symbols={[
          { symbol: 'g', meaning: '필요한 용질 질량 (g)' },
          { symbol: 'M', meaning: '목표 몰농도 (mol/L)' },
          { symbol: 'MW', meaning: '분자량 (g/mol)' },
          { symbol: 'V', meaning: '최종 부피 (L)' },
        ]}
      />

      <div className="space-y-4 mb-6">
        <CalcInput label="목표 몰농도 (M)" hint="예: 0.1 M" placeholder="0.1" value={m} onChange={setM} />
        <CalcInput label="분자량 (MW)" hint="예: 58.44 (NaCl)" placeholder="58.44" value={mw} onChange={setMw} />
        <CalcInput label="최종 부피 (V)" hint="예: 1 L = 1000 mL" placeholder="1" value={v} onChange={setV}
          unit={<span className="calc-unit">L</span>} />
      </div>

      <div className="space-y-4">
        <CalcResultPanel label="필요 질량 (g)" value={output?.resultUnit ?? null} warnings={output?.warnings} />
        {output && <CalcSteps steps={output.steps} />}
        <CalcActions
          onCopy={copy}
          onReset={reset}
          copied={copied}
          onFavorite={onFavorite ? () => onFavorite({ m, mw, v }) : undefined}
        />
      </div>
    </CalcPanel>
  );
}
