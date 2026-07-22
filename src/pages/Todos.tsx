import { useEffect, useState } from 'react';
import { api, Todo } from '../api/client';
import { PageHeader, Badge } from '../components/UI';
import { Plus, Trash2, Pencil, X, Check, Calendar, Repeat, Wand2 } from 'lucide-react';
import clsx from 'clsx';

type ScheduleType = 'once' | 'daily' | 'weekly' | 'monthly' | 'semiannual' | 'annual';

type TodoForm = {
  title: string;
  description: string;
  schedule_type: ScheduleType;
  due_date: string;
  start_date: string;
  priority: string;
  recurrence_weekday: number;
  recurrence_day: number;
  recurrence_month: number;
};

const PRIORITY_LABEL: Record<string, string> = { high: '높음', normal: '보통', low: '낮음' };
const SCHEDULE_LABEL: Record<string, string> = {
  once: '일회성', daily: '매일', weekly: '매주', monthly: '매월',
  semiannual: '반년주기', annual: '일년주기',
};
const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];

// ── 한국 공휴일 (2024-2027) ────────────────────────────────────────────────────
// 고정 공휴일 + 설날/추석/부처님오신날 (음력 → 양력 변환 결과)
const KR_HOLIDAYS = new Set<string>([
  // 고정 공휴일 (매년 반복 — YYYY-MM-DD 형식으로 각 연도 추가)
  ...([2024, 2025, 2026, 2027].flatMap(y => [
    `${y}-01-01`, // 신정
    `${y}-03-01`, // 삼일절
    `${y}-05-05`, // 어린이날
    `${y}-06-06`, // 현충일
    `${y}-08-15`, // 광복절
    `${y}-10-03`, // 개천절
    `${y}-10-09`, // 한글날
    `${y}-12-25`, // 성탄절
  ])),
  // 설날 연휴 (음력 1/1 전후)
  '2024-02-09', '2024-02-10', '2024-02-11', '2024-02-12',
  '2025-01-28', '2025-01-29', '2025-01-30',
  '2026-02-16', '2026-02-17', '2026-02-18',
  '2027-02-06', '2027-02-07', '2027-02-08',
  // 추석 연휴 (음력 8/15 전후)
  '2024-09-16', '2024-09-17', '2024-09-18',
  '2025-10-05', '2025-10-06', '2025-10-07',
  '2026-09-24', '2026-09-25', '2026-09-26',
  '2027-10-14', '2027-10-15', '2027-10-16',
  // 부처님오신날
  '2024-05-15',
  '2025-05-05', // 어린이날과 겹침
  '2026-05-24',
  '2027-05-13',
])

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isHoliday(d: Date): boolean {
  const dow = d.getDay() // 0=일, 6=토
  return dow === 0 || dow === 6 || KR_HOLIDAYS.has(toDateStr(d))
}

// 주말/공휴일이면 이전 업무일로 이동
function adjustToWorkday(d: Date): Date {
  const result = new Date(d)
  while (isHoliday(result)) {
    result.setDate(result.getDate() - 1)
  }
  return result
}

// 시작일 + 주기 설정으로 다음 예정일 계산
function calculateNextDue(form: TodoForm): string {
  const base = form.start_date ? new Date(form.start_date + 'T00:00:00') : new Date()

  let target: Date

  if (form.schedule_type === 'once') {
    target = base
  } else if (form.schedule_type === 'daily') {
    target = base
  } else if (form.schedule_type === 'weekly') {
    // recurrence_weekday: 0=월 ~ 6=일, JS getDay: 0=일 1=월 ... 6=토
    const jsDow = form.recurrence_weekday === 6 ? 0 : form.recurrence_weekday + 1
    target = new Date(base)
    const diff = (jsDow - target.getDay() + 7) % 7
    target.setDate(target.getDate() + diff)
  } else if (form.schedule_type === 'monthly') {
    target = new Date(base.getFullYear(), base.getMonth(), form.recurrence_day)
    if (target < base) target.setMonth(target.getMonth() + 1)
  } else if (form.schedule_type === 'semiannual') {
    const m = form.recurrence_month - 1 // 0-indexed
    const d = form.recurrence_day
    // 올해 지정 월, 6개월 후 중 base 이후 가장 가까운 날
    const candidates = [
      new Date(base.getFullYear(), m, d),
      new Date(base.getFullYear(), m + 6, d),
      new Date(base.getFullYear() + 1, m, d),
    ]
    target = candidates.filter(c => c >= base).sort((a, b) => a.getTime() - b.getTime())[0] ?? candidates[0]
  } else { // annual
    const m = form.recurrence_month - 1
    const d = form.recurrence_day
    target = new Date(base.getFullYear(), m, d)
    if (target < base) target.setFullYear(target.getFullYear() + 1)
  }

  return toDateStr(adjustToWorkday(target))
}

const emptyForm = (): TodoForm => ({
  title: '', description: '', schedule_type: 'once',
  due_date: '', start_date: '', priority: 'normal',
  recurrence_weekday: new Date().getDay() === 0 ? 6 : new Date().getDay() - 1,
  recurrence_day: new Date().getDate(),
  recurrence_month: new Date().getMonth() + 1,
});

function todoToForm(t: Todo): TodoForm {
  return {
    title: t.title,
    description: t.description ?? '',
    schedule_type: (t.schedule_type ?? 'once') as ScheduleType,
    due_date: t.due_date ?? '',
    start_date: t.start_date ?? '',
    priority: t.priority ?? 'normal',
    recurrence_weekday: t.recurrence_weekday ?? 0,
    recurrence_day: t.recurrence_day ?? 1,
    recurrence_month: (t as unknown as Record<string, unknown>).recurrence_month as number ?? new Date().getMonth() + 1,
  };
}

function formToPayload(form: TodoForm) {
  const isPeriodic = ['semiannual', 'annual'].includes(form.schedule_type);
  return {
    title: form.title,
    description: form.description || undefined,
    schedule_type: form.schedule_type,
    due_date: form.due_date || undefined,
    start_date: form.start_date || undefined,
    priority: form.priority,
    recurrence_weekday: form.schedule_type === 'weekly' ? form.recurrence_weekday : undefined,
    recurrence_day: (form.schedule_type === 'monthly' || isPeriodic) ? form.recurrence_day : undefined,
    recurrence_month: isPeriodic ? form.recurrence_month : undefined,
  };
}

function scheduleSummary(t: Todo): string {
  const st = t.schedule_type ?? 'once';
  const extra = t as unknown as Record<string, unknown>;
  if (st === 'once') return t.due_date ? `마감 ${t.due_date}` : '마감일 없음';
  if (st === 'daily') return t.due_date ? `매일 · 다음 ${t.due_date}` : '매일';
  if (st === 'weekly') {
    const base = `매주 ${WEEKDAYS[t.recurrence_weekday ?? 0]}요일`
    return t.due_date ? `${base} · 다음 ${t.due_date}` : base
  }
  if (st === 'monthly') {
    const base = `매월 ${t.recurrence_day ?? 1}일`
    return t.due_date ? `${base} · 다음 ${t.due_date}` : base
  }
  if (st === 'semiannual') {
    const base = `반년주기 · ${extra.recurrence_month ?? '?'}월 ${t.recurrence_day ?? 1}일`
    return t.due_date ? `${base} · 다음 ${t.due_date}` : base
  }
  if (st === 'annual') {
    const base = `매년 ${extra.recurrence_month ?? '?'}월 ${t.recurrence_day ?? 1}일`
    return t.due_date ? `${base} · 다음 ${t.due_date}` : base
  }
  return st;
}

function TodoFormFields({
  form, onChange, onSubmit, onCancel, submitLabel,
}: {
  form: TodoForm;
  onChange: (f: TodoForm) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  submitLabel: string;
}) {
  // 시작일 또는 주기 설정 변경 시 예정일 자동 계산
  const autoCalc = () => {
    if (!form.start_date && form.schedule_type === 'once') return
    const calc = calculateNextDue(form)
    onChange({ ...form, due_date: calc })
  }

  const handleRecurrenceChange = (updated: TodoForm) => {
    // 시작일이 있으면 주기 변경 시 자동 재계산
    if (updated.start_date) {
      const calc = calculateNextDue(updated)
      onChange({ ...updated, due_date: calc })
    } else {
      onChange(updated)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <input className="input-field md:col-span-2" placeholder="할 일 제목 *" value={form.title} onChange={(e) => onChange({ ...form, title: e.target.value })} required />
      <textarea className="input-field md:col-span-2 min-h-[72px]" placeholder="상세 설명" value={form.description} onChange={(e) => onChange({ ...form, description: e.target.value })} />

      <div>
        <label className="text-xs text-slate-light block mb-1">유형</label>
        <select className="input-field w-full" value={form.schedule_type} onChange={(e) => handleRecurrenceChange({ ...form, schedule_type: e.target.value as ScheduleType })}>
          <option value="once">일회성 (마감일)</option>
          <option value="daily">매일</option>
          <option value="weekly">매주</option>
          <option value="monthly">매월</option>
          <option value="semiannual">반년주기</option>
          <option value="annual">일년주기</option>
        </select>
      </div>

      <div>
        <label className="text-xs text-slate-light block mb-1">우선순위</label>
        <select className="input-field w-full" value={form.priority} onChange={(e) => onChange({ ...form, priority: e.target.value })}>
          <option value="high">높음</option>
          <option value="normal">보통</option>
          <option value="low">낮음</option>
        </select>
      </div>

      {form.schedule_type === 'weekly' && (
        <div>
          <label className="text-xs text-slate-light block mb-1">요일</label>
          <select className="input-field w-full" value={form.recurrence_weekday} onChange={(e) => handleRecurrenceChange({ ...form, recurrence_weekday: Number(e.target.value) })}>
            {WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}요일</option>)}
          </select>
        </div>
      )}

      {form.schedule_type === 'monthly' && (
        <div>
          <label className="text-xs text-slate-light block mb-1">매월 일자</label>
          <input type="number" min={1} max={31} className="input-field w-full" value={form.recurrence_day}
            onChange={(e) => handleRecurrenceChange({ ...form, recurrence_day: Number(e.target.value) })} />
        </div>
      )}

      {(form.schedule_type === 'semiannual' || form.schedule_type === 'annual') && (
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-slate-light block mb-1">월</label>
            <input type="number" min={1} max={12} className="input-field w-full" value={form.recurrence_month}
              onChange={(e) => handleRecurrenceChange({ ...form, recurrence_month: Number(e.target.value) })} />
          </div>
          <div className="flex-1">
            <label className="text-xs text-slate-light block mb-1">일</label>
            <input type="number" min={1} max={31} className="input-field w-full" value={form.recurrence_day}
              onChange={(e) => handleRecurrenceChange({ ...form, recurrence_day: Number(e.target.value) })} />
          </div>
        </div>
      )}

      {/* 시작일 — once 포함 모든 유형 */}
      <div>
        <label className="text-xs text-slate-light block mb-1">
          {form.schedule_type === 'once' ? '시작일' : '시작일 (선택)'}
        </label>
        <input
          type="date"
          className="input-field w-full"
          value={form.start_date}
          onChange={(e) => {
            const updated = { ...form, start_date: e.target.value }
            if (e.target.value) {
              onChange({ ...updated, due_date: calculateNextDue(updated) })
            } else {
              onChange(updated)
            }
          }}
        />
      </div>

      {/* 예정일 — 자동 계산되지만 직접 수정 가능 */}
      <div>
        <label className="text-xs text-slate-light block mb-1 flex items-center gap-1">
          {form.schedule_type === 'once' ? '마감일' : '다음 예정일'}
          {form.start_date && (
            <button
              type="button"
              title="자동 계산"
              onClick={autoCalc}
              className="text-accent hover:text-accent-light ml-1"
            >
              <Wand2 className="w-3 h-3 inline" />
            </button>
          )}
        </label>
        <input
          type="date"
          className="input-field w-full"
          value={form.due_date}
          onChange={(e) => onChange({ ...form, due_date: e.target.value })}
        />
        {form.due_date && (() => {
          const d = new Date(form.due_date + 'T00:00:00')
          const original = form.start_date ? toDateStr(new Date(
            form.schedule_type === 'once' ? form.start_date + 'T00:00:00'
            : new Date(form.start_date + 'T00:00:00')
          )) : null
          const adjusted = original && original !== form.due_date
          return adjusted ? (
            <p className="text-[11px] text-yellow-400 mt-1">⚠ 주말/공휴일로 인해 날짜가 조정되었습니다.</p>
          ) : null
        })()}
      </div>

      <div className="md:col-span-2 flex gap-2">
        <button type="button" className="btn-primary flex items-center gap-1" onClick={onSubmit}>
          <Check className="w-4 h-4" /> {submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn-secondary flex items-center gap-1" onClick={onCancel}>
            <X className="w-4 h-4" /> 취소
          </button>
        )}
      </div>
    </div>
  );
}

function TodoRow({
  todo, onToggle, onEdit, onDelete,
}: {
  todo: Todo;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const done = todo.completed;
  return (
    <div className={clsx('flex items-start gap-3 p-3 rounded-lg', done ? 'bg-navy-900/50 opacity-70' : 'bg-navy-900')}>
      <input
        type="checkbox"
        checked={done}
        onChange={onToggle}
        className="mt-1 accent-accent w-4 h-4 cursor-pointer flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={clsx('font-medium', done ? 'line-through text-slate-lab' : 'text-white')}>{todo.title}</span>
          <Badge variant={todo.priority === 'high' ? 'error' : todo.priority === 'normal' ? 'info' : 'default'}>
            {PRIORITY_LABEL[todo.priority] ?? todo.priority}
          </Badge>
          {todo.schedule_type !== 'once' && (
            <Badge variant="default"><Repeat className="w-3 h-3 inline mr-0.5" />{SCHEDULE_LABEL[todo.schedule_type ?? 'once']}</Badge>
          )}
          {todo.is_due_today && !done && <Badge variant="warning">오늘</Badge>}
        </div>
        {todo.description && <p className="text-xs text-slate-light mt-1">{todo.description}</p>}
        <p className="text-[11px] text-slate-lab mt-1 flex items-center gap-1">
          <Calendar className="w-3 h-3" /> {scheduleSummary(todo)}
        </p>
      </div>
      <div className="flex gap-1 flex-shrink-0">
        <button type="button" onClick={onEdit} className="text-accent hover:text-accent-light p-1"><Pencil className="w-4 h-4" /></button>
        <button type="button" onClick={onDelete} className="text-red-400 hover:text-red-300 p-1"><Trash2 className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

export default function TodosPage() {
  const [items, setItems] = useState<Todo[]>([]);
  const [filter, setFilter] = useState<'all' | 'today' | 'upcoming' | 'done'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [editForm, setEditForm] = useState(emptyForm());

  const load = () => api.todos.list().then(setItems).catch((e: unknown) => console.error('할일 로드 실패:', e));
  useEffect(() => { load(); }, []);

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

  const filtered = items.filter((t) => {
    if (filter === 'today') return t.is_due_today;
    if (filter === 'upcoming') return !t.completed && t.due_date && t.due_date > today;
    if (filter === 'done') return t.completed || ((t.schedule_type ?? 'once') !== 'once' && t.last_completed_date === today);
    return true;
  });

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    try {
      await api.todos.create(formToPayload(form));
      setForm(emptyForm());
      setShowForm(false);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : '등록 실패');
    }
  };

  const handleSave = async () => {
    if (editingId == null || !editForm.title.trim()) return;
    try {
      await api.todos.update(editingId, formToPayload(editForm));
      setEditingId(null);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : '수정 실패');
    }
  };

  const handleToggle = async (id: number) => {
    try {
      await api.todos.toggle(id);
      load();
    } catch (e) {
      console.error('토글 실패:', e);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('삭제하시겠습니까?')) return;
    try {
      await api.todos.delete(id);
      if (editingId === id) setEditingId(null);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : '삭제 실패');
    }
  };

  const tabs = [
    { id: 'all' as const, label: '전체' },
    { id: 'today' as const, label: '오늘' },
    { id: 'upcoming' as const, label: '예정' },
    { id: 'done' as const, label: '완료' },
  ];

  return (
    <div>
      <PageHeader
        title="할 일 관리"
        subtitle="일회성 마감 · 매일/매주/매월 주기 업무"
        action={
          <button className="btn-primary flex items-center gap-2" onClick={() => { setShowForm(!showForm); setEditingId(null); }}>
            <Plus className="w-4 h-4" /> 할 일 추가
          </button>
        }
      />

      {showForm && (
        <div className="card mb-4">
          <p className="text-xs text-slate-light mb-3">새 할 일</p>
          <TodoFormFields form={form} onChange={setForm} onSubmit={handleCreate} onCancel={() => setShowForm(false)} submitLabel="등록" />
        </div>
      )}

      {editingId != null && (
        <div className="card mb-4 border-accent/30">
          <p className="text-xs text-accent-light mb-3">할 일 수정</p>
          <TodoFormFields form={editForm} onChange={setEditForm} onSubmit={handleSave} onCancel={() => setEditingId(null)} submitLabel="저장" />
        </div>
      )}

      <div className="flex gap-2 mb-4 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={clsx(
              'px-3 py-1.5 rounded text-sm transition-colors',
              filter === tab.id ? 'bg-accent/20 text-accent-light font-medium' : 'text-slate-light hover:bg-navy-700',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="card text-center text-slate-light py-10">할 일 없음</div>
        ) : filtered.map((t) => (
          editingId === t.id ? null : (
            <TodoRow
              key={t.id}
              todo={t}
              onToggle={() => handleToggle(t.id)}
              onEdit={() => { setEditingId(t.id); setEditForm(todoToForm(t)); setShowForm(false); }}
              onDelete={() => handleDelete(t.id)}
            />
          )
        ))}
      </div>
    </div>
  );
}
