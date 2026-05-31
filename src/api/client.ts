/**
 * API 클라이언트 — Supabase 직접 연결 (백엔드 불필요)
 * 기존 FastAPI 인터페이스를 그대로 유지하여 페이지 코드 변경 최소화
 */
import {
  sbGetWorklogs, sbCreateWorklog, sbUpdateWorklog, sbDeleteWorklog,
  sbGetSamples, sbGetSampleTestItems, sbDeleteAllSamples,
  sbUploadFile,
  sbGetEquipment, sbCreateEquipment, sbUpdateEquipment, sbDeleteEquipment,
  sbGetEquipmentIssues, sbCreateEquipmentIssue, sbUpdateEquipmentIssue, sbDeleteEquipmentIssue,
  sbGetReagents, sbCreateReagent, sbUpdateReagent, sbDeleteReagent,
  sbGetTodos, sbCreateTodo, sbUpdateTodo, sbToggleTodo, sbDeleteTodo,
  sbGetCalendarEvents, sbCreateCalendarEvent, sbUpdateCalendarEvent, sbDeleteCalendarEvent,
  sbGetMethods, sbGetMethodTestItems, sbUploadMethod, sbDeleteMethod,
  sbGetDashboard, sbGetDashboardCalendar, sbGetStatistics,
  sbGetAppSetting, supabase,
} from '../lib/supabaseClient'

export const api = {
  health: async () => {
    const url = import.meta.env.VITE_SUPABASE_URL
    if (!url) throw new Error('Supabase 환경변수가 설정되지 않았습니다.')
    return { status: 'supabase' }
  },

  dashboard: sbGetDashboard,
  dashboardCalendar: sbGetDashboardCalendar,

  upload: sbUploadFile,

  worklogs: sbGetWorklogs,
  createWorklog: sbCreateWorklog,
  updateWorklog: (id: number, d: { project_name?: string; notes?: string; status?: string }) =>
    sbUpdateWorklog(id, d),
  deleteWorklog: sbDeleteWorklog,
  deleteAllSamples: sbDeleteAllSamples,

  samples: sbGetSamples,
  sampleTestItems: sbGetSampleTestItems,
  sampleCompare: async (search: string, testItem?: string) => {
    const params: Record<string, string> = { search }
    if (testItem) params.test_item = testItem
    const samples = await sbGetSamples(params)
    return { mode: 'list' as const, groups: [], samples }
  },

  equipment: {
    list: sbGetEquipment,
    create: sbCreateEquipment,
    update: sbUpdateEquipment,
    delete: sbDeleteEquipment,
    issues: sbGetEquipmentIssues,
    createIssue: sbCreateEquipmentIssue,
    updateIssue: sbUpdateEquipmentIssue,
    deleteIssue: sbDeleteEquipmentIssue,
  },

  reagents: {
    list: sbGetReagents,
    create: sbCreateReagent,
    update: sbUpdateReagent,
    delete: sbDeleteReagent,
  },

  statistics: sbGetStatistics,

  reportUrl: (_type: string, _format: string) => '#',
  reports: {
    preview: async () => { throw new Error('보고서 기능은 클라우드 버전에서 지원되지 않습니다.') },
    generate: async () => { throw new Error('보고서 기능은 클라우드 버전에서 지원되지 않습니다.') },
    types: async () => [] as { id: string; title: string }[],
  },

  calculator: {
    dilution: async (d: Record<string, number | undefined>) => {
      const { C1 = 0, V1 = 0, V2 = 0 } = d as Record<string, number>
      const C2 = C1 && V2 ? (C1 * V1) / V2 : 0
      return { result: C2, formula: `C₁V₁ = C₂V₂ → C₂ = ${C1}×${V1}/${V2} = ${C2.toFixed(4)}`, details: {} }
    },
    ppmConvert: async (d: { value: number; from_unit: string; to_unit: string }) => {
      return { result: d.value, formula: `${d.value} ${d.from_unit} = ${d.value} ${d.to_unit}`, details: {} }
    },
    standardSolution: async (d: Record<string, number>) => {
      const { target_conc = 0, target_vol = 0, stock_conc = 0 } = d
      const vol = stock_conc ? (target_conc * target_vol) / stock_conc : 0
      return { result: vol, formula: `V = ${target_conc}×${target_vol}/${stock_conc} = ${vol.toFixed(4)} mL`, details: {} }
    },
    stats: async (values: number[]) => {
      const n = values.length
      const mean = values.reduce((s, v) => s + v, 0) / n
      const sd = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1))
      return { result: mean, formula: `평균=${mean.toFixed(4)}, SD=${sd.toFixed(4)}`, details: { mean, sd, n } }
    },
    recovery: async (d: { measured: number; expected: number }) => {
      const r = d.expected ? (d.measured / d.expected) * 100 : 0
      return { result: r, formula: `회수율 = ${d.measured}/${d.expected}×100 = ${r.toFixed(2)}%`, details: {} }
    },
  },

  settings: {
    get: async () => ({
      operator_name: await sbGetAppSetting('operator_name') ?? 'Operator',
      watch_folder: '',
      default_report_folder: '',
      default_work_hours: 8,
      dark_mode: false,
      watcher_running: false,
    }) as import('./types').AppSettings,
    update: async (_d: Partial<import('./types').AppSettings>) => ({}),
    startWatcher: async () => ({}),
    stopWatcher: async () => ({}),
  },

  anomalies: async () => {
    const { data } = await supabase
      .from('equipment_issues').select('id,title,issue_type,status,created_at')
      .eq('status', 'open').order('created_at', { ascending: false })
    return (data ?? []).map((i: Record<string, unknown>) => ({
      id: i.id as number,
      anomaly_type: i.issue_type as string,
      description: i.title as string,
      severity: i.issue_type === 'breakdown' ? 'error' : 'warning',
      detected_at: i.created_at as string,
    }))
  },
  resolveAnomaly: async (id: number) => {
    await supabase.from('equipment_issues').update({ status: 'resolved' }).eq('id', id)
    return {}
  },

  todos: {
    list: sbGetTodos,
    create: sbCreateTodo,
    update: sbUpdateTodo,
    toggle: sbToggleTodo,
    delete: sbDeleteTodo,
  },

  calendar: {
    list: sbGetCalendarEvents,
    create: sbCreateCalendarEvent,
    update: sbUpdateCalendarEvent,
    delete: sbDeleteCalendarEvent,
  },

  methods: {
    list: sbGetMethods,
    testItems: sbGetMethodTestItems,
    upload: sbUploadMethod,
    downloadUrl: (id: number) => {
      console.warn('downloadUrl은 Supabase 버전에서 사용 불가:', id)
      return '#'
    },
    inlineUrl: (id: number) => {
      console.warn('inlineUrl은 Supabase 버전에서 사용 불가:', id)
      return '#'
    },
    viewUrl: (id: number) => {
      console.warn('viewUrl은 Supabase 버전에서 사용 불가:', id)
      return '#'
    },
    convert: async (id: number) => {
      console.warn('convert는 Supabase 버전에서 사용 불가:', id)
      return {}
    },
    delete: sbDeleteMethod,
  },
}

// 타입 재export (기존 페이지 코드에서 import하는 타입들 유지)
export type { CalendarDay, DashboardData, WorkLog, Sample, SampleCompareGroup, SampleCompareResult,
  Equipment, EquipmentIssue, Reagent, Statistics, UploadResult, RetestComparison,
  CalcResult, AppSettings, ReportTypeId, ReportFormat, ReportGenerateBody, ReportPreview,
  Anomaly, Todo, ExperimentMethod, ScheduleEvent,
} from './types'
