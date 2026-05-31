import { Sparkles } from 'lucide-react';
import { BIRTH_PROFILE, getPersonalFortunes } from '../../utils/fortune';

export default function FortuneWidget() {
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const todayFortunes = getPersonalFortunes(today);
  const tomorrowFortunes = getPersonalFortunes(tomorrow);

  return (
    <div className="card">
      <h3 className="text-sm font-medium text-slate-light mb-1 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-accent" /> 오늘·내일 운세
      </h3>
      <p className="text-[10px] text-slate-lab mb-3">{BIRTH_PROFILE.summary}</p>
      <div className="grid grid-cols-2 gap-4 max-h-[220px] overflow-y-auto pr-1">
        <div>
          <p className="text-xs text-accent font-medium mb-2 sticky top-0 bg-navy-800">오늘</p>
          <div className="space-y-1.5">
            {todayFortunes.map((f) => (
              <div key={f.label} className="text-xs leading-relaxed">
                <span className={`font-medium ${f.color}`}>{f.label}</span>
                <span className="text-slate-light ml-1.5">{f.text}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-slate-lab font-medium mb-2 sticky top-0 bg-navy-800">내일</p>
          <div className="space-y-1.5">
            {tomorrowFortunes.map((f) => (
              <div key={f.label} className="text-xs leading-relaxed">
                <span className={`font-medium ${f.color} opacity-70`}>{f.label}</span>
                <span className="text-slate-lab ml-1.5">{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
