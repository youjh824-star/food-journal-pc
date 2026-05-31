import { useEffect, useState } from 'react';
import { api, Equipment, EquipmentIssue } from '../api/client';
import { PageHeader, Badge, FormField } from '../components/UI';
import { Plus, Trash2, AlertTriangle, Wrench, ChevronDown, ChevronUp, CheckCircle, Pencil, X, Check } from 'lucide-react';
import clsx from 'clsx';

const ISSUE_TYPES: Record<string, string> = {
  malfunction: '이상/고장',
  maintenance: '정기점검',
  calibration: '교정',
  other: '기타',
};

type EquipmentForm = {
  name: string;
  model: string;
  equipment_type: string;
  analysis_items: string;
  notes: string;
  last_maintenance: string;
  next_maintenance: string;
};

type IssueForm = {
  title: string;
  description: string;
  issue_type: string;
  occurred_at: string;
  notes: string;
};

const emptyEqForm = (): EquipmentForm => ({
  name: '', model: '', equipment_type: '', analysis_items: '', notes: '', last_maintenance: '', next_maintenance: '',
});

function eqToForm(eq: Equipment): EquipmentForm {
  return {
    name: eq.name ?? '',
    model: eq.model ?? '',
    equipment_type: eq.equipment_type ?? '',
    analysis_items: eq.analysis_items ?? '',
    notes: eq.notes ?? '',
    last_maintenance: eq.last_maintenance ?? '',
    next_maintenance: eq.next_maintenance ?? '',
  };
}

function fmtDt(iso?: string) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function toLocalInput(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function issueToForm(issue?: EquipmentIssue): IssueForm {
  return {
    title: issue?.title ?? '',
    description: issue?.description ?? '',
    issue_type: issue?.issue_type ?? 'malfunction',
    occurred_at: toLocalInput(issue?.occurred_at ?? new Date().toISOString()),
    notes: issue?.notes ?? '',
  };
}

export default function EquipmentPage() {
  const [items, setItems] = useState<Equipment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingEqId, setEditingEqId] = useState<number | null>(null);
  const [editingIssueId, setEditingIssueId] = useState<number | null>(null);
  const [issues, setIssues] = useState<Record<number, EquipmentIssue[]>>({});
  const [form, setForm] = useState(emptyEqForm());
  const [editForm, setEditForm] = useState(emptyEqForm());
  const [issueForm, setIssueForm] = useState(issueToForm());
  const [editIssueForm, setEditIssueForm] = useState(issueToForm());

  const load = () => api.equipment.list().then(setItems);
  useEffect(() => { load(); }, []);

  const loadIssues = async (eqId: number) => {
    const list = await api.equipment.issues(eqId);
    setIssues((prev) => ({ ...prev, [eqId]: list }));
  };

  const toggleExpand = async (eqId: number) => {
    if (expandedId === eqId) {
      setExpandedId(null);
      setEditingEqId(null);
      setEditingIssueId(null);
      return;
    }
    setExpandedId(eqId);
    setEditingEqId(null);
    setEditingIssueId(null);
    if (!issues[eqId]) await loadIssues(eqId);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    await api.equipment.create({
      name: form.name,
      model: form.model || undefined,
      equipment_type: form.equipment_type || undefined,
      analysis_items: form.analysis_items || undefined,
      notes: form.notes || undefined,
      last_maintenance: form.last_maintenance || undefined,
      next_maintenance: form.next_maintenance || undefined,
    });
    setForm(emptyEqForm());
    setShowForm(false);
    load();
  };

  const startEditEq = (eq: Equipment) => {
    setEditingEqId(eq.id);
    setEditForm(eqToForm(eq));
    setExpandedId(eq.id);
  };

  const handleSaveEq = async (eqId: number) => {
    await api.equipment.update(eqId, {
      name: editForm.name,
      model: editForm.model || undefined,
      equipment_type: editForm.equipment_type || undefined,
      analysis_items: editForm.analysis_items || undefined,
      notes: editForm.notes || undefined,
      last_maintenance: editForm.last_maintenance || undefined,
      next_maintenance: editForm.next_maintenance || undefined,
    });
    setEditingEqId(null);
    load();
  };

  const handleDelete = async (id: number) => {
    if (confirm('삭제하시겠습니까?')) {
      await api.equipment.delete(id);
      if (expandedId === id) setExpandedId(null);
      load();
    }
  };

  const handleAddIssue = async (eqId: number) => {
    if (!issueForm.title.trim()) return;
    await api.equipment.createIssue(eqId, {
      title: issueForm.title,
      description: issueForm.description || undefined,
      issue_type: issueForm.issue_type,
      occurred_at: new Date(issueForm.occurred_at).toISOString(),
      notes: issueForm.notes || undefined,
    });
    setIssueForm(issueToForm());
    await loadIssues(eqId);
    load();
  };

  const startEditIssue = (issue: EquipmentIssue) => {
    setEditingIssueId(issue.id);
    setEditIssueForm(issueToForm(issue));
  };

  const handleSaveIssue = async (eqId: number, issueId: number) => {
    await api.equipment.updateIssue(issueId, {
      title: editIssueForm.title,
      description: editIssueForm.description || undefined,
      issue_type: editIssueForm.issue_type,
      occurred_at: new Date(editIssueForm.occurred_at).toISOString(),
      notes: editIssueForm.notes || undefined,
    });
    setEditingIssueId(null);
    await loadIssues(eqId);
  };

  const handleResolve = async (eqId: number, issue: EquipmentIssue) => {
    await api.equipment.updateIssue(issue.id, {
      status: 'resolved',
      repaired_at: new Date().toISOString(),
    });
    await loadIssues(eqId);
    load();
  };

  const handleDeleteIssue = async (eqId: number, issueId: number) => {
    if (!confirm('이력을 삭제하시겠습니까?')) return;
    await api.equipment.deleteIssue(issueId);
    if (editingIssueId === issueId) setEditingIssueId(null);
    await loadIssues(eqId);
    load();
  };

  const renderEqForm = (
    value: EquipmentForm,
    onChange: (f: EquipmentForm) => void,
    onSubmit: () => void,
    onCancel: () => void,
    submitLabel: string,
  ) => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      <FormField label="장비명 *" className="md:col-span-1">
        <input className="input-field" placeholder="예: ICP-MS" value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} required />
      </FormField>
      <FormField label="모델명">
        <input className="input-field" placeholder="예: Agilent 7900" value={value.model} onChange={(e) => onChange({ ...value, model: e.target.value })} />
      </FormField>
      <FormField label="유형">
        <input className="input-field" placeholder="예: ICP-MS, HPLC" value={value.equipment_type} onChange={(e) => onChange({ ...value, equipment_type: e.target.value })} />
      </FormField>
      <FormField label="분석 항목" className="md:col-span-2">
        <input className="input-field" placeholder="예: Heavy metals, Trace elements" value={value.analysis_items} onChange={(e) => onChange({ ...value, analysis_items: e.target.value })} />
      </FormField>
      <FormField label="마지막 정비일" hint="가장 최근에 점검·정비한 날짜">
        <input className="input-field" type="date" value={value.last_maintenance} onChange={(e) => onChange({ ...value, last_maintenance: e.target.value })} />
      </FormField>
      <FormField label="다음 정비 예정일" hint="다음 점검·교정·정비 예정일">
        <input className="input-field" type="date" value={value.next_maintenance} onChange={(e) => onChange({ ...value, next_maintenance: e.target.value })} />
      </FormField>
      <FormField label="메모" className="md:col-span-3">
        <input className="input-field" placeholder="비고, 특이사항" value={value.notes} onChange={(e) => onChange({ ...value, notes: e.target.value })} />
      </FormField>
      <div className="md:col-span-3 flex gap-2">
        <button type="button" className="btn-primary flex items-center gap-1" onClick={onSubmit}>
          <Check className="w-4 h-4" /> {submitLabel}
        </button>
        <button type="button" className="btn-secondary flex items-center gap-1" onClick={onCancel}>
          <X className="w-4 h-4" /> 취소
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="장비 관리"
        subtitle="장비 상태 · 이상/수리 이력 · 유지보수"
        action={
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4" /> 장비 추가
          </button>
        }
      />

      {showForm && (
        <div className="card mb-4">
          <p className="text-xs text-slate-light mb-3">새 장비 등록</p>
          <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }}>
            {renderEqForm(form, setForm, handleCreate, () => setShowForm(false), '등록')}
          </form>
        </div>
      )}

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="card text-center text-slate-light py-8">등록된 장비 없음</div>
        ) : items.map((eq) => {
          const open = expandedId === eq.id;
          const eqIssues = issues[eq.id] ?? [];
          const hasOpen = (eq.open_issue_count ?? 0) > 0 || eq.is_abnormal;
          const isEditing = editingEqId === eq.id;

          return (
            <div key={eq.id} className={clsx('card', hasOpen && !isEditing && 'border-red-500/40')}>
              {isEditing ? (
                <div>
                  <p className="text-xs text-accent-light mb-3">장비 정보 수정</p>
                  {renderEqForm(editForm, setEditForm, () => handleSaveEq(eq.id), () => setEditingEqId(null), '저장')}
                </div>
              ) : (
                <div className="flex items-start gap-4">
                  <button type="button" onClick={() => toggleExpand(eq.id)} className="mt-1 text-slate-light hover:text-white">
                    {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-semibold text-white">{eq.name}</h3>
                      {eq.model && <span className="text-xs text-slate-light">{eq.model}</span>}
                      <Badge variant={hasOpen ? 'error' : 'success'}>
                        {hasOpen ? (
                          <><AlertTriangle className="w-3 h-3 inline mr-1" />이상 {(eq.open_issue_count ?? 0) > 0 ? `(${eq.open_issue_count})` : ''}</>
                        ) : (
                          <><CheckCircle className="w-3 h-3 inline mr-1" />정상</>
                        )}
                      </Badge>
                      {eq.equipment_type && <Badge variant="info">{eq.equipment_type}</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-slate-light">
                      <span>누적 {Number(eq.total_usage_hours).toFixed(1)}h</span>
                      {eq.analysis_items && <span>{eq.analysis_items}</span>}
                      {eq.last_maintenance && <span>마지막 정비: {eq.last_maintenance}</span>}
                      {eq.next_maintenance && <span>다음 정비: {eq.next_maintenance}</span>}
                    </div>
                    {eq.notes && <p className="text-xs text-slate-lab mt-1">{eq.notes}</p>}
                  </div>

                  <div className="flex gap-1">
                    <button onClick={() => startEditEq(eq)} className="text-accent hover:text-accent-light p-1" title="수정">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(eq.id)} className="text-red-400 hover:text-red-300 p-1" title="삭제">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {open && !isEditing && (
                <div className="mt-4 pt-4 border-t border-navy-600">
                  <p className="text-xs text-purple-400 font-medium mb-3 flex items-center gap-1">
                    <Wrench className="w-3 h-3" /> 이상 · 수리 이력
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <FormField label="이상 제목" className="md:col-span-2">
                      <input className="input-field" placeholder="예: 플라즈마 불안정" value={issueForm.title} onChange={(e) => setIssueForm({ ...issueForm, title: e.target.value })} />
                    </FormField>
                    <FormField label="유형">
                      <select className="input-field w-full" value={issueForm.issue_type} onChange={(e) => setIssueForm({ ...issueForm, issue_type: e.target.value })}>
                        {Object.entries(ISSUE_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </FormField>
                    <FormField label="발생 일시" hint="이상이 발생한 날짜·시간">
                      <input type="datetime-local" className="input-field w-full" value={issueForm.occurred_at} onChange={(e) => setIssueForm({ ...issueForm, occurred_at: e.target.value })} />
                    </FormField>
                    <FormField label="상세 설명" className="md:col-span-2">
                      <input className="input-field" placeholder="증상, 오류 메시지 등" value={issueForm.description} onChange={(e) => setIssueForm({ ...issueForm, description: e.target.value })} />
                    </FormField>
                    <FormField label="메모" className="md:col-span-2">
                      <input className="input-field" placeholder="조치 내용, 담당자 등" value={issueForm.notes} onChange={(e) => setIssueForm({ ...issueForm, notes: e.target.value })} />
                    </FormField>
                    <button type="button" className="btn-primary md:col-span-4 self-end" onClick={() => handleAddIssue(eq.id)}>이력 추가</button>
                  </div>

                  {eqIssues.length === 0 ? (
                    <p className="text-sm text-slate-light">등록된 이상/수리 이력 없음</p>
                  ) : (
                    <div className="space-y-2">
                      {eqIssues.map((issue) => (
                        <div key={issue.id} className={clsx('rounded-lg p-3 text-sm', issue.status === 'open' ? 'bg-red-900/20 border border-red-500/20' : 'bg-navy-900')}>
                          {editingIssueId === issue.id ? (
                            <div className="grid grid-cols-2 gap-3">
                              <FormField label="이상 제목" className="col-span-2">
                                <input className="input-field" value={editIssueForm.title} onChange={(e) => setEditIssueForm({ ...editIssueForm, title: e.target.value })} />
                              </FormField>
                              <FormField label="유형">
                                <select className="input-field w-full" value={editIssueForm.issue_type} onChange={(e) => setEditIssueForm({ ...editIssueForm, issue_type: e.target.value })}>
                                  {Object.entries(ISSUE_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                </select>
                              </FormField>
                              <FormField label="발생 일시">
                                <input type="datetime-local" className="input-field w-full" value={editIssueForm.occurred_at} onChange={(e) => setEditIssueForm({ ...editIssueForm, occurred_at: e.target.value })} />
                              </FormField>
                              <FormField label="상세 설명" className="col-span-2">
                                <input className="input-field" value={editIssueForm.description} onChange={(e) => setEditIssueForm({ ...editIssueForm, description: e.target.value })} />
                              </FormField>
                              <FormField label="메모" className="col-span-2">
                                <input className="input-field" value={editIssueForm.notes} onChange={(e) => setEditIssueForm({ ...editIssueForm, notes: e.target.value })} />
                              </FormField>
                              <div className="col-span-2 flex gap-2">
                                <button type="button" className="btn-primary text-xs" onClick={() => handleSaveIssue(eq.id, issue.id)}>저장</button>
                                <button type="button" className="btn-secondary text-xs" onClick={() => setEditingIssueId(null)}>취소</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant={issue.status === 'open' ? 'error' : 'success'}>{issue.status === 'open' ? '미수리' : '수리완료'}</Badge>
                                  <span className="font-medium text-white">{issue.title}</span>
                                  <span className="text-xs text-slate-lab">{ISSUE_TYPES[issue.issue_type] ?? issue.issue_type}</span>
                                </div>
                                {issue.description && <p className="text-slate-light text-xs mb-1">{issue.description}</p>}
                                {issue.notes && <p className="text-slate-lab text-[11px] mb-1">{issue.notes}</p>}
                                <p className="text-[11px] text-slate-lab font-mono">
                                  발생: {fmtDt(issue.occurred_at)}
                                  {issue.repaired_at && ` · 수리: ${fmtDt(issue.repaired_at)}`}
                                </p>
                              </div>
                              <div className="flex gap-1 flex-shrink-0">
                                <button type="button" className="text-accent hover:text-accent-light p-1" onClick={() => startEditIssue(issue)} title="수정">
                                  <Pencil className="w-3 h-3" />
                                </button>
                                {issue.status === 'open' && (
                                  <button type="button" className="text-xs px-2 py-1 rounded bg-green-900/40 text-green-400 hover:bg-green-900/60" onClick={() => handleResolve(eq.id, issue)}>수리완료</button>
                                )}
                                <button type="button" className="text-red-400 hover:text-red-300 p-1" onClick={() => handleDeleteIssue(eq.id, issue.id)}>
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
