import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ExperimentMethod } from '../api/client';
import {
  Upload, FileText, File, FileSpreadsheet, Image as ImageIcon,
  Download, Trash2, Plus, Search, X, Eye,
} from 'lucide-react';
import clsx from 'clsx';

// ── 파일 타입 헬퍼 ────────────────────────────────────────────────────────────
const FILE_ICONS: Record<string, React.ReactNode> = {
  pdf:  <FileText className="w-5 h-5 text-red-400" />,
  xlsx: <FileSpreadsheet className="w-5 h-5 text-green-400" />,
  xls:  <FileSpreadsheet className="w-5 h-5 text-green-400" />,
  docx: <FileText className="w-5 h-5 text-blue-400" />,
  doc:  <FileText className="w-5 h-5 text-blue-400" />,
  hwp:  <FileText className="w-5 h-5 text-teal-400" />,
  hwpx: <FileText className="w-5 h-5 text-teal-400" />,
  png:  <ImageIcon className="w-5 h-5 text-purple-400" />,
  jpg:  <ImageIcon className="w-5 h-5 text-purple-400" />,
  jpeg: <ImageIcon className="w-5 h-5 text-purple-400" />,
};
const fileIcon = (type?: string) =>
  (type && FILE_ICONS[type]) ?? <File className="w-5 h-5 text-slate-400" />;

const fmt = (bytes?: number) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

// ── 뷰어 URL 결정 로직 ────────────────────────────────────────────────────────
type ViewMode = 'image' | 'iframe' | 'download-only';
interface ViewerConfig {
  mode: ViewMode;
  url: string;
  label?: string;
}

function resolveViewer(m: ExperimentMethod): ViewerConfig | null {
  const type = m.file_type?.toLowerCase() ?? '';
  const pub = m.file_url;      // Supabase 공개 URL
  const hasLocal = m.has_local_file;
  const hasView = m.has_view;  // 서버 변환 HTML

  // ── 이미지 ────────────────────────────────────────────────────────────────
  if (['png', 'jpg', 'jpeg'].includes(type)) {
    const url = pub ?? (hasLocal ? api.methods.inlineUrl(m.id) : null);
    if (url) return { mode: 'image', url };
  }

  // ── PDF ──────────────────────────────────────────────────────────────────
  if (type === 'pdf') {
    // Supabase URL → Google Docs Viewer (모바일 포함 가장 안정적)
    if (pub) return { mode: 'iframe', url: `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(pub)}` };
    // 로컬 → 인라인 서빙
    if (hasLocal) return { mode: 'iframe', url: api.methods.inlineUrl(m.id) };
  }

  // ── HWP / HWPX ───────────────────────────────────────────────────────────
  if (['hwp', 'hwpx'].includes(type)) {
    // 서버 변환 HTML 우선
    if (hasView) return { mode: 'iframe', url: `${api.methods.viewUrl(m.id)}?t=${Date.now()}` };
    // Supabase URL → Google Docs Viewer
    if (pub) return { mode: 'iframe', url: `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(pub)}` };
  }

  // ── Office (DOCX · XLSX · PPTX) ─────────────────────────────────────────
  if (['docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt'].includes(type) && pub) {
    return { mode: 'iframe', url: `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(pub)}` };
  }

  // ── 다운로드 전용 ─────────────────────────────────────────────────────────
  return null;
}

// ── 뷰어 모달 ────────────────────────────────────────────────────────────────
function ViewerModal({
  method,
  onClose,
  onConverted,
}: {
  method: ExperimentMethod;
  onClose: () => void;
  onConverted: () => void;
}) {
  const type = method.file_type?.toLowerCase() ?? '';
  const isHwp = ['hwp', 'hwpx'].includes(type);
  const [converting, setConverting] = useState(false);
  const [convertErr, setConvertErr] = useState('');
  const [cfg, setCfg] = useState<ViewerConfig | null>(() => resolveViewer(method));

  // ESC 키 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleConvert = async () => {
    setConverting(true);
    setConvertErr('');
    try {
      await api.methods.convert(method.id);
      onConverted();
      setCfg({ mode: 'iframe', url: `${api.methods.viewUrl(method.id)}?t=${Date.now()}` });
    } catch (e: unknown) {
      setConvertErr(e instanceof Error ? e.message : '변환 실패');
    } finally {
      setConverting(false);
    }
  };

  const downloadHref = method.file_url ?? (method.has_local_file ? api.methods.downloadUrl(method.id) : null);

  return (
    /* 반투명 전체화면 오버레이 */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* 모달 컨테이너 */}
      <div
        className="
          relative flex flex-col bg-navy-900 rounded-xl shadow-2xl border border-navy-600
          w-full max-w-5xl
          h-[95dvh] sm:h-[92vh]
          overflow-hidden
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── 헤더 ── */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-navy-600 bg-navy-800 flex-shrink-0">
          <div className="flex-shrink-0">{fileIcon(type)}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{method.title}</p>
            {method.test_item && (
              <p className="text-[11px] text-slate-lab truncate">{method.test_item}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {downloadHref && (
              <a
                href={downloadHref}
                download={method.file_name}
                className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">다운로드</span>
              </a>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-slate-lab hover:text-white hover:bg-navy-700 transition-colors"
              title="닫기 (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── 설명 ── */}
        {method.description && (
          <div className="px-4 py-1.5 text-[11px] text-slate-lab bg-navy-900/60 border-b border-navy-700 flex-shrink-0">
            {method.description}
          </div>
        )}

        {/* ── 뷰어 본체 ── */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {cfg?.mode === 'image' && (
            <div className="w-full h-full overflow-auto flex items-center justify-center bg-gray-950 p-4">
              <img
                src={cfg.url}
                alt={method.title}
                className="max-w-full max-h-full object-contain rounded shadow-lg"
              />
            </div>
          )}

          {cfg?.mode === 'iframe' && (
            <iframe
              key={cfg.url}
              src={cfg.url}
              title={method.title}
              className="w-full h-full border-0 bg-white"
              allow="fullscreen"
              /* HWP 변환 HTML sandbox 허용 */
              {...(cfg.url.includes('/view') ? { sandbox: 'allow-same-origin allow-scripts' } : {})}
            />
          )}

          {!cfg && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-lab p-8">
              <div className="text-4xl">{fileIcon(type)}</div>
              <p className="text-sm font-medium text-white text-center">{method.file_name}</p>

              {isHwp && method.has_local_file && (
                <div className="flex flex-col items-center gap-2">
                  <p className="text-xs text-center opacity-70">
                    HWP 파일을 HTML로 변환하면 브라우저에서 바로 볼 수 있습니다.
                  </p>
                  <button
                    onClick={handleConvert}
                    disabled={converting}
                    className="btn-primary flex items-center gap-2"
                  >
                    {converting
                      ? <><span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />변환 중...</>
                      : '🔄 HTML로 변환하여 보기'}
                  </button>
                  {convertErr && <p className="text-red-400 text-xs">{convertErr}</p>}
                </div>
              )}

              {!isHwp && (
                <p className="text-xs text-center opacity-60">
                  {type.toUpperCase()} 파일은 브라우저에서 직접 볼 수 없습니다.
                  {!method.file_url && <><br />Supabase에 업로드된 파일은 온라인 뷰어를 사용할 수 있습니다.</>}
                </p>
              )}

              {downloadHref && (
                <a href={downloadHref} download={method.file_name}
                  className="btn-secondary flex items-center gap-2 mt-1">
                  <Download className="w-4 h-4" />다운로드
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 업로드 폼 모달 ────────────────────────────────────────────────────────────
function UploadModal({
  testItems,
  onClose,
  onDone,
}: {
  testItems: string[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [title, setTitle] = useState('');
  const [testItem, setTestItem] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const ALLOWED = '.pdf,.hwp,.hwpx,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.txt,.png,.jpg,.jpeg';

  const pick = (f: File) => {
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''));
  };

  const submit = async () => {
    if (!title.trim()) { setError('제목을 입력하세요.'); return; }
    if (!file) { setError('파일을 선택하세요.'); return; }
    setLoading(true);
    setError('');
    try {
      await api.methods.upload({ title, test_item: testItem, description, file });
      onDone();
    } catch (e: any) {
      setError(e.message || '업로드 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-navy-800 border border-navy-600 rounded-xl w-full max-w-lg p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">실험법 문서 업로드</h2>
          <button onClick={onClose} className="text-slate-light hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {/* 드래그 앤 드롭 */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) pick(f); }}
          onClick={() => inputRef.current?.click()}
          className={clsx(
            'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors mb-4',
            dragging ? 'border-accent bg-accent/10' : 'border-navy-500 hover:border-accent/50',
          )}
        >
          <input ref={inputRef} type="file" accept={ALLOWED} className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); }} />
          {file ? (
            <div className="flex items-center justify-center gap-2 text-white">
              {fileIcon(file.name.split('.').pop()?.toLowerCase())}
              <span className="text-sm font-medium">{file.name}</span>
              <span className="text-xs text-slate-lab">({fmt(file.size)})</span>
            </div>
          ) : (
            <div className="text-slate-lab">
              <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">파일을 드래그하거나 클릭하여 선택</p>
              <p className="text-xs mt-1 opacity-60">PDF · HWP · DOCX · XLSX · 이미지</p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-lab mb-1 block">제목 *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              className="input w-full" placeholder="문서 제목" />
          </div>
          <div>
            <label className="text-xs text-slate-lab mb-1 block">시험항목</label>
            <input value={testItem} onChange={(e) => setTestItem(e.target.value)}
              list="test-item-list" className="input w-full" placeholder="예) 비타민 A, 중금속..." />
            <datalist id="test-item-list">
              {testItems.map((t) => <option key={t} value={t} />)}
            </datalist>
          </div>
          <div>
            <label className="text-xs text-slate-lab mb-1 block">설명</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              className="input w-full h-20 resize-none" placeholder="실험법 간단 설명 (선택)" />
          </div>
        </div>

        {error && <p className="text-red-400 text-xs mt-3">{error}</p>}

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="btn-secondary flex-1">취소</button>
          <button onClick={submit} disabled={loading} className="btn-primary flex-1">
            {loading ? '업로드 중...' : '업로드'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────
export default function MethodsPage() {
  const [methods, setMethods] = useState<ExperimentMethod[]>([]);
  const [testItems, setTestItems] = useState<string[]>([]);
  const [filterItem, setFilterItem] = useState<string | null>(null);
  const [viewing, setViewing] = useState<ExperimentMethod | null>(null);
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, ti] = await Promise.all([
        api.methods.list(filterItem ?? undefined),
        api.methods.testItems(),
      ]);
      setMethods(m);
      setTestItems(ti);
    } finally {
      setLoading(false);
    }
  }, [filterItem]);

  useEffect(() => { load(); }, [load]);

  const filtered = methods.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.title.toLowerCase().includes(q) ||
      (m.test_item?.toLowerCase().includes(q)) ||
      (m.description?.toLowerCase().includes(q))
    );
  });

  const handleDelete = async (id: number) => {
    if (!confirm('이 문서를 삭제하시겠습니까?')) return;
    await api.methods.delete(id);
    if (viewing?.id === id) setViewing(null);
    load();
  };

  const openViewer = (m: ExperimentMethod) => setViewing(m);

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-white">실험법 자료</h1>
          <p className="text-xs text-slate-lab mt-0.5">시험항목별 실험 관련 문서 보관 및 조회</p>
        </div>
        <button onClick={() => setShowUpload(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          문서 업로드
        </button>
      </div>

      {/* 검색 */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-lab" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input w-full pl-9 pr-8"
          placeholder="제목 · 시험항목 검색"
        />
        {search && (
          <button onClick={() => setSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-lab hover:text-white">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 시험항목 필터 pills */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setFilterItem(null)}
          className={clsx('px-3 py-1 rounded-full text-xs font-medium transition-colors',
            filterItem === null ? 'bg-accent text-navy-900' : 'bg-navy-700 text-slate-lab hover:text-white')}
        >전체</button>
        {testItems.map((ti) => (
          <button key={ti}
            onClick={() => setFilterItem(ti === filterItem ? null : ti)}
            className={clsx('px-3 py-1 rounded-full text-xs font-medium transition-colors',
              filterItem === ti ? 'bg-accent text-navy-900' : 'bg-navy-700 text-slate-lab hover:text-white')}
          >{ti}</button>
        ))}
      </div>

      {/* 파일 카드 그리드 */}
      {loading ? (
        <p className="text-xs text-slate-lab py-8 text-center">불러오는 중...</p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-lab gap-2">
          <FileText className="w-10 h-10 opacity-20" />
          <p className="text-sm">등록된 문서가 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto pb-2">
          {filtered.map((m) => {
            const canView = !!(resolveViewer(m) || (
              ['hwp', 'hwpx'].includes(m.file_type ?? '') && m.has_local_file
            ));
            return (
              <div key={m.id}
                className="bg-navy-800 border border-navy-600 rounded-xl p-4 flex flex-col gap-3 hover:border-navy-500 transition-colors">
                {/* 파일 아이콘 + 제목 */}
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">{fileIcon(m.file_type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white leading-tight line-clamp-2">{m.title}</p>
                    {m.test_item && (
                      <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-accent/15 text-accent-light">
                        {m.test_item}
                      </span>
                    )}
                  </div>
                </div>

                {/* 설명 */}
                {m.description && (
                  <p className="text-[11px] text-slate-lab line-clamp-2 leading-relaxed">{m.description}</p>
                )}

                {/* 파일 정보 */}
                <div className="flex items-center gap-2 text-[10px] text-slate-lab">
                  <span className="uppercase font-mono bg-navy-700 px-1.5 py-0.5 rounded">
                    {m.file_type}
                  </span>
                  {m.file_size ? <span>{fmt(m.file_size)}</span> : null}
                  {m.file_url && (
                    <span className="ml-auto text-green-500 font-medium">● Cloud</span>
                  )}
                </div>

                {/* 버튼 */}
                <div className="flex gap-2 mt-auto">
                  {canView ? (
                    <button
                      onClick={() => openViewer(m)}
                      className="btn-primary flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      자료 보기
                    </button>
                  ) : (
                    <a
                      href={m.file_url ?? (m.has_local_file ? api.methods.downloadUrl(m.id) : '#')}
                      download={m.file_name}
                      className="btn-secondary flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      다운로드
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="p-1.5 rounded-md text-slate-lab hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 뷰어 모달 */}
      {viewing && (
        <ViewerModal
          method={viewing}
          onClose={() => setViewing(null)}
          onConverted={() => {
            load();
            setViewing(prev => prev ? { ...prev, has_view: true } : prev);
          }}
        />
      )}

      {/* 업로드 모달 */}
      {showUpload && (
        <UploadModal
          testItems={testItems}
          onClose={() => setShowUpload(false)}
          onDone={() => { setShowUpload(false); load(); }}
        />
      )}
    </div>
  );
}
