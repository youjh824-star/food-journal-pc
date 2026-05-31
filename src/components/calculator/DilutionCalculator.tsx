import { useEffect, useMemo, useState } from 'react';
import {
  CalcActions, CalcInput, CalcPanel, CalcResultPanel, CalcSteps, FormulaBlock, UnitSelect,
} from './CalcUI';
import { calcDilution } from './math';
import { CONC_UNITS, parsePositive, type ConcUnit } from './units';
import type { CalcOutput } from './types';

interface Props {
  onResult: (output: CalcOutput | null, summary: string) => void;
  initial?: Record<string, string>;
  onFavorite?: (inputs: Record<string, string>) => void;
}

export default function DilutionCalculator({ onResult, initial, onFavorite }: Props) {
  const [c1, setC1] = useState(initial?.c1 ?? '');
  const [c1Unit, setC1Unit] = useState<ConcUnit>((initial?.c1Unit as ConcUnit) ?? 'ppm');
  const [c2, setC2] = useState(initial?.c2 ?? '');
  const [c2Unit, setC2Unit] = useState<ConcUnit>((initial?.c2Unit as ConcUnit) ?? 'ppm');
  const [v2, setV2] = useState(initial?.v2 ?? '');
  const [copied, setCopied] = useState(false);

  const output = useMemo(() => {
    const n1 = parsePositive(c1);
    const n2 = parsePositive(c2);
    const nv = parsePositive(v2);
    if (n1 == null || n2 == null || nv == null) return null;
    return calcDilution(n1, c1Unit, n2, c2Unit, nv);
  }, [c1, c1Unit, c2, c2Unit, v2]);

  useEffect(() => {
    onResult(output, output?.copyText ? `V1=${output.resultUnit}` : '');
  }, [output, onResult]);

  const reset = () => {
    setC1(''); setC2(''); setV2('');
    setC1Unit('ppm'); setC2Unit('ppm');
  };

  const copy = async () => {
    if (!output?.copyText) return;
    await navigator.clipboard.writeText(output.copyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const unitOpts = CONC_UNITS.map((u) => ({ id: u.id, label: u.label }));

  return (
    <CalcPanel title="희석 계산기">
      <FormulaBlock
        formula="C1 × V1 = C2 × V2"
        symbols={[
          { symbol: 'C1', meaning: '원액 농도' },
          { symbol: 'V1', meaning: '취해야 하는 원액 부피 (자동 계산)' },
          { symbol: 'C2', meaning: '목표 농도' },
          { symbol: 'V2', meaning: '최종 부피' },
        ]}
      />

      <div className="space-y-4 mb-6">
        <CalcInput
          label="원액 농도 (C1)"
          hint={CONC_UNITS.find((u) => u.id === c1Unit)?.hint}
          placeholder="1000"
          value={c1}
          onChange={setC1}
          unit={<UnitSelect value={c1Unit} onChange={(v) => setC1Unit(v as ConcUnit)} options={unitOpts} />}
        />
        <CalcInput
          label="목표 농도 (C2)"
          hint={CONC_UNITS.find((u) => u.id === c2Unit)?.hint}
          placeholder="10"
          value={c2}
          onChange={setC2}
          unit={<UnitSelect value={c2Unit} onChange={(v) => setC2Unit(v as ConcUnit)} options={unitOpts} />}
        />
        <CalcInput
          label="최종 부피 (V2)"
          hint="예: 100 mL"
          placeholder="100"
          value={v2}
          onChange={setV2}
          unit={<span className="calc-unit">mL</span>}
        />
      </div>

      <div className="space-y-4">
        <CalcResultPanel
          label="필요 원액 부피 (V1)"
          value={output?.resultUnit ?? null}
          warnings={output?.warnings}
        />
        {output && <CalcSteps steps={output.steps} />}
        <CalcActions
          onCopy={copy}
          onReset={reset}
          copied={copied}
          onFavorite={onFavorite ? () => onFavorite({ c1, c1Unit, c2, c2Unit, v2 }) : undefined}
        />
      </div>
    </CalcPanel>
  );
}
