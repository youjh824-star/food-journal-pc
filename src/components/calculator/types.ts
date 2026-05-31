export type CalculatorId = 'dilution' | 'standard' | 'convert' | 'percent' | 'purity';

export interface CalcStep {
  label: string;
  expression: string;
}

export interface CalcOutput {
  result: number | null;
  resultLabel: string;
  resultUnit: string;
  steps: CalcStep[];
  warnings: string[];
  copyText: string;
}

export interface CalcHistoryEntry {
  id: string;
  calculatorId: CalculatorId;
  title: string;
  summary: string;
  timestamp: number;
}

export interface CalcFavorite {
  id: string;
  calculatorId: CalculatorId;
  label: string;
  inputs: Record<string, string>;
}

export const CALCULATOR_TABS: { id: CalculatorId; label: string; short: string }[] = [
  { id: 'dilution', label: '희석 계산', short: '희석' },
  { id: 'standard', label: '표준용액 제조', short: '표준용액' },
  { id: 'convert', label: 'ppm / ppb 변환', short: '단위변환' },
  { id: 'percent', label: '퍼센트 농도', short: '%' },
  { id: 'purity', label: '순도 보정', short: '순도' },
];
