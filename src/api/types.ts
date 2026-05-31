export interface CalendarDay {
  date: string;
  items: { test_item: string; sample_count: number; project: string; workload: number; equipment: string }[];
  total_samples: number;
}

export interface DashboardData {
  kpi: {
    today_workload: number;
    week_workload: number;
    month_workload: number;
    avg_processing_speed: number;
    equipment_utilization: number;
    retest_rate: number;
  };
  workload_trend: { date: string; workload: number }[];
  project_distribution: { name: string; value: number }[];
  equipment_usage: { name: string; workload: number }[];
  hourly_heatmap: { hour: string; count: number }[];
  calendar_data: CalendarDay[];
  top_test_items: { name: string; value: number }[];
  week_trend: { date: string; samples: number; label: string }[];
  insights: string[];
  todos: { id: number; title: string; due_date?: string; priority: string; completed: boolean; schedule_type?: string; is_due_today?: boolean }[];
  pending_work: { id: number; project: string; test_item: string; date: string }[];
  anomalies: { id: number; type: string; description: string; severity: string }[];
  expiring_reagents: { id: number; name: string; expiry_date?: string; stock: number }[];
}

export interface WorkLog {
  id: number;
  log_date: string;
  project_name?: string;
  test_item?: string;
  sample_count: number;
  workload: number;
  equipment_name?: string;
  duration_hours: number;
  operator?: string;
  status: string;
  notes?: string;
  auto_generated: boolean;
}

export interface Sample {
  id: number;
  sample_id: string;
  sample_name?: string;
  project_name?: string;
  test_item?: string;
  result_value?: string;
  unit?: string;
  analysis_date?: string;
  receipt_date?: string;
  is_abnormal: boolean;
  is_duplicate: boolean;
  is_retest?: boolean;
  base_sample_id?: string;
  previous_result_value?: string;
  result_change?: string;
  retest_note?: string;
  receipt_number?: string;
}

export interface SampleCompareGroup {
  sample_name: string;
  entries: Sample[];
  companies: string[];
  matrix: {
    test_item: string;
    values: Record<string, {
      result?: string;
      unit?: string;
      receipt_number?: string;
      receipt_date?: string;
      analysis_date?: string;
      id: number;
    }>;
  }[];
}

export interface SampleCompareResult {
  mode: 'list' | 'compare';
  groups: SampleCompareGroup[];
  samples: Sample[];
}

export interface Equipment {
  id: number;
  name: string;
  model?: string;
  equipment_type?: string;
  total_usage_hours: number;
  analysis_items?: string;
  notes?: string;
  is_abnormal: boolean;
  open_issue_count?: number;
  last_maintenance?: string;
  next_maintenance?: string;
}

export interface EquipmentIssue {
  id: number;
  equipment_id: number;
  title: string;
  description?: string;
  issue_type: string;
  occurred_at: string;
  repaired_at?: string;
  status: string;
  notes?: string;
}

export interface Reagent {
  id: number;
  name: string;
  management_number?: string;
  reagent_type: string;
  concentration?: string;
  stock_amount: number;
  stock_unit: string;
  min_stock: number;
  expiry_date?: string;
  open_date?: string;
  manufacture_date?: string;
  manufacturer?: string;
  lot_number?: string;
  notes?: string;
}

export interface Statistics {
  daily: { name: string; value: number }[];
  weekly: { name: string; value: number }[];
  monthly: { name: string; value: number }[];
  by_equipment: { name: string; value: number }[];
  by_test_item: { name: string; value: number }[];
  by_project: { name: string; value: number }[];
}

export interface UploadResult {
  filename: string;
  sample_count: number;
  work_log_id?: number;
  anomalies: { type: string; description: string; severity: string }[];
  retest_comparisons: RetestComparison[];
  retest_count: number;
  processing_time_ms: number;
}

export interface RetestComparison {
  sample_id: string;
  sample_name?: string;
  test_item: string;
  base_sample_id: string;
  previous_result?: string;
  current_result?: string;
  change_text: string;
  summary: string;
  delta_pct?: number;
  previous_date?: string;
  source?: string;
}

export interface CalcResult {
  result?: number;
  formula: string;
  details: Record<string, unknown>;
}

export interface AppSettings {
  operator_name: string;
  watch_folder: string;
  default_report_folder: string;
  default_work_hours: number;
  dark_mode: boolean;
  watcher_running: boolean;
}

export type ReportTypeId = 'daily' | 'weekly' | 'monthly' | 'equipment' | 'productivity' | 'anomaly';
export type ReportFormat = 'pdf' | 'excel' | 'both';

export interface ReportGenerateBody {
  report_type: ReportTypeId;
  format: ReportFormat;
  ref_date?: string;
  start_date?: string;
  end_date?: string;
}

export interface ReportPreview {
  report_type: string;
  title: string;
  start_date: string;
  end_date: string;
  operator: string;
  suggested_filename_pdf: string;
  suggested_filename_excel: string;
  kpi: Record<string, number | string>;
  insights: string[];
  log_count: number;
  sample_count: number;
  test_item_stats: { name: string; count: number; ratio: number; avg_time: number }[];
  project_stats: { name: string; workload: number; ratio: number; avg_time: number }[];
  equipment_rows: { name: string; hours: number; utilization: number; issue_count: number; status: string }[];
  anomaly_count: number;
}

export interface Anomaly {
  id: number;
  anomaly_type: string;
  description?: string;
  severity: string;
  detected_at?: string;
}

export interface Todo {
  id: number;
  title: string;
  description?: string;
  due_date?: string;
  start_date?: string;
  priority: string;
  schedule_type?: string;
  recurrence_weekday?: number;
  recurrence_day?: number;
  last_completed_date?: string;
  completed: boolean;
  is_due_today?: boolean;
}

export interface ExperimentMethod {
  id: number;
  title: string;
  test_item?: string;
  description?: string;
  file_name?: string;
  file_type?: string;
  file_url?: string;
  file_size?: number;
  created_at?: string;
  has_local_file: boolean;
  has_view: boolean;
  view_type?: string;
}

export interface ScheduleEvent {
  id: number;
  title: string;
  event_date: string;
  description?: string;
  category?: string;
  color: string;
}
