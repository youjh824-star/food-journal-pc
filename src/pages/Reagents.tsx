import { useEffect, useState } from 'react';
import { api, Reagent } from '../api/client';
import { PageHeader, DataTable, Badge, FormField } from '../components/UI';
import { Plus, Trash2, AlertTriangle, Pencil, X, Check } from 'lucide-react';

type ReagentForm = {
  name: string;
  management_number: string;
  concentration: string;
  stock_amount: number;
  stock_unit: string;
  min_stock: number;
  expiry_date: string;
  open_date: string;
  manufacture_date: string;
  manufacturer: string;
  lot_number: string;
  notes: string;
};

const emptyForm = (): ReagentForm => ({
  name: '', management_number: '', concentration: '', stock_amount: 0,
  stock_unit: 'mL', min_stock: 0, expiry_date: '', open_date: '', manufacture_date: '',
  manufacturer: '', lot_number: '', notes: '',
});

function reagentToForm(r: Reagent): ReagentForm {
  return {
    name: r.name ?? '',
    management_number: r.management_number ?? '',
    concentration: r.concentration ?? '',
    stock_amount: r.stock_amount ?? 0,
    stock_unit: r.stock_unit ?? 'mL',
    min_stock: r.min_stock ?? 0,
    expiry_date: r.expiry_date ?? '',
    open_date: r.open_date ?? '',
    manufacture_date: r.manufacture_date ?? '',
    manufacturer: r.manufacturer ?? '',
    lot_number: r.lot_number ?? '',
    notes: r.notes ?? '',
  };
}

function formToPayload(form: ReagentForm) {
  return {
    name: form.name,
    management_number: form.management_number || undefined,
    concentration: form.concentration || undefined,
    stock_amount: form.stock_amount,
    stock_unit: form.stock_unit,
    min_stock: form.min_stock,
    expiry_date: form.expiry_date || undefined,
    open_date: form.open_date || undefined,
    manufacture_date: form.manufacture_date || undefined,
    manufacturer: form.manufacturer || undefined,
    lot_number: form.lot_number || undefined,
    notes: form.notes || undefined,
  };
}

function ReagentFormFields({
  form,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  form: ReagentForm;
  onChange: (f: ReagentForm) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  submitLabel: string;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      <FormField label="시약명 *">
        <input className="input-field" placeholder="예: Nitric Acid 65%" value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} required />
      </FormField>
      <FormField label="관리번호" hint="사내 시약 관리 번호">
        <input className="input-field" placeholder="예: R-2024-001" value={form.management_number} onChange={(e) => onChange({ ...form, management_number: e.target.value })} />
      </FormField>
      <FormField label="농도">
        <input className="input-field" placeholder="예: 65%, 10 mg/L" value={form.concentration} onChange={(e) => onChange({ ...form, concentration: e.target.value })} />
      </FormField>
      <FormField label="재고량">
        <input className="input-field" type="number" value={form.stock_amount} onChange={(e) => onChange({ ...form, stock_amount: Number(e.target.value) })} />
      </FormField>
      <FormField label="단위">
        <input className="input-field" placeholder="mL, g 등" value={form.stock_unit} onChange={(e) => onChange({ ...form, stock_unit: e.target.value })} />
      </FormField>
      <FormField label="최소 재고" hint="이하로 떨어지면 알림">
        <input className="input-field" type="number" value={form.min_stock} onChange={(e) => onChange({ ...form, min_stock: Number(e.target.value) })} />
      </FormField>
      <FormField label="유효기간" hint="시약 사용 기한">
        <input className="input-field" type="date" value={form.expiry_date} onChange={(e) => onChange({ ...form, expiry_date: e.target.value })} />
      </FormField>
      <FormField label="개봉일" hint="병·용기를 처음 연 날짜">
        <input className="input-field" type="date" value={form.open_date} onChange={(e) => onChange({ ...form, open_date: e.target.value })} />
      </FormField>
      <FormField label="제조일" hint="제조사 표기 제조일">
        <input className="input-field" type="date" value={form.manufacture_date} onChange={(e) => onChange({ ...form, manufacture_date: e.target.value })} />
      </FormField>
      <FormField label="제조사">
        <input className="input-field" value={form.manufacturer} onChange={(e) => onChange({ ...form, manufacturer: e.target.value })} />
      </FormField>
      <FormField label="Lot 번호">
        <input className="input-field" value={form.lot_number} onChange={(e) => onChange({ ...form, lot_number: e.target.value })} />
      </FormField>
      <FormField label="메모" className="md:col-span-3">
        <input className="input-field" placeholder="보관 조건, 위치 등" value={form.notes} onChange={(e) => onChange({ ...form, notes: e.target.value })} />
      </FormField>
      <div className="md:col-span-3 flex gap-2">
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

export default function ReagentsPage() {
  const [items, setItems] = useState<Reagent[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [editForm, setEditForm] = useState(emptyForm());

  const load = () => api.reagents.list().then(setItems);
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    await api.reagents.create(formToPayload(form));
    setForm(emptyForm());
    setShowForm(false);
    load();
  };

  const startEdit = (r: Reagent) => {
    setEditingId(r.id);
    setEditForm(reagentToForm(r));
    setShowForm(false);
  };

  const handleSave = async () => {
    if (editingId == null || !editForm.name.trim()) return;
    await api.reagents.update(editingId, formToPayload(editForm));
    setEditingId(null);
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('삭제하시겠습니까?')) return;
    await api.reagents.delete(id);
    if (editingId === id) setEditingId(null);
    load();
  };

  const isLowStock = (r: Reagent) => r.stock_amount <= r.min_stock;
  const isExpiring = (r: Reagent) => {
    if (!r.expiry_date) return false;
    const days = (new Date(r.expiry_date).getTime() - Date.now()) / 86400000;
    return days <= 30;
  };

  return (
    <div>
      <PageHeader
        title="시약 관리"
        subtitle="시약·표준품 재고 및 유효기간 관리"
        action={
          <button className="btn-primary flex items-center gap-2" onClick={() => { setShowForm(!showForm); setEditingId(null); }}>
            <Plus className="w-4 h-4" /> 시약 추가
          </button>
        }
      />

      {showForm && (
        <div className="card mb-4">
          <p className="text-xs text-slate-light mb-3">새 시약 등록</p>
          <ReagentFormFields form={form} onChange={setForm} onSubmit={handleCreate} onCancel={() => setShowForm(false)} submitLabel="등록" />
        </div>
      )}

      {editingId != null && (
        <div className="card mb-4 border-accent/30">
          <p className="text-xs text-accent-light mb-3">시약 정보 수정</p>
          <ReagentFormFields form={editForm} onChange={setEditForm} onSubmit={handleSave} onCancel={() => setEditingId(null)} submitLabel="저장" />
        </div>
      )}

      <DataTable
        columns={[
          { key: 'management_number', label: '관리번호', render: (r) => {
            const v = (r as unknown as Reagent).management_number;
            return v ? <span className="font-mono text-xs">{v}</span> : <span className="text-slate-lab">-</span>;
          }},
          { key: 'name', label: '시약명' },
          { key: 'concentration', label: '농도' },
          { key: 'stock', label: '재고', render: (r) => {
            const reagent = r as unknown as Reagent;
            return (
              <span className={isLowStock(reagent) ? 'text-red-400 font-mono' : 'font-mono'}>
                {reagent.stock_amount} {reagent.stock_unit}
                {isLowStock(reagent) && <AlertTriangle className="w-3 h-3 inline ml-1" />}
              </span>
            );
          }},
          { key: 'expiry_date', label: '유효기간', render: (r) => {
            const reagent = r as unknown as Reagent;
            return reagent.expiry_date ? (
              <Badge variant={isExpiring(reagent) ? 'warning' : 'default'}>{reagent.expiry_date}</Badge>
            ) : '-';
          }},
          { key: 'actions', label: '', render: (r) => (
            <div className="flex gap-1">
              <button onClick={() => startEdit(r as unknown as Reagent)} className="text-accent hover:text-accent-light" title="수정">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => handleDelete(r.id as number)} className="text-red-400 hover:text-red-300" title="삭제">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )},
        ]}
        data={items as unknown as Record<string, unknown>[]}
      />
    </div>
  );
}
