import { useEffect, useState } from 'react';
import { api, AppSettings } from '../api/client';
import { sbSetAppSetting } from '../lib/supabaseClient';
import { PageHeader } from '../components/UI';
import { Save, Cloud, CheckCircle } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.settings.get().then(setSettings);
  }, []);

  const save = async () => {
    if (!settings) return;
    await sbSetAppSetting('operator_name', settings.operator_name);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!settings) return <div className="text-slate-light">로딩 중...</div>;

  return (
    <div>
      <PageHeader title="설정" subtitle="운영자 정보 및 시스템 설정" />

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
          <button onClick={save} className="btn-primary flex items-center gap-2">
            <Save className="w-4 h-4" />
            {saved ? (
              <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> 저장됨!</span>
            ) : '저장'}
          </button>
        </div>

        <div className="card space-y-4">
          <h3 className="font-medium text-white flex items-center gap-2">
            <Cloud className="w-4 h-4 text-cyan-400" /> 데이터베이스
          </h3>
          <div className="space-y-2 text-sm text-slate-light">
            <p className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
              Supabase 직접 연결 중 (백엔드 서버 불필요)
            </p>
            <p className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
              PC · 모바일 실시간 동기화
            </p>
            <p className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
              Excel 파싱: 브라우저 내 처리 (SheetJS)
            </p>
          </div>
          <div className="bg-navy-700/50 rounded-lg px-3 py-2 font-mono text-xs text-slate-400 break-all">
            {import.meta.env.VITE_SUPABASE_URL ?? 'VITE_SUPABASE_URL 미설정'}
          </div>
        </div>
      </div>
    </div>
  );
}
