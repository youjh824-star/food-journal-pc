/**
 * Excel/CSV 파싱 (Python column_mapper.py 포팅)
 * 라이브러리: xlsx (SheetJS)
 */
import * as XLSX from 'xlsx'

// ── 컬럼 별칭 정의 ────────────────────────────────────────────────────────────

const COLUMN_ALIASES: Record<string, string[]> = {
  sample_id: [
    'sample id', 'sampleid', 'sample_id', 'sample no', 'sample no.',
    'sample number', 'sampleno', 'id', 'sample #', '샘플id', '샘플 id',
    '접수번호', '시료번호', 'no.', 'no', '번호',
  ],
  sample_name: [
    'sample name', 'samplename', 'sample_name', 'name', 'sample',
    'description', '샘플명', 'sample description',
    '시료명', '검체명', '검체 명', '시료 명',
    '품명', '검체', '제품명', '품목명', '시료', '품목', '항목명',
    '시험품명', '시험 시료명', '시료 명칭', '분석대상',
    '검체명칭', '시험시료명', '시험검체명',
  ],
  test_item: [
    'test item', 'testitem', 'test_item', 'analyte', 'element',
    'compound', 'parameter', '시험항목', 'analysis', 'target',
    '분석항목', '항목', '성분', '시험성분', '시험 항목', '분석 항목',
  ],
  result_value: [
    '결과값 최종', '결과값최종', '최종결과값', '최종 결과값',
    'result (mg/kg)', 'result(mg/kg)',
    '최종값', '결과 최종', '최종',
    'result', 'result value', 'result_value', 'concentration',
    'value', 'amount', '결과', 'result (mg/l)', 'conc', 'reading', '결과값',
    '정량', '함량', '측정값', '분석결과', '인증값', '최종결과', '판정값',
    '측정결과', '함유량', '분석값', '검출량', '함량값',
    '함유량(mg)', '측정치', '분석치', '최종 결과', '정량값', '분석 결과',
    '조단백', '조단백(%)', '단백질', 'crude protein', 'protein',
    '조단백질', '단백질함량', '단백질 함량',
    '비타민a', '비타민 a', '비타민e', '비타민 e',
    '비타민a(ug/100g)', '비타민 a(ug/100g)',
    'α-te', 'alpha-te', 'tocopherol', 'retinol', 'retinyl',
    '비타민a함량', '비타민e함량',
    'pb(mg/kg)', 'cd(mg/kg)', 'as(mg/kg)', 'hg(mg/kg)',
    '납', '카드뮴', '비소', '수은', '총비소', '무기비소',
    'pb', 'cd', 'as', 'hg',
  ],
  unit: ['unit', 'units', '단위', '단위(unit)', '측정단위'],
  analysis_date: [
    'date', 'analysis date', 'analysis_date', 'run date',
    'measurement date', 'time', 'datetime',
    '분석일', '분석일', '시험일', '실험일',
    '분석일자', '분석일자', '분석 일자', '분석일자', '분석날짜',
    '시험일자', '시험 일자', '시험날짜',
    '작업일', '작업일자', '측정일', '측정 일자',
    '검사일', '검사일자', '접수 및 시험일',
    '일자', '날짜',
  ],
  receipt_date: [
    'receipt date', 'receipt_date', '접수일', '접수일자', '의뢰일', '접수 날짜',
    '의뢰일자', '접수 일자',
  ],
  batch_info: [
    'batch', 'batch id', 'batch_id', 'batch no', 'batch number',
    'run', 'sequence', 'batch정보', '배치',
  ],
  project_name: [
    'project', 'project name', 'project_name', 'client', 'study',
    '프로젝트', 'project id',
    '의뢰명', '업체명', '의뢰업체', '의뢰자', '의뢰기관', '의뢰처',
    '고객명', '고객사', '회사명', '기관명',
    '의뢰인', '발주처', '고객',
  ],
}

const SAMPLE_ID_RULES: Array<{ field: string; aliases: string[]; priority: number }> = [
  { field: 'lims_id', aliases: [
    'lims', 'lims no', 'lims no.', 'lims번호', 'lims 번호', 'lims_id', 'lims id',
    'lims sample', 'lims sample id', 'lims접수번호', 'lims 접수번호', 'lims접수 번호', 'LIMS접수번호',
  ], priority: 100 },
  { field: 'receipt_id', aliases: [
    '접수번호', '접수 번호', '의뢰번호', '시료번호', '검체번호', '검체접수번호',
    'receipt no', 'receipt number', 'request no', '접수no', '접수 no', '접수no.', '접수 no.', 'no.',
  ], priority: 60 },
  { field: 'sample_id', aliases: [
    'sample id', 'sampleid', 'sample_id', 'sample no', 'sample no.',
    'sample number', 'sampleno', 'sample #', '샘플id', '샘플 id', 'no', '번호',
  ], priority: 40 },
]

const STAT_ROW_KEYWORDS = new Set([
  '평균', '합계', '표준편차', '공시험', '합산', '소계', '중간합',
  'average', 'mean', 'total', 'sum', 'subtotal',
  'sd', '%rsd', 'rsd', 'rsd%', 'cv%',
  'blank', 'blk', 'reagent blank', 'method blank',
  'lod', 'loq', '검출한계', '정량한계',
  'recovery', '회수율', 'spike',
  'duplicate', 'dup',
  'n=',
])

const HEADER_KEYWORDS = [
  '접수번호', 'lims', '샘플명', '시료명', '결과값', '시험일', '분석일', '분석일자',
  'sample', 'result', 'concentration', 'no.', '접수', '시험항목',
  '의뢰명', '업체명', '의뢰자', '고객명',
  '품명', '검체', '함량', '정량', '측정', '번호', '분석항목', '일자',
  '측정값', '함유량', '분석결과', '단위', '성분',
  '의뢰업체', '검체명',
  '조단백', '단백질', 'crude protein',
  '비타민a', '비타민e', '비타민 a', '비타민 e', 'α-te', 'retinol',
  'pb', 'cd', 'as', 'hg', '납', '카드뮴', '비소', '수은', 'mg/kg',
  'result (mg/kg)', '무기비소', '총비소',
]

// ── 유틸리티 함수 ─────────────────────────────────────────────────────────────

/**
 * Excel Date → 'YYYY-MM-DD'
 *
 * SheetJS(cellDates:true)는 Excel 날짜를 UTC 기준 Date로 변환할 때
 * KST(UTC+9) 환경에서 자정(00:00 KST)이 14:59 UTC로 들어오는 문제가 있음.
 * 가장 가까운 UTC 자정으로 반올림하면 올바른 날짜를 복원할 수 있음.
 * 예) 2026-05-31T14:59Z → round → 2026-06-01T00:00Z → '2026-06-01' ✓
 */
function excelDateToStr(d: Date): string {
  const MS_PER_DAY = 86400000
  const rounded = new Date(Math.round(d.getTime() / MS_PER_DAY) * MS_PER_DAY)
  return rounded.toISOString().slice(0, 10)
}

function normalizeCol(col: string): string {
  return col.replace(/[\s_\-.]+/g, ' ').toLowerCase().trim()
}

function aliasMatch(colNorm: string, alias: string): boolean {
  const aliasNorm = normalizeCol(alias).trim()
  const colClean = colNorm.replace(/\n/g, ' ').trim()
  if (!colClean) return false  // 빈 헤더 칸은 어떤 alias도 매칭하지 않음
  if (colClean === aliasNorm) return true
  if (aliasNorm.length > 0 && (aliasNorm.includes(colClean) || colClean.includes(aliasNorm))) return true
  // 한글 키워드 부분 포함
  if (/[\uAC00-\uD7A3]/.test(alias) && colNorm.includes(alias.toLowerCase())) return true
  return false
}

function isStatRow(sampleName?: string, sampleId?: string): boolean {
  for (const val of [sampleName, sampleId]) {
    if (!val) continue
    const v = val.trim().toLowerCase()
    if (!v || ['nan', 'none', '-', ''].includes(v)) return true
    for (const kw of STAT_ROW_KEYWORDS) {
      if (v.includes(kw)) return true
    }
  }
  return false
}

function parseDate(value: unknown): string | null {
  if (value == null || value === '') return null
  // cellDates:true 사용 시 JS Date 객체로 들어옴 → 로컬 기준으로 변환
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null
    return excelDateToStr(value)
  }
  if (typeof value === 'number') {
    // 혹시 날짜 직렬 숫자가 남아있는 경우 (fallback)
    try {
      // Excel 기준일: 1900-01-00 = 일련번호 0
      const excelEpoch = new Date(Date.UTC(1899, 11, 30))
      const d = new Date(excelEpoch.getTime() + value * 86400000)
      if (!isNaN(d.getTime()) && d.getFullYear() > 1900) {
        return excelDateToStr(d)
      }
    } catch { /* 무시 */ }
    return null
  }
  const s = String(value).trim()
  if (!s || s.toLowerCase() === 'nan') return null
  // 한국 날짜 형식 처리: 2026-05-11, 2026/05/11, 2026.05.11
  const m = s.match(/(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/)
  if (m) {
    const [, y, mo, d] = m
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  // 간단 날짜 파싱
  try {
    const parsed = new Date(s)
    if (!isNaN(parsed.getTime())) {
      return excelDateToStr(parsed)
    }
  } catch { /* 무시 */ }
  return null
}

function extractUnitFromCol(col: string): string | null {
  const colL = col.toLowerCase()
  const units: Array<[string, string]> = [
    ['mg/kg', 'mg/kg'], ['ug/100g', 'ug/100g'], ['μg/100g', 'ug/100g'],
    ['mg/100g', 'mg/100g'], ['g/100g', 'g/100g'], ['ug/l', 'ug/L'],
    ['μg/l', 'ug/L'], ['mg/l', 'mg/L'], ['g/l', 'g/L'],
    ['ppb', 'ppb'], ['ppm', 'ppm'], ['ng/g', 'ng/g'], ['ng/ml', 'ng/mL'],
    ['iu/100g', 'IU/100g'], ['%', '%'],
  ]
  for (const [token, label] of units) {
    if (colL.includes(token)) return label
  }
  const m = col.match(/[\(\[][\w/μ%α\-]+[\)\]]/)
  if (m) return m[0].replace(/[()[\]]/g, '')
  return null
}

// ── 헤더 행 감지 ──────────────────────────────────────────────────────────────

function scoreHeaderRow(rows: string[][], idx: number): number {
  if (idx >= rows.length) return 0
  const cells = rows[idx].map(v => String(v ?? ''))
  const rowText = cells.join(' ').toLowerCase()
  let score = 0
  for (const kw of HEADER_KEYWORDS) {
    if (rowText.includes(kw.toLowerCase())) score += 2
  }
  for (const cell of cells) {
    const norm = normalizeCol(cell)
    for (const rule of SAMPLE_ID_RULES) {
      if (rule.aliases.some(a => aliasMatch(norm, a))) { score += 3; break }
    }
    for (const field of ['result_value', 'sample_name', 'analysis_date', 'receipt_date', 'test_item']) {
      const aliases = COLUMN_ALIASES[field] ?? []
      if (aliases.some(a => aliasMatch(norm, a))) { score += 2; break }
    }
  }
  return score
}

// 헤더행 직접 감지: 숫자/날짜가 아닌 텍스트 셀이 많은 첫 번째 행
function isLikelyHeaderRow(cells: string[]): boolean {
  const nonEmpty = cells.filter(c => c !== '')
  if (nonEmpty.length === 0) return false
  // 숫자만인 셀이 절반 이상이면 헤더 아님
  const numericOnly = nonEmpty.filter(c => /^[\d.,+\-]+$/.test(c))
  // ISO 날짜 패턴도 헤더 아님
  const dateOnly = nonEmpty.filter(c => /^\d{4}-\d{2}-\d{2}/.test(c))
  if ((numericOnly.length + dateOnly.length) >= nonEmpty.length / 2) return false
  // LIMS 키워드나 알려진 컬럼명 포함 여부로 직접 판단
  const joined = cells.join(' ').toLowerCase()
  const HEADER_SIGNALS = [
    'lims', '시료명', '검체명', 'sample', 'result', 'concentration',
    '결과값', '접수번호', '번호', 'mg/kg', '분석일', '분석일', '시험일',
  ]
  return HEADER_SIGNALS.some(s => joined.includes(s.toLowerCase()))
}

function detectHeaderRow(rows: string[][]): number {
  // 1차: 처음 15행 중 헤더처럼 보이는 첫 번째 행 직접 탐색
  for (let i = 0; i < Math.min(15, rows.length); i++) {
    if (isLikelyHeaderRow(rows[i])) {
      console.log('[detectHeaderRow] 직접탐색 row', i, ':', rows[i])
      return i
    }
  }
  // 2차: 점수 기반 (fallback)
  let bestRow = 0
  let bestScore = 0
  for (let i = 0; i < Math.min(20, rows.length); i++) {
    const s = scoreHeaderRow(rows, i)
    if (s > bestScore) { bestScore = s; bestRow = i }
  }
  console.log('[detectHeaderRow] 점수기반 row', bestRow, 'score', bestScore)
  return bestScore >= 3 ? bestRow : 0
}

// ── 컬럼 매핑 ─────────────────────────────────────────────────────────────────

function mapSampleIdColumns(headers: string[]): Record<string, string> {
  const found: Record<string, { col: string; priority: number }> = {}
  for (const col of headers) {
    const norm = normalizeCol(col)
    const low = col.toLowerCase()
    for (const rule of SAMPLE_ID_RULES) {
      const matched = rule.aliases.some(a => aliasMatch(norm, a) || aliasMatch(low, a))
      if (matched) {
        if (!(rule.field in found) || rule.priority > found[rule.field].priority) {
          found[rule.field] = { col, priority: rule.priority }
        }
      }
    }
  }
  return Object.fromEntries(Object.entries(found).map(([k, v]) => [k, v.col]))
}

function autoMapColumns(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {}
  Object.assign(mapping, mapSampleIdColumns(headers))

  // 결과값 최우선: "결과값 최종" / "최종값"
  for (const col of headers) {
    const low = col.toLowerCase()
    if (!mapping.result_value) {
      if (['결과값 최종', '결과값최종', '최종결과값', '최종 결과값'].includes(low)) { mapping.result_value = col }
      else if (['최종값', '결과 최종', '최종'].includes(low)) { mapping.result_value = col }
    }
  }

  // sample_name exact match
  const SAMPLE_NAME_EXACT = new Set(['시료명', '검체명', '시료 명', '검체 명', '검체명칭', '시험시료명', '시험검체명', 'sample name', 'samplename'])
  for (const col of headers) {
    if (!mapping.sample_name && SAMPLE_NAME_EXACT.has(col.trim())) { mapping.sample_name = col }
  }

  const usedCols = new Set(Object.values(mapping))
  for (const col of headers) {
    if (usedCols.has(col)) continue
    const norm = normalizeCol(col)
    let fieldMapped = false
    for (const field of ['sample_name', 'receipt_date', 'analysis_date', 'test_item', 'project_name', 'unit', 'batch_info'] as const) {
      if (mapping[field]) continue
      const aliases = COLUMN_ALIASES[field] ?? []
      if (aliases.some(a => aliasMatch(norm, a))) {
        mapping[field] = col
        usedCols.add(col)
        fieldMapped = true
        break
      }
    }

    if (!mapping.result_value && !fieldMapped) {
      const low = col.toLowerCase()
      if (
        (low.includes('result') && low.includes('mg/kg')) ||
        ['함량', '정량', '측정값'].some(k => col.includes(k)) ||
        ['조단백', '단백질', 'crude protein'].some(k => low.includes(k)) ||
        ['비타민a', '비타민e', 'retinol', 'α-te', 'tocopherol'].some(k => low.includes(k)) ||
        ['납', '카드뮴', '비소', '수은', 'pb(mg', 'cd(mg', 'as(mg'].some(k => low.includes(k))
      ) {
        mapping.result_value = col
        usedCols.add(col)
      }
    }
  }
  return mapping
}

// ── 파일명에서 시험항목 감지 ──────────────────────────────────────────────────

const FILENAME_TEST_ITEM_MAP: Array<[string[], string]> = [
  [['조단백', 'crude protein', 'protein'], '조단백'],
  [['비타민a', 'vitamin a', '비타민 a', 'retinol'], '비타민 A'],
  [['비타민e', 'vitamin e', '비타민 e', 'tocopherol'], '비타민 E'],
  [['중금속', 'heavy metal', 'pb', 'cd', 'icp'], '중금속'],
  [['무기비소', 'inorganic arsenic', 'arsenic'], '무기비소'],
]

function detectTestItemFromFilename(filename: string): string | null {
  const low = filename.toLowerCase()
  for (const [keywords, label] of FILENAME_TEST_ITEM_MAP) {
    if (keywords.some(k => low.includes(k))) return label
  }
  return null
}

// ── 샘플 ID 결정 ──────────────────────────────────────────────────────────────

function resolveSampleId(row: Record<string, unknown>, mapping: Record<string, string>): [string, string | null] {
  const invalid = new Set(['nan', 'no', '접수번호', 'lims', 'sample id', 'sampleid', 'id'])
  function cell(field: string): string | null {
    const col = mapping[field]
    if (!col) return null
    const v = String(row[col] ?? '').trim()
    if (!v || invalid.has(v.toLowerCase())) return null
    return v
  }
  const lims = cell('lims_id')
  const receipt = cell('receipt_id')
  const generic = cell('sample_id')
  if (lims) return [lims, receipt && receipt !== lims ? receipt : null]
  if (receipt) return [receipt, null]
  if (generic) return [generic, null]
  return ['', null]
}

// ── 파싱된 샘플 타입 ──────────────────────────────────────────────────────────

export interface ParsedSample {
  sample_id: string
  receipt_number?: string
  sample_name?: string
  project_name?: string
  test_item?: string
  result_value?: string
  unit?: string
  analysis_date?: string
  receipt_date?: string
  batch_info?: string
  is_abnormal: boolean
  source_file: string
}

export interface ParseResult {
  samples: ParsedSample[]
  project_name: string
  test_item: string
  filename: string
}

// ── 시트명 → 시험항목 매핑 ────────────────────────────────────────────────────

const SHEET_TEST_ITEM_MAP: Array<[string[], string]> = [
  [['비소as', '비소 as', 'arsenic', 'as'], '비소(As)'],
  [['카드뮴cd', '카드뮴 cd', 'cadmium', 'cd'], '카드뮴(Cd)'],
  [['납pb', '납 pb', 'lead', 'pb'], '납(Pb)'],
  [['주석sn', '주석 sn', 'tin', 'sn'], '주석(Sn)'],
  [['무기비소', 'inorganic arsenic'], '무기비소'],
  [['수은', 'mercury', 'hg'], '수은(Hg)'],
  [['비타민a', 'vitamin a', '^a$'], '비타민 A'],
  [['비타민e', 'vitamin e', '^e$'], '비타민 E'],
  [['비타민ae', 'vitamin ae'], '비타민 A/E'],
  [['조단백', 'crude protein', 'protein'], '조단백'],
  [['중금속', 'heavy metal'], '중금속'],
]

// 데이터가 없는 시트는 스킵
const SKIP_SHEET_KEYWORDS = ['표준용액', 'fapas', '제조법', 'standard', 'calibration', 'qc', '검량선']

function detectTestItemFromSheet(sheetName: string): string | null {
  const low = sheetName.toLowerCase().trim()
  for (const [keywords, label] of SHEET_TEST_ITEM_MAP) {
    for (const kw of keywords) {
      if (kw.startsWith('^') && kw.endsWith('$')) {
        if (low === kw.slice(1, -1)) return label
      } else if (low.includes(kw)) {
        return label
      }
    }
  }
  return null
}

function shouldSkipSheet(sheetName: string): boolean {
  const low = sheetName.toLowerCase()
  return SKIP_SHEET_KEYWORDS.some(kw => low.includes(kw))
}

// ── 날짜 열 빈 셀 채우기 (위아래 이웃 값으로 보간) ──────────────────────────────

/**
 * 날짜 배열에서 null인 위치를 이웃 값으로 채운다.
 * - 위에 값 있고 아래도 값 있음 → 위 값 사용 (같은 날짜 블록으로 간주)
 * - 위만 있음 → 위 값으로 채움 (fill-down)
 * - 아래만 있음 → 아래 값으로 채움 (fill-up, 파일 시작 부분)
 */
function fillDateGaps(dates: (string | null)[]): (string | null)[] {
  const result = [...dates]
  const n = result.length

  // 1pass: fill-down (위 → 아래)
  let last: string | null = null
  for (let i = 0; i < n; i++) {
    if (result[i]) { last = result[i] }
    else if (last) { result[i] = last }
  }

  // 2pass: fill-up (아래 → 위) — 맨 앞 비어있는 경우
  let next: string | null = null
  for (let i = n - 1; i >= 0; i--) {
    if (result[i]) { next = result[i] }
    else if (next) { result[i] = next }
  }

  return result
}

// ── 단일 시트 파싱 (내부 헬퍼) ────────────────────────────────────────────────

function parseSheet(
  raw: unknown[][],
  sheetName: string,
  filename: string,
  originalFileName: string,
  sheetTestItem: string | null,
  filenameTestItem: string | null,
): ParsedSample[] {
  if (raw.length < 2) return []

  const strRows = raw.map(row => row.map(v => {
    if (v == null) return ''
    if (v instanceof Date) {
      if (isNaN(v.getTime())) return ''
      return excelDateToStr(v)  // 로컬 날짜 기준 (UTC 사용 시 KST와 하루 차이)
    }
    return String(v)
  }))

  const headerRowIdx = detectHeaderRow(strRows)
  const headers = strRows[headerRowIdx]
  const mapping = autoMapColumns(headers)

  console.log(`[parseSheet] 시트:${sheetName} 헤더행:${headerRowIdx} 매핑:`, JSON.stringify(mapping))

  // 날짜 열 인덱스 찾기 → 빈 셀 보간
  const dataRows = raw.slice(headerRowIdx + 1)
  const analysisDateColIdx = mapping.analysis_date ? headers.indexOf(mapping.analysis_date) : -1
  const receiptDateColIdx  = mapping.receipt_date  ? headers.indexOf(mapping.receipt_date)  : -1

  const filledAnalysisDates = analysisDateColIdx >= 0
    ? fillDateGaps(dataRows.map(r => parseDate(r[analysisDateColIdx] ?? null)))
    : null
  const filledReceiptDates = receiptDateColIdx >= 0
    ? fillDateGaps(dataRows.map(r => parseDate(r[receiptDateColIdx] ?? null)))
    : null

  const samples: ParsedSample[] = []
  for (let i = headerRowIdx + 1; i < raw.length; i++) {
    const dataIdx = i - (headerRowIdx + 1)
    const rawRow = raw[i]
    const row: Record<string, unknown> = {}
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = rawRow[j] ?? null
    }

    const [sampleId, receiptNum] = resolveSampleId(row, mapping)
    if (!sampleId) continue

    const sampleNameCol = mapping.sample_name
    const sampleName = sampleNameCol ? String(row[sampleNameCol] ?? '').trim() : undefined

    if (isStatRow(sampleName, sampleId)) continue

    let resultValue: string | undefined
    let unit: string | undefined
    if (mapping.result_value) {
      const v = row[mapping.result_value]
      resultValue = v != null && String(v).trim() ? String(v).trim() : undefined
      unit = extractUnitFromCol(mapping.result_value) ?? undefined
    }
    if (!unit && mapping.unit) {
      unit = String(row[mapping.unit] ?? '').trim() || undefined
    }

    // 보간된 날짜 사용 (빈 셀은 위아래 이웃 값으로 채워진 상태)
    let analysisDate = filledAnalysisDates ? filledAnalysisDates[dataIdx] : null
    let receiptDate  = filledReceiptDates  ? filledReceiptDates[dataIdx]  : null
    // 날짜 열이 매핑되지 않은 경우 원본 셀에서 직접 파싱
    if (!filledAnalysisDates) {
      try { analysisDate = parseDate(rawRow[analysisDateColIdx] ?? null) } catch { /* 무시 */ }
    }
    if (!filledReceiptDates) {
      try { receiptDate = parseDate(rawRow[receiptDateColIdx] ?? null) } catch { /* 무시 */ }
    }

    const projectNameCol = mapping.project_name
    const projectName = projectNameCol ? String(row[projectNameCol] ?? '').trim() || undefined : undefined

    // 시험항목 우선순위: 컬럼값 > 시트명 > 파일명
    const testItemCol = mapping.test_item
    const colTestItem = testItemCol ? String(row[testItemCol] ?? '').trim() || undefined : undefined
    const testItem = colTestItem ?? sheetTestItem ?? filenameTestItem ?? undefined

    const batchCol = mapping.batch_info
    const batchInfo = batchCol ? String(row[batchCol] ?? '').trim() || undefined : undefined

    samples.push({
      sample_id: sampleId,
      receipt_number: receiptNum ?? undefined,
      sample_name: sampleName || undefined,
      project_name: projectName,
      test_item: testItem,
      result_value: resultValue,
      unit,
      analysis_date: analysisDate ?? undefined,
      receipt_date: receiptDate ?? undefined,
      batch_info: batchInfo,
      is_abnormal: false,
      source_file: originalFileName,
    })
  }

  return samples
}

// ── 메인 파싱 함수 ────────────────────────────────────────────────────────────

export async function parseExcelFile(file: File): Promise<ParseResult> {
  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array', cellDates: true })
  const filename = file.name.replace(/\.[^.]+$/, '')
  const filenameTestItem = detectTestItemFromFilename(file.name)

  const allSamples: ParsedSample[] = []

  for (const sheetName of workbook.SheetNames) {
    if (shouldSkipSheet(sheetName)) {
      console.log(`[parseExcelFile] 시트 스킵: ${sheetName}`)
      continue
    }

    const sheet = workbook.Sheets[sheetName]
    const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true })

    const sheetTestItem = detectTestItemFromSheet(sheetName)
    const samples = parseSheet(raw, sheetName, filename, file.name, sheetTestItem, filenameTestItem)

    console.log(`[parseExcelFile] 시트:${sheetName} → 시험항목:${sheetTestItem ?? '(컬럼감지)'} 샘플:${samples.length}건`)
    allSamples.push(...samples)
  }

  // 대표 test_item (가장 많이 나온 것, work_log 제목용)
  const testItemCounts: Record<string, number> = {}
  for (const s of allSamples) {
    if (s.test_item) testItemCounts[s.test_item] = (testItemCounts[s.test_item] ?? 0) + 1
  }
  const primaryTestItem = Object.entries(testItemCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
    ?? filenameTestItem ?? ''

  console.log(`[parseExcelFile] 전체 샘플:${allSamples.length}건 / 대표 시험항목:${primaryTestItem}`)

  return {
    samples: allSamples,
    project_name: filename,
    test_item: primaryTestItem,
    filename: file.name,
  }
}
