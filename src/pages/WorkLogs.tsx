import { useEffect, useState } from 'react';
import { api, WorkLog } from '../api/client';
import { PageHeader, DataTable, Badge } from '../components/UI';
import { Search, Trash2, X, Pencil } from 'lucide-react';

// ── 삭제 확인 모달 ─────────────────────────────────────────────────────────
function DeleteModal({ log, onClose, onDelete }: {
  log: WorkLog;
  onClose: () => void;
  onDelete: (id: number, withSamples: boolean) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">업무일지 삭제</h3>
            <p className="text-sm text-slate-light mt-0.5">
              <span className="text-white font-medium">{log.project_name}</span>
              {log.log_date && <span className="text-slate-lab text-xs ml-2">({log.log_date})</span>}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-lab hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-lab bg-navy-900/60 rounded-lg px-3 py-2">
          삭제 방법을 선택하세요. 삭제된 데이터는 복구할 수 없습니다.
        </p>

        <div className="space-y-2">
          <button
            onClick={() => onDelete(log.id, false)}
            className="w-full text-left px-4 py-3 rounded-xl bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/20 transition-colors"
          >
            <p className="text-sm font-medium text-orange-400">업무일지만 삭제</p>
            <p className="text-xs text-slate-lab mt-0.5">관련 샘플 데이터는 유지됩니다.</p>
          </button>
          <button
            onClick={() => onDelete(log.id, true)}
            className="w-full text-left px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-colors"
          >
            <p className="text-sm font-medium text-red-400">업무일지 + 관련 샘플 삭제</p>
            <p className="text-xs text-slate-lab mt-0.5">같은 프로젝트명의 샘플 데이터도 함께 삭제됩니다.</p>
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-navy-700 hover:bg-navy-600 text-slate-light text-sm font-medium transition-colors"
        >
          취소
        </button>
      </div>
    </div>
  );
}

// ── 편집 모달 ─────────────────────────────────────────────────────────────
function EditModal({ log, onClose, onSave }: {
  log: WorkLog;
  onClose: () => void;
  onSave: (id: number, name: string) => void;
}) {
  const [name, setName] = useState(log.project_name ?? '');
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-sm space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">프로젝트명 수정</h3>
          <button onClick={onClose} className="text-slate-lab hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <input
          className="input-field w-full"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="프로젝트명 입력"
          autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter') onSave(log.id, name); }}
        />
        <div className="flex gap-2">
          <button
            onClick={() => onSave(log.id, name)}
            className="flex-1 py-2.5 rounded-xl bg-accent hover:bg-accent/80 text-white text-sm font-medium transition-colors"
          >
            저장
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-navy-700 hover:bg-navy-600 text-slate-light text-sm font-medium transition-colors"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 메인 페이지 ─────────────────────────────────────────────────────────────
export default function WorkLogs() {
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<WorkLog | null>(null);
  const [editTarget, setEditTarget] = useState<WorkLog | null>(null);

  const load = () => {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    api.worklogs(params).then(setLogs);
  };

  useEffect(() => { load(); }, [search, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (id: number, withSamples: boolean) => {
    setDeleteTarget(null);
    await api.deleteWorklog(id, withSamples);
    load();
  };

  const handleEdit = async (id: number, name: string) => {
    setEditTarget(null);
    await api.updateWorklog(id, { project_name: name });
    load();
  };

  return (
    <div>
      {deleteTarget && (
        <DeleteModal
          log={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDelete={handleDelete}
        />
      )}
      {editTarget && (
        <EditModal
          log={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={handleEdit}
        />
      )}

      <PageHeader title="업무일지" subtitle="자동 생성 및 수동 등록 업무일지" />

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-lab" />
          <input
            className="input-field pl-10"
            placeholder="프로젝트, 시험항목, 장비 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input-field w-36" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">전체 상태</option>
          <option value="completed">완료</option>
          <option value="pending">진행중</option>
        </select>
      </div>

      <DataTable
        columns={[
          { key: 'log_date', label: '날짜' },
          { key: 'project_name', label: '프로젝트' },
          { key: 'test_item', label: '시험항목' },
          { key: 'sample_count', label: '샘플수' },
          { key: 'workload', label: '업무량', render: (r) => <span className="font-mono text-accent-light">{String(r.workload)}</span> },
          { key: 'equipment_name', label: '장비' },
          { key: 'duration_hours', label: '소요(h)' },
          { key: 'status', label: '상태', render: (r) => <Badge variant={r.status === 'completed' ? 'success' : 'warning'}>{String(r.status)}</Badge> },
          { key: 'auto_generated', label: '자동', render: (r) => r.auto_generated ? <Badge variant="info">AUTO</Badge> : '-' },
          {
            key: 'actions', label: '', render: (r) => (
              <div className="flex gap-2">
                <button
                  onClick={() => setEditTarget(r as unknown as WorkLog)}
                  className="text-slate-lab hover:text-accent-light transition-colors"
                  title="프로젝트명 수정"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteTarget(r as unknown as WorkLog)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                  title="삭제"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ),
          },
        ]}
        data={logs as unknown as Record<string, unknown>[]}
      />
    </div>
  );
}
