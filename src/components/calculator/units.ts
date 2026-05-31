/** 농도 단위 → mg/L 기준 변환 계수 */
export type ConcUnit = 'ppm' | 'ppb' | 'pct' | 'mg/L' | 'ug/L' | 'ng/mL';

export const CONC_UNITS: { id: ConcUnit; label: string; hint: string }[] = [
  { id: 'ppm', label: 'ppm', hint: '예: 1000 ppm' },
  { id: 'ppb', label: 'ppb', hint: '예: 500 ppb' },
  { id: 'pct', label: '%', hint: '예: 0.1 %' },
  { id: 'mg/L', label: 'mg/L', hint: '예: 10 mg/L' },
  { id: 'ug/L', label: 'μg/L', hint: '예: 50 μg/L' },
  { id: 'ng/mL', label: 'ng/mL', hint: '예: 100 ng/mL' },
];

/** mg/L 로 환산 */
export function toMgL(value: number, unit: ConcUnit): number {
  switch (unit) {
    case 'ppm':
    case 'mg/L':
      return value;
    case 'ppb':
    case 'ug/L':
    case 'ng/mL':
      return value * 0.001;
    case 'pct':
      return value * 10000;
    default:
      return value;
  }
}

export function fromMgL(value: number, unit: ConcUnit): number {
  switch (unit) {
    case 'ppm':
    case 'mg/L':
      return value;
    case 'ppb':
    case 'ug/L':
    case 'ng/mL':
      return value * 1000;
    case 'pct':
      return value / 10000;
    default:
      return value;
  }
}

export type ConvertPair = 'ppm-mgL' | 'ppb-ugL' | 'ngmL-ugL';

export const CONVERT_PAIRS: { id: ConvertPair; from: string; to: string; note: string }[] = [
  { id: 'ppm-mgL', from: 'ppm', to: 'mg/L', note: '수용액 기준 1 ppm ≈ 1 mg/L' },
  { id: 'ppb-ugL', from: 'ppb', to: 'μg/L', note: '수용액 기준 1 ppb ≈ 1 μg/L' },
  { id: 'ngmL-ugL', from: 'ng/mL', to: 'μg/L', note: '1 ng/mL = 1 μg/L' },
];

export function convertPair(value: number, pair: ConvertPair, direction: 'forward' | 'reverse'): number {
  if (pair === 'ppm-mgL') return value;
  if (pair === 'ppb-ugL') return value;
  if (pair === 'ngmL-ugL') return direction === 'forward' ? value : value;
  return value;
}

export function formatNum(n: number, digits = 6): string {
  if (!Number.isFinite(n)) return '—';
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs >= 1000 || abs < 0.001) return n.toExponential(3);
  return parseFloat(n.toPrecision(digits)).toString();
}

export function formatVolumeMl(ml: number): string {
  if (ml >= 1) return `${formatNum(ml, 4)} mL`;
  if (ml >= 0.001) return `${formatNum(ml * 1000, 4)} μL`;
  return `${formatNum(ml * 1_000_000, 2)} nL`;
}

export function parsePositive(raw: string): number | null {
  const v = parseFloat(raw.replace(/,/g, ''));
  if (raw.trim() === '' || Number.isNaN(v) || v < 0) return null;
  return v;
}
