import { useEffect, useState } from 'react';
import { api, AppSettings, Equipment } from '../api/client';
import { sbSetAppSetting, sbGetAppSetting } from '../lib/supabaseClient';
import { PageHeader } from '../components/UI';
import { Save, Cloud, CheckCircle, Plus, Trash2 } from 'lucide-react';

// ── 시험항목-장비 매핑 ────────────────────────────────────────────────────────

const SETTINGS_KEY = 'test_item_equipment_map';

type TIEMap = Record<string, string>; // test_item → equipment_name

async function loadTIEMap(): Promise<TIEMap> {
  try {
    const raw = await sbGetAppSetting(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

async function saveTIEMap(map: TIEMap): Promise<void> {
  await sbSetAppSetting(SETTINGS_KEY, JSON.stringify(map));
}

export async function getTIEMap(): Promise<TIEMap> {
  return loadTIEMap();
}

function TIEMapEditor({ equipment }: { equipment: Equipment[] }) {
  const [map, setMap] = useState<TIEMap>({});
  const [newItem, setNewItem] = useState('');
  const [newEq, setNewEq] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => { loadTIEMap().then(setMap); }, []);

  const save = async () => {
    await saveTIEMap(map);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addRow = () => {
    const ti = newItem.trim();
    const eq = newEq.trim();
    if (!ti || !eq) return;
    setMap(prev => ({ ...prev, [ti]: eq }));
    setNewItem('');
    setNewEq('');
  };

  const removeRow = (ti: string) => {
    setMap(prev => { const next = { ...prev }; delete next[ti]; return next; });
  };

  const updateTestItem = (oldTi: string, newTi: string) => {
    if (!newTi.trim() || newTi === oldTi) return;
    setMap(prev => {
      const next: TIEMap = {};
      for (const [k, v] of Object.entries(prev)) {
        next[k === oldTi ? newTi.trim() : k] = v;
      }
      return next;
    });
  };

  const updateEquipment = (ti: string, eq: string) => {
    setMap(prev => ({ ...prev, [ti]: eq }));
  };

  const eqNames = equipment.map(e => e.name);

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-white">시험항목 → 장비 기본 매핑</h3>
        <p className="text-xs text-slate-lab">업로드 시 장비 미선택인 경우 자동 적용</p>
      </div>

      {Object.keys(map).length === 0 && (
        <p className="text-xs text-slate-lab py-2">아래에서 시험항목과 장비를 추가하세요.</p>
      )}

      <div className="space-y-2">
        {Object.entries(map).map(([ti, eq]) => (
          <div key={ti} className="flex items-center gap-2">
            <input
              className="input-field flex-1 text-sm"
              defaultValue={ti}
              onBlur={e => updateTestItem(ti, e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
            />
            <span className="text-slate-lab text-xs flex-shrink-0">→</span>
            <select
              className="input-field flex-1 text-sm"
              value={eq}
              onChange={e => updateEquipment(ti, e.target.value)}
            >
              {eqNames.map(n => <option key={n} value={n}>{n}</option>)}
              {!eqNames.includes(eq) && <option value={eq}>{eq}</option>}
            </select>
            <button onClick={() => removeRow(ti)} className="text-red-400 hover:text-red-300 p-1 flex-shrink-0">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* 새 행 추가 */}
      <div className="flex items-center gap-2 pt-1 border-t border-navy-700">
        <input
          className="input-field flex-1 text-sm"
          placeholder="시험항목 (예: 비소(As))"
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addRow(); }}
        />
        <span className="text-slate-lab text-xs">→</span>
        <select
          className="input-field flex-1 text-sm"
          value={newEq}
          onChange={e => setNewEq(e.target.value)}
        >
          <option value="">장비 선택</option>
          {eqNames.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <button onClick={addRow} className="text-accent hover:text-accent-light p-1" title="추가">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <button onClick={save} className="btn-primary flex items-center gap-2 text-sm">
        <Save className="w-4 h-4" />
        {saved ? <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> 저장됨!</span> : '매핑 저장'}
      </button>
    </div>
  );
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.settings.get().then(setSettings);
    api.equipment.list().then(setEquipment).catch(() => {});
  }, []);

  const save = async () => {
    if (!settings) return;
    try {
      await sbSetAppSetting('operator_name', settings.operator_name);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      alert(e instanceof Error ? e.message : '저장 실패');
    }
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

      <div className="mt-6">
        <TIEMapEditor equipment={equipment} />
      </div>
    </div>
  );
}
