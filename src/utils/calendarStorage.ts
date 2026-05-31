import type { ScheduleEvent } from '../api/client';

const STORAGE_KEY = 'lab_calendar_events';

function loadAll(): ScheduleEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAll(events: ScheduleEvent[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

export function loadLocalEvents(start: string, end: string): ScheduleEvent[] {
  return loadAll().filter((e) => e.event_date >= start && e.event_date <= end);
}

export function createLocalEvent(title: string, event_date: string, category = 'general'): ScheduleEvent {
  const event: ScheduleEvent = {
    id: -Date.now(),
    title,
    event_date,
    category,
    color: category === 'off' ? 'slate' : category === 'training' ? 'blue' : category === 'vacation' ? 'green' : category === 'annual' ? 'purple' : category === 'workshop' ? 'orange' : 'cyan',
  };
  const all = loadAll();
  all.push(event);
  saveAll(all);
  return event;
}

export function deleteLocalEvent(id: number) {
  saveAll(loadAll().filter((e) => e.id !== id));
}

export function syncLocalFromApi(events: ScheduleEvent[]) {
  saveAll(events);
}

export function mergeEvents(apiEvents: ScheduleEvent[], localEvents: ScheduleEvent[]): ScheduleEvent[] {
  const map = new Map<number, ScheduleEvent>();
  localEvents.forEach((e) => map.set(e.id, e));
  apiEvents.forEach((e) => map.set(e.id, e));
  return [...map.values()].sort((a, b) => a.event_date.localeCompare(b.event_date));
}
