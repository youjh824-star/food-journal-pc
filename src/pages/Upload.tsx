import { useState, useEffect } from 'react';
import { api, UploadResult, Equipment } from '../api/client';
import { PageHeader, DropZone, Badge, AlertItem } from '../components/UI';
import { CheckCircle, FileSpreadsheet, RefreshCw } from 'lucide-react';

export default function UploadPage() {
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [selectedEq, setSelectedEq] = useState<number | undefined>();

  useEffect(() => {
    api.equipment.list().then(setEquipment);
  }, []);

  const handleDrop = async (files: FileList) => {
    setProcessing(true);
    const newResults: UploadResult[] = [];
    for (const file of Array.from(files)) {
      try {
        const result = await api.upload(file, selectedEq);
        newResults.push(result);
      } catch (e) {
        console.error(e);
        alert(e instanceof Error ? e.message : '업로드 실패');
      }
    }
    setResults((prev) => [...newResults, ...prev]);
    setProcessing(false);
  };

  return (
    <div>
      <PageHeader
        title="결과파일 업로드"
        subtitle="비타민 AE 등 실험데이터 · 재실험/재검 시 기존값 자동 비교"
      />

      <div className="mb-4 flex items-center gap-4">
        <label className="text-sm text-slate-light">장비 선택 (선택사항):</label>
        <select
          className="input-field w-48"
          value={selectedEq ?? ''}
          onChange={(e) => setSelectedEq(e.target.value ? Number(e.target.value) : undefined)}
        >
          <option value="">자동 감지</option>
          {equipment.map((eq) => (
            <option key={eq.id} value={eq.id}>{eq.name}</option>
          ))}
        </select>
      </div>

      <DropZone onDrop={handleDrop} processing={processing} />

      {results.length > 0 && (
        <div className="mt-8 space-y-4">
          <h3 className="text-sm font-medium text-slate-light">처리 결과</h3>
          {results.map((r, i) => {
            const retests = r.retest_comparisons ?? [];
            const anomalies = (r.anomalies ?? []).filter((a) => a.type !== 'retest_comparison');
            return (
            <div key={i} className="card">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-accent" />
                  <div>
                    <p className="font-medium text-white">{r.filename}</p>
                    <p className="text-xs text-slate-light">
                      {r.processing_time_ms}ms · 샘플 {r.sample_count}건
                      {(r.retest_count ?? 0) > 0 && ` · 재실험 ${r.retest_count}건`}
                      {r.work_log_id && ` · 업무일지 #${r.work_log_id}`}
                    </p>
                  </div>
                </div>
                <Badge variant="success">
                  <CheckCircle className="w-3 h-3 inline mr-1" />완료
                </Badge>
              </div>

              {retests.length > 0 && (
                <div className="space-y-2 mt-3 border-t border-navy-600 pt-3">
                  <p className="text-xs text-purple-400 font-medium flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> 재실험 비교 ({retests.length}건)
                  </p>
                  {retests.map((c, j) => (
                    <div key={j} className="bg-navy-900 rounded p-3 text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="info">재실험</Badge>
                        <span className="font-medium text-white">{c.sample_name || c.sample_id}</span>
                        <span className="text-xs text-slate-lab">{c.test_item}</span>
                      </div>
                      <p className="font-mono text-accent-light text-xs">{c.change_text ?? '-'}</p>
                      <p className="text-xs text-slate-light mt-1">{c.summary ?? ''}</p>
                      {c.previous_date && (
                        <p className="text-[10px] text-slate-lab mt-0.5">기존 데이터: {c.previous_date}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {anomalies.length > 0 && (
                <div className="space-y-1 mt-3 border-t border-navy-600 pt-3">
                  <p className="text-xs text-yellow-400 font-medium mb-2">이상 탐지</p>
                  {anomalies.map((a, j) => (
                    <AlertItem key={j} severity={a.severity ?? 'info'} message={a.description ?? ''} />
                  ))}
                </div>
              )}
            </div>
          );})}
        </div>
      )}
    </div>
  );
}
