import { useEffect, useState } from 'react';
import { api, AppSettings } from '../api/client';
import { PageHeader, Badge } from '../components/UI';
import { FolderOpen, Eye, EyeOff, Save, RefreshCw, Cloud, CheckCircle, AlertCircle } from 'lucide-react';

interface SyncResult {
  ok: boolean;
  total?: number;
  synced?: Record<string, number | string>;
  errors?: Record<string, string>;
  message?: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  useEffect(() => {
    api.settings.get().then(setSettings);
  }, []);

  const save = async () => {
    if (!settings) return;
    await api.settings.update({
      operator_name: settings.operator_name,
      watch_folder: settings.watch_folder,
      default_report_folder: settings.default_report_folder,
      default_work_hours: settings.default_work_hours,
      dark_mode: settings.dark_mode,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const syncAll = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/admin/sync-all', { method: 'POST' });
      const data = await res.json();
      setSyncResult(data);
    } catch (e) {
      setSyncResult({ ok: false, message: String(e) });
    } finally {
      setSyncing(false);
    }
  };

  const toggleWatcher = async () => {
    if (!settings) return;
    if (settings.watcher_running) {
      await api.settings.stopWatcher();
    } else {
      await api.settings.startWatcher();
    }
    const updated = await api.settings.get();
    setSettings(updated);
  };

  if (!settings) return <div className="text-slate-light">로딩 중...</div>;

  return (
    <div>
      <PageHeader title="설정" subtitle="운영자 정보, 파일 감시, 시스템 설정" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card space-y-4">
          <h3 className="font-medium text-white">기본 설정</h3>
          <div>
            <label className="text-sm text-slate-light block mb-1">담당자명</label>
            <input className="input-field" value={settings.operator_name}
              onChange={(e) => setSettings({ ...settings, operator_name: e.target.value })} />
          </div>
          <div>
            <label className="text-sm text-slate-light block mb-1">일일 근무시간</label>
            <input className="input-field" type="number" value={settings.default_work_hours}
              onChange={(e) => setSettings({ ...settings, default_work_hours: Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-sm text-slate-light block mb-1">기본 리포트 저장 폴더</label>
            <input className="input-field font-mono text-sm" value={settings.default_report_folder}
              onChange={(e) => setSettings({ ...settings, default_report_folder: e.target.value })} />
          </div>
          <button onClick={save} className="btn-primary flex items-center gap-2">
            <Save className="w-4 h-4" /> {saved ? '저장됨!' : '저장'}
          </button>
        </div>

        <div className="card space-y-4">
          <h3 className="font-medium text-white flex items-center gap-2">
            <FolderOpen className="w-4 h-4" /> 파일 자동 감시
          </h3>
          <p className="text-sm text-slate-light">
            지정 폴더에 새 결과파일이 생성되면 자동으로 읽기, 등록, 통계 갱신을 수행합니다.
          </p>
          <div>
            <label className="text-sm text-slate-light block mb-1">감시 폴더 경로</label>
            <input className="input-field font-mono text-sm" value={settings.watch_folder}
              onChange={(e) => setSettings({ ...settings, watch_folder: e.target.value })} />
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleWatcher} className={`btn-${settings.watcher_running ? 'secondary' : 'primary'} flex items-center gap-2`}>
              {settings.watcher_running ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {settings.watcher_running ? '감시 중지' : '감시 시작'}
            </button>
            <Badge variant={settings.watcher_running ? 'success' : 'default'}>
              {settings.watcher_running ? 'RUNNING' : 'STOPPED'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Supabase Sync */}
      <div className="card space-y-4 mt-6">
        <h3 className="font-medium text-white flex items-center gap-2">
          <Cloud className="w-4 h-4 text-cyan-400" /> Supabase 전체 동기화
        </h3>
        <p className="text-sm text-slate-light">
          PC 의 모든 데이터(업무일지, 샘플, 시약, 장비, 할일, 달력)를 Supabase 로 강제 동기화합니다.
          모바일에서 데이터가 보이지 않을 때 사용하세요.
        </p>
        <button
          onClick={syncAll}
          disabled={syncing}
          className="btn-primary flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? '동기화 중...' : 'Supabase 동기화 실행'}
        </button>

        {syncResult && (
          <div className={`rounded-lg border p-4 space-y-2 ${syncResult.ok ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
            <div className="flex items-center gap-2">
              {syncResult.ok
                ? <CheckCircle className="w-4 h-4 text-green-400" />
                : <AlertCircle className="w-4 h-4 text-red-400" />
              }
              <span className={`text-sm font-medium ${syncResult.ok ? 'text-green-400' : 'text-red-400'}`}>
                {syncResult.ok ? `동기화 완료 — 총 ${syncResult.total ?? 0}건` : '동기화 오류 발생'}
              </span>
            </div>
            {syncResult.synced && (
              <div className="grid grid-cols-2 gap-1 text-xs">
                {Object.entries(syncResult.synced).map(([table, count]) => (
                  <div key={table} className={`flex justify-between px-2 py-1 rounded ${typeof count === 'string' && count.startsWith('ERROR') ? 'bg-red-500/10 text-red-400' : 'bg-navy-700 text-slate-300'}`}>
                    <span>{table}</span>
                    <span className="font-mono">{typeof count === 'number' ? `${count}건` : count}</span>
                  </div>
                ))}
              </div>
            )}
            {syncResult.errors && Object.keys(syncResult.errors).length > 0 && (
              <div className="text-xs text-red-300 bg-red-500/10 rounded p-2 space-y-1">
                <p className="font-medium">오류 상세 — Supabase SQL Editor 에서 누락 컬럼 추가 필요:</p>
                {Object.entries(syncResult.errors).map(([t, e]) => (
                  <p key={t}><span className="text-red-400">{t}:</span> {e}</p>
                ))}
              </div>
            )}
            {syncResult.message && (
              <p className="text-xs text-red-300">{syncResult.message}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
