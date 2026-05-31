/**
 * PC 프론트엔드 Supabase 클라이언트
 * FastAPI 백엔드 없이 Supabase에 직접 연결
 */
import { createClient } from '@supabase/supabase-js'
import type {
  WorkLog, Sample, Equipment, EquipmentIssue, Reagent,
  Todo, ScheduleEvent, ExperimentMethod, CalendarDay, DashboardData, Statistics,
} from '../api/client'
import { parseExcelFile, type ParsedSample } from './excelParser'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ── 날짜 헬퍼 ────────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().slice(0, 10)
}
function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10)
}
function daysLater(n: number): string {
  return new Date(Date.now() + n * 86400000).toISOString().slice(0, 10)
}

// ── 업무일지 ──────────────────────────────────────────────────────────────────

export async function sbGetWorklogs(params?: Record<string, string>): Promise<WorkLog[]> {
  let q = supabase.from('work_logs').select(`
    id, log_date, project_name, test_item, sample_count, workload,
    equipment_id, equipment_name, duration_hours, operator, status, notes,
    source_file, auto_generated, created_at
  `).order('log_date', { ascending: false })
  if (params?.search) {
    q = q.or(`project_name.ilike.%${params.search}%,test_item.ilike.%${params.search}%`)
  }
  if (params?.start_date) q = q.gte('log_date', params.start_date)
  if (params?.end_date) q = q.lte('log_date', params.end_date)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as WorkLog[]
}

export async function sbCreateWorklog(d: Partial<WorkLog>): Promise<WorkLog> {
  const { data, error } = await supabase.from('work_logs').insert([d]).select().single()
  if (error) throw new Error(error.message)
  return data as unknown as WorkLog
}

export async function sbUpdateWorklog(id: number, d: Partial<WorkLog>): Promise<WorkLog> {
  const { data, error } = await supabase.from('work_logs').update(d).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return data as unknown as WorkLog
}

export async function sbDeleteWorklog(id: number, deleteSamples = false): Promise<void> {
  if (deleteSamples) {
    // 관련 샘플 삭제
    const { data: wl } = await supabase.from('work_logs').select('source_file').eq('id', id).single()
    if (wl?.source_file) {
      await supabase.from('samples').delete().eq('source_file', wl.source_file)
    }
  }
  const { error } = await supabase.from('work_logs').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── 샘플 ─────────────────────────────────────────────────────────────────────

export async function sbGetSamples(params?: Record<string, string>): Promise<Sample[]> {
  let q = supabase.from('samples').select('*').order('analysis_date', { ascending: false })
  if (params?.search) {
    q = q.or(`sample_name.ilike.%${params.search}%,sample_id.ilike.%${params.search}%,project_name.ilike.%${params.search}%`)
  }
  if (params?.test_item) q = q.eq('test_item', params.test_item)
  if (params?.project_name) q = q.eq('project_name', params.project_name)
  if (params?.limit) q = q.limit(parseInt(params.limit))
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as Sample[]
}

export async function sbGetSampleTestItems(): Promise<{ total: number; items: { name: string; count: number }[] }> {
  const { data, error } = await supabase.from('samples').select('test_item')
  if (error) throw new Error(error.message)
  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    if (row.test_item) counts[row.test_item] = (counts[row.test_item] ?? 0) + 1
  }
  const items = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }))
  return { total: items.reduce((s, i) => s + i.count, 0), items }
}

export async function sbDeleteAllSamples(): Promise<{ deleted: number }> {
  const { data: all } = await supabase.from('samples').select('id')
  if (!all?.length) return { deleted: 0 }
  const { error } = await supabase.from('samples').delete().neq('id', 0)
  if (error) throw new Error(error.message)
  return { deleted: all.length }
}

// ── 파일 업로드 (Excel 파싱 + Supabase 저장) ─────────────────────────────────

import type { UploadResult } from '../api/types'
export type { UploadResult }

export async function sbUploadFile(file: File, equipmentId?: number): Promise<UploadResult> {
  const t0 = Date.now()
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const isExcel = ['xlsx', 'xls', 'csv'].includes(ext)

  if (!isExcel) {
    throw new Error('Excel(.xlsx, .xls) 또는 CSV 파일만 업로드 가능합니다.')
  }

  // Excel 파싱
  const { samples, project_name, test_item, filename } = await parseExcelFile(file)
  if (samples.length === 0) {
    throw new Error('파싱된 샘플 데이터가 없습니다. 파일 형식을 확인하세요.')
  }

  // 장비 이름 조회
  let equipmentName: string | undefined
  if (equipmentId) {
    const { data: eq } = await supabase.from('equipment').select('name').eq('id', equipmentId).single()
    equipmentName = eq?.name
  }

  // 업무일지 생성
  const { data: wl, error: wlErr } = await supabase.from('work_logs').insert([{
    log_date: today(),
    project_name,
    test_item,
    sample_count: samples.length,
    workload: samples.length,
    equipment_id: equipmentId ?? null,
    equipment_name: equipmentName ?? null,
    duration_hours: 8,
    status: 'completed',
    auto_generated: true,
    source_file: filename,
  }]).select().single()
  if (wlErr) throw new Error(wlErr.message)

  // 중복 샘플 체크 & 재시험 처리
  const processedSamples = await processSamples(samples, project_name)

  // 샘플 삽입 (배치)
  const BATCH = 100
  for (let i = 0; i < processedSamples.length; i += BATCH) {
    const batch = processedSamples.slice(i, i + BATCH)
    const { error } = await supabase.from('samples').insert(batch)
    if (error) throw new Error(error.message)
  }

  return {
    filename: file.name,
    sample_count: processedSamples.length,
    work_log_id: wl.id,
    anomalies: [],
    retest_comparisons: [],
    retest_count: 0,
    processing_time_ms: Date.now() - t0,
  }
}

async function processSamples(samples: ParsedSample[], _projectName: string) {
  // 기존 샘플 조회 (재시험 감지)
  const sampleIds = samples.map(s => s.sample_id).filter(Boolean)
  const existingMap = new Map<string, { result_value?: string; analysis_date?: string }>()
  if (sampleIds.length > 0) {
    const { data: existing } = await supabase
      .from('samples')
      .select('sample_id, result_value, analysis_date')
      .in('sample_id', sampleIds.slice(0, 100))
    for (const e of existing ?? []) {
      if (e.sample_id) existingMap.set(e.sample_id, e)
    }
  }

  return samples.map(s => {
    const prev = existingMap.get(s.sample_id)
    const isRetest = !!prev
    const resultChange = isRetest && prev?.result_value && s.result_value
      ? `${prev.result_value} → ${s.result_value}` : undefined

    return {
      sample_id: s.sample_id,
      receipt_number: s.receipt_number ?? null,
      sample_name: s.sample_name ?? null,
      project_name: s.project_name ?? null,
      test_item: s.test_item ?? null,
      result_value: s.result_value ?? null,
      unit: s.unit ?? null,
      analysis_date: s.analysis_date ?? null,
      receipt_date: s.receipt_date ?? null,
      batch_info: s.batch_info ?? null,
      is_abnormal: s.is_abnormal,
      is_duplicate: false,
      is_retest: isRetest,
      base_sample_id: isRetest ? s.sample_id : null,
      previous_result_value: prev?.result_value ?? null,
      result_change: resultChange ?? null,
      source_file: s.source_file,
    }
  })
}

// ── 장비 ─────────────────────────────────────────────────────────────────────

export async function sbGetEquipment(): Promise<Equipment[]> {
  const { data, error } = await supabase.from('equipment')
    .select('*, equipment_issues(count)')
    .order('created_at')
  if (error) throw new Error(error.message)
  return (data ?? []).map((eq: Record<string, unknown>) => ({
    ...eq,
    open_issue_count: (eq.equipment_issues as { count: number }[])?.[0]?.count ?? 0,
  })) as unknown as Equipment[]
}

export async function sbCreateEquipment(d: Partial<Equipment>): Promise<Equipment> {
  const { data, error } = await supabase.from('equipment').insert([d]).select().single()
  if (error) throw new Error(error.message)
  return data as unknown as Equipment
}

export async function sbUpdateEquipment(id: number, d: Partial<Equipment>): Promise<Equipment> {
  const { data, error } = await supabase.from('equipment').update(d).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return data as unknown as Equipment
}

export async function sbDeleteEquipment(id: number): Promise<void> {
  const { error } = await supabase.from('equipment').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function sbGetEquipmentIssues(eqId: number): Promise<EquipmentIssue[]> {
  const { data, error } = await supabase.from('equipment_issues')
    .select('*').eq('equipment_id', eqId).order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as EquipmentIssue[]
}

export async function sbCreateEquipmentIssue(eqId: number, d: Partial<EquipmentIssue>): Promise<EquipmentIssue> {
  const { data, error } = await supabase.from('equipment_issues')
    .insert([{ ...d, equipment_id: eqId }]).select().single()
  if (error) throw new Error(error.message)
  return data as unknown as EquipmentIssue
}

export async function sbUpdateEquipmentIssue(issueId: number, d: Partial<EquipmentIssue>): Promise<EquipmentIssue> {
  const { data, error } = await supabase.from('equipment_issues').update(d).eq('id', issueId).select().single()
  if (error) throw new Error(error.message)
  return data as unknown as EquipmentIssue
}

export async function sbDeleteEquipmentIssue(issueId: number): Promise<void> {
  const { error } = await supabase.from('equipment_issues').delete().eq('id', issueId)
  if (error) throw new Error(error.message)
}

// ── 시약 ─────────────────────────────────────────────────────────────────────

export async function sbGetReagents(params?: Record<string, string>): Promise<Reagent[]> {
  let q = supabase.from('reagents').select('*').order('name')
  if (params?.search) q = q.ilike('name', `%${params.search}%`)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as Reagent[]
}

export async function sbCreateReagent(d: Partial<Reagent>): Promise<Reagent> {
  const { data, error } = await supabase.from('reagents').insert([d]).select().single()
  if (error) throw new Error(error.message)
  return data as unknown as Reagent
}

export async function sbUpdateReagent(id: number, d: Partial<Reagent>): Promise<Reagent> {
  const { data, error } = await supabase.from('reagents').update(d).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return data as unknown as Reagent
}

export async function sbDeleteReagent(id: number): Promise<void> {
  const { error } = await supabase.from('reagents').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── 할일 ─────────────────────────────────────────────────────────────────────

export async function sbGetTodos(): Promise<Todo[]> {
  const { data, error } = await supabase.from('todo_items')
    .select('*').order('priority').order('created_at')
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as Todo[]
}

export async function sbCreateTodo(d: Partial<Todo>): Promise<Todo> {
  const { data, error } = await supabase.from('todo_items')
    .insert([{ ...d, completed: false }]).select().single()
  if (error) throw new Error(error.message)
  return data as unknown as Todo
}

export async function sbUpdateTodo(id: number, d: Partial<Todo>): Promise<Todo> {
  const { data, error } = await supabase.from('todo_items').update(d).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return data as unknown as Todo
}

export async function sbToggleTodo(id: number): Promise<{ completed: boolean }> {
  const { data: cur } = await supabase.from('todo_items').select('completed').eq('id', id).single()
  const newVal = !cur?.completed
  await supabase.from('todo_items').update({
    completed: newVal,
    last_completed_date: newVal ? today() : null,
  }).eq('id', id)
  return { completed: newVal }
}

export async function sbDeleteTodo(id: number): Promise<void> {
  const { error } = await supabase.from('todo_items').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── 달력 이벤트 ───────────────────────────────────────────────────────────────

export async function sbGetCalendarEvents(params?: Record<string, string>): Promise<ScheduleEvent[]> {
  let q = supabase.from('calendar_events').select('*').order('event_date')
  if (params?.start_date) q = q.gte('event_date', params.start_date)
  if (params?.end_date) q = q.lte('event_date', params.end_date)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as ScheduleEvent[]
}

export async function sbCreateCalendarEvent(d: { title: string; event_date: string; description?: string; category?: string; color?: string }): Promise<ScheduleEvent> {
  const { data, error } = await supabase.from('calendar_events').insert([d]).select().single()
  if (error) throw new Error(error.message)
  return data as unknown as ScheduleEvent
}

export async function sbUpdateCalendarEvent(id: number, d: Partial<ScheduleEvent>): Promise<ScheduleEvent> {
  const { data, error } = await supabase.from('calendar_events').update(d).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return data as unknown as ScheduleEvent
}

export async function sbDeleteCalendarEvent(id: number): Promise<void> {
  const { error } = await supabase.from('calendar_events').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── 시험법 자료 ───────────────────────────────────────────────────────────────

export async function sbGetMethods(testItem?: string): Promise<ExperimentMethod[]> {
  let q = supabase.from('experiment_methods').select('*').order('created_at', { ascending: false })
  if (testItem) q = q.eq('test_item', testItem)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data ?? []).map((m: Record<string, unknown>) => ({
    ...m,
    has_local_file: false,
    has_view: !!m.file_url,
    view_type: m.file_type === 'pdf' ? 'pdf' : m.file_type,
  })) as unknown as ExperimentMethod[]
}

export async function sbGetMethodTestItems(): Promise<string[]> {
  const { data, error } = await supabase.from('experiment_methods').select('test_item')
  if (error) throw new Error(error.message)
  const set = new Set<string>()
  for (const row of data ?? []) { if (row.test_item) set.add(row.test_item) }
  return [...set].sort()
}

export async function sbUploadMethod(d: {
  title: string; test_item: string; description: string; file: File
}): Promise<ExperimentMethod> {
  const ext = d.file.name.split('.').pop()?.toLowerCase() ?? 'bin'
  const path = `methods/${Date.now()}_${d.file.name}`

  // Supabase Storage 업로드
  const { error: uploadErr } = await supabase.storage
    .from('experiment-files')
    .upload(path, d.file, { contentType: d.file.type || 'application/octet-stream' })
  if (uploadErr) throw new Error(uploadErr.message)

  const { data: urlData } = supabase.storage.from('experiment-files').getPublicUrl(path)
  const fileUrl = urlData.publicUrl

  const { data, error } = await supabase.from('experiment_methods').insert([{
    title: d.title,
    test_item: d.test_item,
    description: d.description,
    file_name: d.file.name,
    file_type: ext,
    file_url: fileUrl,
    file_size: d.file.size,
  }]).select().single()
  if (error) throw new Error(error.message)

  return {
    ...(data as Record<string, unknown>),
    has_local_file: false,
    has_view: true,
    view_type: ext,
  } as unknown as ExperimentMethod
}

export async function sbDeleteMethod(id: number): Promise<void> {
  const { error } = await supabase.from('experiment_methods').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── 앱 설정 (스티커 메모 등) ──────────────────────────────────────────────────

export async function sbGetAppSetting(key: string): Promise<string | null> {
  const { data } = await supabase.from('app_settings').select('value').eq('key', key).maybeSingle()
  return data?.value ?? null
}

export async function sbSetAppSetting(key: string, value: string): Promise<void> {
  await supabase.from('app_settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
}

// ── 대시보드 ──────────────────────────────────────────────────────────────────

export async function sbGetDashboard(): Promise<DashboardData> {
  const td = today()
  const weekAgo = daysAgo(7)
  const monthAgo = daysAgo(30)
  const in30 = daysLater(30)
  const todayDow = new Date().getDay()

  const [todayLogs, weekLogs, monthLogs, todos, openIssues, reagents] = await Promise.all([
    supabase.from('work_logs').select('sample_count,workload').eq('log_date', td),
    supabase.from('work_logs').select('log_date,sample_count,workload,test_item').gte('log_date', weekAgo),
    supabase.from('work_logs').select('sample_count,workload,test_item,project_name').gte('log_date', monthAgo),
    supabase.from('todo_items').select('id,title,priority,completed,schedule_type,recurrence_weekday,due_date').order('priority').order('created_at'),
    supabase.from('equipment_issues').select('id,title,issue_type,status').eq('status', 'open').limit(10),
    supabase.from('reagents').select('id,name,expiry_date,stock_amount').lte('expiry_date', in30).gte('expiry_date', td).order('expiry_date').limit(10),
  ])

  const todayWorkload = (todayLogs.data ?? []).reduce((s, r) => s + (r.workload ?? r.sample_count ?? 0), 0)
  const weekWorkload = (weekLogs.data ?? []).reduce((s, r) => s + (r.workload ?? r.sample_count ?? 0), 0)
  const monthWorkload = (monthLogs.data ?? []).reduce((s, r) => s + (r.workload ?? r.sample_count ?? 0), 0)

  // 오늘 할일
  const allTodos = (todos.data ?? []) as unknown as Todo[]
  const todayTodos = allTodos.filter(t => {
    if (t.completed) return false
    if (t.schedule_type === 'daily') return true
    if (t.schedule_type === 'weekly' && t.recurrence_weekday === todayDow) return true
    if (t.schedule_type === 'once') return true
    return false
  }).slice(0, 5)

  // 주간 트렌드
  const trendMap: Record<string, number> = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    trendMap[d.toISOString().slice(0, 10)] = 0
  }
  for (const r of weekLogs.data ?? []) {
    const k = String(r.log_date).slice(0, 10)
    if (k in trendMap) trendMap[k] += r.sample_count ?? 0
  }
  const week_trend = Object.entries(trendMap).map(([date, samples]) => ({
    date, samples, label: date.slice(5),
  }))

  // 시험항목별
  const itemCounts: Record<string, number> = {}
  for (const r of monthLogs.data ?? []) {
    if (r.test_item) itemCounts[r.test_item] = (itemCounts[r.test_item] ?? 0) + (r.sample_count ?? 1)
  }
  const top_test_items = Object.entries(itemCounts)
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([name, value]) => ({ name, value }))

  // 이상 알림
  const anomalies = (openIssues.data ?? []).map(i => ({
    id: i.id,
    type: i.issue_type,
    description: i.title,
    severity: i.issue_type === 'breakdown' ? 'error' : 'warning',
  }))

  // 유효기간 임박 시약
  const expiring_reagents = (reagents.data ?? []).map(r => ({
    id: r.id, name: r.name, expiry_date: r.expiry_date, stock: r.stock_amount ?? 0,
  }))

  // AI 인사이트
  const insights: string[] = []
  if (weekWorkload > 0) insights.push(`이번 주 ${weekWorkload}건의 분석이 진행되었습니다.`)
  if (top_test_items[0]) insights.push(`이번 달 가장 많이 분석한 항목은 "${top_test_items[0].name}"입니다.`)
  if (anomalies.length > 0) insights.push(`장비 이상 ${anomalies.length}건이 확인됩니다. 점검이 필요합니다.`)
  if (expiring_reagents.length > 0) insights.push(`유효기간 임박 시약 ${expiring_reagents.length}건을 확인하세요.`)
  if (insights.length === 0) insights.push('데이터가 쌓이면 인사이트가 표시됩니다.')

  return {
    kpi: {
      today_workload: todayWorkload,
      week_workload: weekWorkload,
      month_workload: monthWorkload,
      avg_processing_speed: 0,
      equipment_utilization: 0,
      retest_rate: 0,
    },
    workload_trend: [],
    project_distribution: [],
    equipment_usage: [],
    hourly_heatmap: [],
    calendar_data: [],
    top_test_items,
    week_trend,
    insights,
    todos: todayTodos.map(t => ({
      id: t.id, title: t.title, priority: t.priority, completed: t.completed,
      schedule_type: t.schedule_type, is_due_today: true,
    })),
    pending_work: [],
    anomalies,
    expiring_reagents,
  }
}

// ── 달력 데이터 ───────────────────────────────────────────────────────────────

export async function sbGetDashboardCalendar(params: { start_date: string; end_date: string }): Promise<CalendarDay[]> {
  const { data, error } = await supabase.from('samples')
    .select('analysis_date, test_item, project_name, sample_id')
    .gte('analysis_date', params.start_date)
    .lte('analysis_date', params.end_date)
  if (error) throw new Error(error.message)

  const dayMap = new Map<string, CalendarDay>()
  for (const s of data ?? []) {
    const d = String(s.analysis_date ?? '').slice(0, 10)
    if (!d) continue
    if (!dayMap.has(d)) dayMap.set(d, { date: d, items: [], total_samples: 0 })
    const day = dayMap.get(d)!
    const existing = day.items.find(i => i.test_item === s.test_item)
    if (existing) {
      existing.sample_count++
    } else {
      day.items.push({ test_item: s.test_item ?? '', sample_count: 1, project: s.project_name ?? '', workload: 1, equipment: '' })
    }
    day.total_samples++
  }
  return [...dayMap.values()].sort((a, b) => a.date.localeCompare(b.date))
}

// ── 통계 ─────────────────────────────────────────────────────────────────────

export async function sbGetStatistics(params?: Record<string, string>): Promise<Statistics> {
  const days = parseInt(params?.days ?? '30')
  const startDate = daysAgo(days)

  const { data: worklogsData } = await supabase.from('work_logs')
    .select('log_date, sample_count, workload')
    .gte('log_date', startDate)
    .order('log_date')

  const { data: samplesData } = await supabase.from('samples')
    .select('analysis_date, test_item, project_name, sample_id, equipment_id')
    .gte('analysis_date', startDate)

  // 일간
  const dayMap = new Map<string, number>()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
    dayMap.set(d, 0)
  }
  for (const r of worklogsData ?? []) {
    const d = String(r.log_date).slice(0, 10)
    dayMap.set(d, (dayMap.get(d) ?? 0) + (r.workload ?? r.sample_count ?? 0))
  }
  const daily = [...dayMap.entries()].map(([name, value]) => ({ name: name.slice(5), value }))

  // 주간
  const weekMap = new Map<string, number>()
  for (const r of worklogsData ?? []) {
    const d = new Date(String(r.log_date).slice(0, 10))
    d.setDate(d.getDate() - d.getDay())
    const w = d.toISOString().slice(0, 10)
    weekMap.set(w, (weekMap.get(w) ?? 0) + (r.workload ?? r.sample_count ?? 0))
  }
  const weekly = [...weekMap.entries()].sort().map(([k, value]) => ({ name: k.slice(5), value }))

  // 월간 (최근 6개월)
  const monthMap = new Map<string, number>()
  for (const r of worklogsData ?? []) {
    const m = String(r.log_date).slice(0, 7)
    monthMap.set(m, (monthMap.get(m) ?? 0) + (r.workload ?? r.sample_count ?? 0))
  }
  const monthly = [...monthMap.entries()].sort().map(([name, value]) => ({ name, value }))

  // 샘플 기반 집계
  const testItemMap = new Map<string, number>()
  const projectMap = new Map<string, number>()
  for (const s of samplesData ?? []) {
    if (s.test_item) testItemMap.set(s.test_item, (testItemMap.get(s.test_item) ?? 0) + 1)
    if (s.project_name) projectMap.set(s.project_name, (projectMap.get(s.project_name) ?? 0) + 1)
  }

  // 장비별 (장비 이름 조회)
  const eqIds = [...new Set((samplesData ?? []).map(s => s.equipment_id).filter(Boolean))]
  const eqMap = new Map<number, string>()
  if (eqIds.length > 0) {
    const { data: eqs } = await supabase.from('equipment').select('id,name').in('id', eqIds)
    for (const eq of eqs ?? []) eqMap.set(eq.id, eq.name)
  }
  const equipMap = new Map<string, number>()
  for (const s of samplesData ?? []) {
    const name = s.equipment_id ? (eqMap.get(s.equipment_id) ?? '기타') : '미배정'
    equipMap.set(name, (equipMap.get(name) ?? 0) + 1)
  }

  const toArr = (m: Map<string, number>) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name, value }))

  return {
    daily,
    weekly,
    monthly,
    by_equipment: toArr(equipMap),
    by_test_item: toArr(testItemMap),
    by_project: toArr(projectMap),
  }
}
