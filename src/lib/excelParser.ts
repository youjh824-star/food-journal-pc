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
    '분析일', '분석일', '시험일', '실험일',
    '분析일자', '분析일자', '분析 일자', '분석일자', '분석날짜',
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
  '접수번호', 'lims', '샘플명', '시료명', '결과값', '시험일', '분析일', '분析일자',
  'sample', 'result', 'concentration', 'no.', '접수', '시험항목',
  '의뢰명', '업체명', '의뢰자', '고객명',
  '품명', '검체', '함량', '정량', '측정', '번호', '분석항목', '일자',
  '측정값', '함유량', '분析결과', '단위', '성분',
  '의뢰업체', '검체명',
  '조단백', '단백질', 'crude protein',
  '비타민a', '비타민e', '비타민 a', '비타민 e', 'α-te', 'retinol',
  'pb', 'cd', 'as', 'hg', '납', '카드뮴', '비소', '수은', 'mg/kg',
  'result (mg/kg)', '무기비소', '총비소',
]

// ── 유틸리티 함수 ─────────────────────────────────────────────────────────────

function normalizeCol(col: string): string {
  return col.replace(/[\s_\-.]+/g, ' ').toLowerCase().trim()
}

function aliasMatch(colNorm: string, alias: string): boolean {
  const aliasNorm = normalizeCol(alias).trim()
  const colClean = colNorm.replace(/\n/g, ' ').trim()
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
  if (typeof value === 'number') {
    // Excel 날짜 직렬 숫자
    const d = XLSX.SSF.parse_date_code(value)
    if (d) {
      const mm = String(d.m).padStart(2, '0')
      const dd = String(d.d).padStart(2, '0')
      return `${d.y}-${mm}-${dd}`
    }
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
      return parsed.toISOString().slice(0, 10)
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

function detectHeaderRow(rows: string[][]): number {
  let bestRow = 0
  let bestScore = 0
  for (let i = 0; i < Math.min(20, rows.length); i++) {
    const s = scoreHeaderRow(rows, i)
    if (s > bestScore) { bestScore = s; bestRow = i }
  }
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
      if (fieldMapped) break
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

// ── 메인 파싱 함수 ────────────────────────────────────────────────────────────

export async function parseExcelFile(file: File): Promise<ParseResult> {
  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: false })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]

  // raw 2D 배열로 읽기
  const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true })
  const strRows = raw.map(row => row.map(v => v == null ? '' : String(v)))

  const headerRowIdx = detectHeaderRow(strRows)
  const headers = strRows[headerRowIdx]
  const mapping = autoMapColumns(headers)

  const filenameTestItem = detectTestItemFromFilename(file.name)
  const filename = file.name.replace(/\.[^.]+$/, '') // 확장자 제거

  // 데이터 행 파싱
  const samples: ParsedSample[] = []
  for (let i = headerRowIdx + 1; i < raw.length; i++) {
    const rawRow = raw[i]
    const row: Record<string, unknown> = {}
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = rawRow[j] ?? null
    }

    // sample_id 결정
    const [sampleId, receiptNum] = resolveSampleId(row, mapping)
    if (!sampleId) continue

    const sampleNameCol = mapping.sample_name
    const sampleName = sampleNameCol ? String(row[sampleNameCol] ?? '').trim() : undefined

    if (isStatRow(sampleName, sampleId)) continue

    // 결과값 / 단위
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

    // 날짜 파싱 (Excel 직렬 숫자 처리)
    const analysisDateRaw = mapping.analysis_date ? raw[i][headers.indexOf(mapping.analysis_date)] : null
    const receiptDateRaw = mapping.receipt_date ? raw[i][headers.indexOf(mapping.receipt_date)] : null

    const analysisDate = parseDate(analysisDateRaw)
    const receiptDate = parseDate(receiptDateRaw)

    const projectNameCol = mapping.project_name
    const projectName = projectNameCol ? String(row[projectNameCol] ?? '').trim() || undefined : undefined

    const testItemCol = mapping.test_item
    const testItem = testItemCol ? String(row[testItemCol] ?? '').trim() || undefined : (filenameTestItem ?? undefined)

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
      source_file: file.name,
    })
  }

  // 대표 test_item (가장 많이 나온 것)
  const testItemCounts: Record<string, number> = {}
  for (const s of samples) {
    if (s.test_item) testItemCounts[s.test_item] = (testItemCounts[s.test_item] ?? 0) + 1
  }
  const primaryTestItem = Object.entries(testItemCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
    ?? filenameTestItem ?? ''

  return {
    samples,
    project_name: filename,
    test_item: primaryTestItem,
    filename: file.name,
  }
}
