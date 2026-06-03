import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import {
  chartTick, chartTooltipStyle, coloredBar, coloredDot, coloredActiveDot, normalizeChartData,
} from '../utils/chartColors';
import { api, DashboardData, CalendarDay, ScheduleEvent } from '../api/client';
import { Badge, AlertItem } from '../components/UI';
import StickyNotes from '../components/dashboard/StickyNotes';
import FortuneWidget from '../components/dashboard/FortuneWidget';
import WorkCalendar from '../components/dashboard/WorkCalendar';
import { AlertTriangle, CheckSquare, Clock, Lightbulb, TrendingUp, Plus, Trash2 } from 'lucide-react';
import { getHoliday } from '../utils/koreanHolidays';
import {
  EVENT_CATEGORIES, DEFAULT_EVENT_CATEGORY, categoryForEvent, eventClassName,
  type EventCategoryId,
} from '../utils/eventCategories';
import clsx from 'clsx';

function StatCard({ label, value, unit, accent }: { label: string; value: string | number; unit?: string; accent?: string }) {
  return (
    <div className="card text-center py-4">
      <p className="text-xs text-slate-light mb-1">{label}</p>
      <p className={clsx('text-2xl font-bold font-mono', accent || 'text-white')}>
        {value}
        {unit && <span className="text-sm font-normal text-slate-lab ml-1">{unit}</span>}
      </p>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [viewMonth, setViewMonth] = useState(new Date());
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);
  const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>([]);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventCategory, setNewEventCategory] = useState<EventCategoryId>(DEFAULT_EVENT_CATEGORY);
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventError, setEventError] = useState('');
  const [savingEvent, setSavingEvent] = useState(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [editEventTitle, setEditEventTitle] = useState('');
  const [editEventCategory, setEditEventCategory] = useState<EventCategoryId>(DEFAULT_EVENT_CATEGORY);

  const loadCalendar = useCallback(async (month: Date) => {
    const y = month.getFullYear();
    const m = month.getMonth();
    const start = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const end = `${y}-${String(m + 1).padStart(2, '0')}-${new Date(y, m + 1, 0).getDate()}`;
    try {
      const cal = await api.dashboardCalendar({ start_date: start, end_date: end });
      setCalendarData(cal);
    } catch {
      setCalendarData([]);
    }
    try {
      const events = await api.calendar.list({ start_date: start, end_date: end });
      setScheduleEvents(events.map((e) => ({
        ...e,
        event_date: String(e.event_date).slice(0, 10),
        category: e.category || 'general',
      })));
      setEventError('');
    } catch (err) {
      setEventError(err instanceof Error ? err.message : '일정 로드 실패');
    }
  }, []);

  useEffect(() => {
    api.dashboard().then(setData).catch(console.error);
  }, []);

  useEffect(() => {
    loadCalendar(viewMonth);
  }, [viewMonth, loadCalendar]);

  if (!data) {
    return <div className="flex items-center justify-center h-64 text-slate-light">로딩 중...</div>;
  }

  const { kpi } = data;
  const todayStr = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
  const selectedDay = calendarData.find((d) => d.date === selectedDate);
  const selectedHoliday = getHoliday(selectedDate);
  const selectedEvents = scheduleEvents.filter((e) => e.event_date === selectedDate);

  const addSchedule = async () => {
    const title = newEventTitle.trim();
    if (!title) return;
    setSavingEvent(true);
    setEventError('');
    try {
      const created = await api.calendar.create({
        title, event_date: selectedDate, category: newEventCategory,
      });
      setScheduleEvents((prev) => [...prev, {
        ...created,
        event_date: String(created.event_date).slice(0, 10),
        category: created.category || newEventCategory,
      }]);
      setNewEventTitle('');
      setShowEventForm(false);
    } catch (err) {
      setEventError(err instanceof Error ? err.message : '일정 저장 실패');
    } finally {
      setSavingEvent(false);
    }
  };

  const deleteSchedule = async (id: number) => {
    setEventError('');
    try {
      await api.calendar.delete(id);
      setScheduleEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      setEventError(err instanceof Error ? err.message : '일정 삭제 실패');
    }
  };

  const startEditSchedule = (ev: ScheduleEvent) => {
    setEditingEventId(ev.id);
    setEditEventTitle(ev.title);
    setEditEventCategory((ev.category as EventCategoryId) || categoryForEvent(ev).id);
    setShowEventForm(false);
  };

  const saveEditSchedule = async (ev: ScheduleEvent) => {
    const title = editEventTitle.trim();
    if (!title) return;
    try {
      if (ev.id > 0) {
        const updated = await api.calendar.update(ev.id, { title, category: editEventCategory });
        setScheduleEvents((prev) => prev.map((e) => (e.id === ev.id ? {
          ...e, title: updated.title, category: updated.category, color: updated.color,
        } : e)));
      } else {
        setScheduleEvents((prev) => prev.map((e) => (e.id === ev.id ? {
          ...e, title, category: editEventCategory,
          color: categoryForEvent({ category: editEventCategory }).color,
        } : e)));
      }
      setEditingEventId(null);
      setEditEventTitle('');
    } catch (err) {
      setEventError(err instanceof Error ? err.message : '일정 수정 실패');
    }
  };

  const toggleTodo = async (id: number) => {
    try {
      await api.todos.toggle(id);
      const d = await api.dashboard();
      setData(d);
    } catch (e) {
      console.error('할일 토글 실패:', e);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white">대시보드</h2>
        <p className="text-sm text-slate-light mt-0.5">{todayStr} · Lab Work Log</p>
      </div>

      {/* Top row: Sticky + Insights + Fortune */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <StickyNotes />
        <div className="card">
          <h3 className="text-sm font-medium text-slate-light mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-accent" /> AI 인사이트
          </h3>
          <div className="space-y-2">
            {(data.insights || []).map((text, i) => (
              <p key={i} className="text-sm text-slate-200 leading-relaxed flex items-start gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-accent mt-0.5 flex-shrink-0" />
                {text}
              </p>
            ))}
            {(!data.insights || data.insights.length === 0) && (
              <p className="text-sm text-slate-lab">데이터가 쌓이면 인사이트가 표시됩니다.</p>
            )}
          </div>
        </div>
        <FortuneWidget />
      </div>

      {/* Alerts & todos — below memo & fortune */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-light flex items-center gap-2">
              <CheckSquare className="w-4 h-4" /> 오늘 할 일
            </h3>
            <Link to="/todos" className="text-xs text-accent hover:text-accent-light">전체 관리 →</Link>
          </div>
          <div className="space-y-2">
            {data.todos.length === 0 ? (
              <p className="text-sm text-slate-lab">오늘 할 일 없음</p>
            ) : data.todos.slice(0, 5).map((t) => (
              <div key={t.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={t.completed}
                  onChange={() => toggleTodo(t.id)}
                  className="accent-accent w-4 h-4 cursor-pointer flex-shrink-0"
                />
                <span className={clsx('flex-1 text-slate-200', t.completed && 'line-through text-slate-lab')}>{t.title}</span>
                <Badge variant={t.priority === 'high' ? 'error' : t.priority === 'normal' ? 'info' : 'default'}>
                  {t.priority === 'high' ? '높음' : t.priority === 'normal' ? '보통' : '낮음'}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="text-sm font-medium text-slate-light mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" /> 이상 알림
          </h3>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {data.anomalies.length === 0 ? (
              <p className="text-sm text-slate-lab">이상 없음</p>
            ) : data.anomalies.slice(0, 4).map((a) => (
              <AlertItem key={a.id} severity={a.severity} message={a.description} />
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="text-sm font-medium text-slate-light mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" /> 유효기간 임박 시약
          </h3>
          <div className="space-y-2">
            {data.expiring_reagents.length === 0 ? (
              <p className="text-sm text-slate-lab">임박 시약 없음</p>
            ) : data.expiring_reagents.map((r) => (
              <div key={r.id} className="flex justify-between text-sm">
                <span>{r.name}</span>
                <Badge variant="warning">{r.expiry_date}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="오늘 분석" value={Math.round(kpi.today_workload)} unit="건" accent="text-accent-light" />
        <StatCard label="이번 주 분석" value={Math.round(kpi.week_workload)} unit="건" accent="text-green-400" />
        <StatCard label="이번 달 분석" value={Math.round(kpi.month_workload)} unit="건" accent="text-yellow-400" />
        <StatCard label="이슈율" value={`${kpi.retest_rate}%`} accent="text-red-400" />
      </div>

      {/* Calendar + Date detail */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <WorkCalendar
            calendarData={calendarData}
            scheduleEvents={scheduleEvents}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            viewMonth={viewMonth}
            onChangeMonth={setViewMonth}
          />
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-light">
              {selectedDate} 상세
            </h3>
            <button
              onClick={() => setShowEventForm(!showEventForm)}
              className="btn-primary text-xs py-1 px-2 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> 일정 추가
            </button>
          </div>

          {selectedHoliday && (
            <div className={clsx(
              'text-xs px-2 py-1.5 rounded mb-3',
              selectedHoliday.type === 'substitute' ? 'bg-orange-500/20 text-orange-300' : 'bg-red-500/20 text-red-300',
            )}>
              🎌 {selectedHoliday.name}
              {selectedHoliday.type === 'substitute' && ' (대체공휴일)'}
            </div>
          )}

          {eventError && (
            <p className="text-xs text-red-400 mb-3">{eventError}</p>
          )}

          {showEventForm && (
            <div className="space-y-2 mb-3">
              <div className="flex flex-wrap gap-1.5">
                {EVENT_CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setNewEventCategory(c.id)}
                    className={clsx(
                      'text-xs px-2 py-1 rounded-full border transition-colors',
                      newEventCategory === c.id
                        ? clsx(c.className, 'border-transparent ring-1 ring-white/20')
                        : 'border-navy-600 text-slate-light hover:border-slate-500',
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className="input-field text-sm flex-1"
                  placeholder="일정 제목"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) addSchedule(); }}
                  autoFocus
                  disabled={savingEvent}
                />
                <button onClick={addSchedule} disabled={savingEvent || !newEventTitle.trim()} className="btn-primary text-sm px-3 disabled:opacity-50">
                  {savingEvent ? '...' : '저장'}
                </button>
              </div>
            </div>
          )}

          {selectedEvents.length > 0 && (
            <div className="space-y-2 mb-3">
              <p className="text-xs text-slate-lab">등록 일정</p>
              {selectedEvents.map((ev) => {
                const cat = categoryForEvent(ev);
                return (
                <div key={ev.id} className="flex items-center justify-between bg-navy-900 rounded p-2 text-sm gap-2">
                  {editingEventId === ev.id ? (
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {EVENT_CATEGORIES.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setEditEventCategory(c.id)}
                            className={clsx(
                              'text-[10px] px-1.5 py-0.5 rounded-full border',
                              editEventCategory === c.id
                                ? clsx(c.className, 'border-transparent')
                                : 'border-navy-600 text-slate-lab',
                            )}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-1">
                        <input
                          className="input-field text-sm flex-1 py-1"
                          value={editEventTitle}
                          onChange={(e) => setEditEventTitle(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') saveEditSchedule(ev); }}
                          autoFocus
                        />
                        <button onClick={() => saveEditSchedule(ev)} className="text-green-400 hover:text-green-300 text-xs">저장</button>
                        <button onClick={() => setEditingEventId(null)} className="text-slate-light text-xs">취소</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className={clsx('text-xs px-1.5 py-0.5 rounded font-medium shrink-0', eventClassName(ev))}>
                        {cat.label}
                      </span>
                      <span className="text-slate-200 flex-1 truncate">{ev.title}</span>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => startEditSchedule(ev)} className="text-accent hover:text-accent-light text-xs">수정</button>
                        <button onClick={() => deleteSchedule(ev.id)} className="text-red-400 hover:text-red-300">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
                );
              })}
            </div>
          )}

          {selectedDay ? (
            <div className="space-y-3">
              <p className="text-sm text-accent-light font-mono">
                총 {selectedDay.total_samples}건 분석
              </p>
              {selectedDay.items.map((item, i) => (
                <div key={i} className="bg-navy-900 rounded p-3 text-sm">
                  <p className="font-medium text-white">{item.test_item}</p>
                  <p className="text-slate-light mt-1">샘플 {item.sample_count}건 · {item.equipment}</p>
                  {item.project && <p className="text-xs text-slate-lab mt-0.5">{item.project}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-lab">해당 날짜 분석 기록 없음</p>
          )}
        </div>
      </div>

    </div>
  );
}
