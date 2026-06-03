import { useEffect, useState } from 'react';
import { api, Todo } from '../api/client';
import { PageHeader, Badge } from '../components/UI';
import { Plus, Trash2, Pencil, X, Check, Calendar, Repeat } from 'lucide-react';
import clsx from 'clsx';

type ScheduleType = 'once' | 'daily' | 'weekly' | 'monthly';

type TodoForm = {
  title: string;
  description: string;
  schedule_type: ScheduleType;
  due_date: string;
  start_date: string;
  priority: string;
  recurrence_weekday: number;
  recurrence_day: number;
};

const PRIORITY_LABEL: Record<string, string> = { high: '높음', normal: '보통', low: '낮음' };
const SCHEDULE_LABEL: Record<string, string> = {
  once: '일회성', daily: '매일', weekly: '매주', monthly: '매월',
};
const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];

const emptyForm = (): TodoForm => ({
  title: '', description: '', schedule_type: 'once',
  due_date: '', start_date: '', priority: 'normal',
  recurrence_weekday: new Date().getDay() === 0 ? 6 : new Date().getDay() - 1,
  recurrence_day: new Date().getDate(),
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
  };
}

function formToPayload(form: TodoForm) {
  return {
    title: form.title,
    description: form.description || undefined,
    schedule_type: form.schedule_type,
    due_date: form.schedule_type === 'once' && form.due_date ? form.due_date : undefined,
    start_date: form.start_date || undefined,
    priority: form.priority,
    recurrence_weekday: form.schedule_type === 'weekly' ? form.recurrence_weekday : undefined,
    recurrence_day: form.schedule_type === 'monthly' ? form.recurrence_day : undefined,
  };
}

function scheduleSummary(t: Todo): string {
  const st = t.schedule_type ?? 'once';
  if (st === 'once') return t.due_date ? `마감 ${t.due_date}` : '마감일 없음';
  if (st === 'daily') return '매일';
  if (st === 'weekly') return `매주 ${WEEKDAYS[t.recurrence_weekday ?? 0]}요일`;
  if (st === 'monthly') return `매월 ${t.recurrence_day ?? 1}일`;
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
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <input className="input-field md:col-span-2" placeholder="할 일 제목 *" value={form.title} onChange={(e) => onChange({ ...form, title: e.target.value })} required />
      <textarea className="input-field md:col-span-2 min-h-[72px]" placeholder="상세 설명" value={form.description} onChange={(e) => onChange({ ...form, description: e.target.value })} />

      <div>
        <label className="text-xs text-slate-light block mb-1">유형</label>
        <select className="input-field w-full" value={form.schedule_type} onChange={(e) => onChange({ ...form, schedule_type: e.target.value as ScheduleType })}>
          <option value="once">일회성 (마감일)</option>
          <option value="daily">매일</option>
          <option value="weekly">매주</option>
          <option value="monthly">매월</option>
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

      {form.schedule_type === 'once' && (
        <div>
          <label className="text-xs text-slate-light block mb-1">마감일</label>
          <input type="date" className="input-field w-full" value={form.due_date} onChange={(e) => onChange({ ...form, due_date: e.target.value })} />
        </div>
      )}

      {form.schedule_type === 'weekly' && (
        <div>
          <label className="text-xs text-slate-light block mb-1">요일</label>
          <select className="input-field w-full" value={form.recurrence_weekday} onChange={(e) => onChange({ ...form, recurrence_weekday: Number(e.target.value) })}>
            {WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}요일</option>)}
          </select>
        </div>
      )}

      {form.schedule_type === 'monthly' && (
        <div>
          <label className="text-xs text-slate-light block mb-1">매월 일자</label>
          <input type="number" min={1} max={31} className="input-field w-full" value={form.recurrence_day} onChange={(e) => onChange({ ...form, recurrence_day: Number(e.target.value) })} />
        </div>
      )}

      {form.schedule_type !== 'once' && (
        <div>
          <label className="text-xs text-slate-light block mb-1">시작일 (선택)</label>
          <input type="date" className="input-field w-full" value={form.start_date} onChange={(e) => onChange({ ...form, start_date: e.target.value })} />
        </div>
      )}

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
    if (filter === 'upcoming') return (t.schedule_type ?? 'once') === 'once' && !t.completed && t.due_date && t.due_date > today;
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
