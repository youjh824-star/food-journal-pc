import type { ConcUnit } from './units';
import { formatNum, formatVolumeMl, toMgL } from './units';
import type { CalcOutput } from './types';

export function calcDilution(
  c1: number, c1Unit: ConcUnit,
  c2: number, c2Unit: ConcUnit,
  v2Ml: number,
): CalcOutput {
  const c1Base = toMgL(c1, c1Unit);
  const c2Base = toMgL(c2, c2Unit);
  const warnings: string[] = [];

  if (c1Base <= 0 || c2Base <= 0 || v2Ml <= 0) {
    return empty('원액 부피 (V1)', 'mL');
  }
  if (c2Base >= c1Base) {
    warnings.push('목표 농도(C2)가 원액 농도(C1)보다 높거나 같습니다. 농축이 필요할 수 있습니다.');
  }

  const v1 = (c2Base * v2Ml) / c1Base;
  const dilutionFactor = c1Base / c2Base;
  const solvent = v2Ml - v1;

  if (v1 < 0.01) {
    warnings.push(`필요 원액 부피가 ${formatVolumeMl(v1)}로 매우 작습니다. 피펫·마이크로피펫 정밀도를 확인하세요.`);
  }
  if (dilutionFactor > 1000) {
    warnings.push(`희석배수가 약 ${formatNum(dilutionFactor, 4)}배로 매우 큽니다. 중간 희석(2단계 희석)을 고려하세요.`);
  }
  if (solvent < 0) {
    warnings.push('계산된 원액 부피가 최종 부피보다 큽니다. 입력값을 다시 확인하세요.');
  }

  const steps = [
    { label: '공식', expression: 'V1 = (C2 × V2) ÷ C1' },
    { label: '단위 통일', expression: `C1 = ${formatNum(c1Base)} mg/L, C2 = ${formatNum(c2Base)} mg/L, V2 = ${formatNum(v2Ml)} mL` },
    { label: '대입', expression: `V1 = (${formatNum(c2Base)} × ${formatNum(v2Ml)}) ÷ ${formatNum(c1Base)}` },
    { label: '결과', expression: `V1 = ${formatVolumeMl(v1)}` },
    { label: '희석', expression: `원액 ${formatVolumeMl(v1)} + 용매 ≈ ${formatVolumeMl(Math.max(0, solvent))} → ${formatNum(v2Ml)} mL` },
  ];

  const copyText = [
    `[희석] V1 = ${formatVolumeMl(v1)}`,
    `원액 ${c1} ${c1Unit} → 목표 ${c2} ${c2Unit}, 최종 ${v2Ml} mL`,
    `희석배수: ${formatNum(dilutionFactor, 4)}×`,
  ].join('\n');

  return {
    result: v1,
    resultLabel: '필요 원액 부피 (V1)',
    resultUnit: formatVolumeMl(v1),
    steps,
    warnings,
    copyText,
  };
}

export function calcStandard(m: number, mw: number, vL: number): CalcOutput {
  const warnings: string[] = [];
  if (m <= 0 || mw <= 0 || vL <= 0) return empty('필요 질량 (g)', 'g');

  const g = m * mw * vL;
  if (g < 0.001) warnings.push('질량이 매우 작습니다. 고감도 저울 사용을 권장합니다.');
  if (g > 500) warnings.push('질량이 큽니다. 용해 및 부피 보정을 확인하세요.');

  const steps = [
    { label: '공식', expression: 'g = M × MW × V' },
    { label: '대입', expression: `g = ${formatNum(m)} × ${formatNum(mw)} × ${formatNum(vL)}` },
    { label: '결과', expression: `g = ${formatNum(g, 5)} g` },
  ];

  return {
    result: g,
    resultLabel: '필요 질량 (g)',
    resultUnit: `${formatNum(g, 5)} g`,
    steps,
    warnings,
    copyText: `[표준용액] ${formatNum(g, 5)} g (${m} M, MW ${mw}, ${vL} L)`,
  };
}

export function calcPercent(massG: number, volMl: number): CalcOutput {
  if (massG < 0 || volMl <= 0) return empty('농도 (%)', '%');
  const pct = (massG / volMl) * 100;
  const steps = [
    { label: '공식', expression: '% = (g ÷ mL) × 100' },
    { label: '대입', expression: `% = (${formatNum(massG)} ÷ ${formatNum(volMl)}) × 100` },
    { label: '결과', expression: `% = ${formatNum(pct, 5)} %` },
  ];
  return {
    result: pct,
    resultLabel: '농도 (%)',
    resultUnit: `${formatNum(pct, 5)} %`,
    steps,
    warnings: pct > 100 ? ['농도가 100%를 초과합니다. 입력값을 확인하세요.'] : [],
    copyText: `[퍼센트] ${formatNum(pct, 5)} % (${massG} g / ${volMl} mL)`,
  };
}

export function calcPurity(calculated: number, purityPct: number): CalcOutput {
  const warnings: string[] = [];
  if (calculated <= 0 || purityPct <= 0) return empty('실제 필요량', '');
  if (purityPct > 100) warnings.push('순도가 100%를 초과할 수 없습니다.');

  const actual = calculated / (purityPct / 100);
  const steps = [
    { label: '공식', expression: '실제 필요량 = 계산 필요량 ÷ (순도 ÷ 100)' },
    { label: '대입', expression: `= ${formatNum(calculated)} ÷ (${formatNum(purityPct)} ÷ 100)` },
    { label: '결과', expression: `= ${formatNum(actual, 5)}` },
  ];
  if (purityPct < 100) {
    steps.push({
      label: '보정',
      expression: `순도 ${formatNum(purityPct)}% → 약 ${formatNum((actual / calculated - 1) * 100, 2)}% 추가 필요`,
    });
  }

  return {
    result: actual,
    resultLabel: '실제 필요량',
    resultUnit: formatNum(actual, 5),
    steps,
    warnings,
    copyText: `[순도보정] ${formatNum(actual, 5)} (계산 ${calculated}, 순도 ${purityPct}%)`,
  };
}

export function calcUnitConvert(value: number, pair: 'ppm-mgL' | 'ppb-ugL' | 'ngmL-ugL'): CalcOutput {
  if (value < 0) return empty('변환 결과', '');
  const labels = {
    'ppm-mgL': { from: 'ppm', to: 'mg/L' },
    'ppb-ugL': { from: 'ppb', to: 'μg/L' },
    'ngmL-ugL': { from: 'ng/mL', to: 'μg/L' },
  };
  const { from, to } = labels[pair];
  const steps = [
    { label: '관계', expression: `1 ${from} ≈ 1 ${to} (수용액, ρ≈1)` },
    { label: '변환', expression: `${formatNum(value)} ${from} = ${formatNum(value)} ${to}` },
  ];
  return {
    result: value,
    resultLabel: to,
    resultUnit: `${formatNum(value, 6)} ${to}`,
    steps,
    warnings: [],
    copyText: `${formatNum(value, 6)} ${from} = ${formatNum(value, 6)} ${to}`,
  };
}

function empty(label: string, unit: string): CalcOutput {
  return {
    result: null,
    resultLabel: label,
    resultUnit: unit,
    steps: [],
    warnings: [],
    copyText: '',
  };
}
