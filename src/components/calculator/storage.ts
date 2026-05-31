import type { CalcFavorite, CalcHistoryEntry, CalculatorId } from './types';

const HISTORY_KEY = 'lab-calc-history';
const FAVORITES_KEY = 'lab-calc-favorites';
const MAX_HISTORY = 30;

export function loadHistory(): CalcHistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

export function pushHistory(entry: Omit<CalcHistoryEntry, 'id' | 'timestamp'>) {
  const item: CalcHistoryEntry = {
    ...entry,
    id: String(Date.now()),
    timestamp: Date.now(),
  };
  const all = [item, ...loadHistory()].slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(all));
  return all;
}

export function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
}

export function loadFavorites(): CalcFavorite[] {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveFavorite(fav: Omit<CalcFavorite, 'id'>) {
  const item: CalcFavorite = { ...fav, id: String(Date.now()) };
  const all = [...loadFavorites(), item];
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(all));
  return all;
}

export function deleteFavorite(id: string) {
  const all = loadFavorites().filter((f) => f.id !== id);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(all));
  return all;
}

export function favoritesForCalc(id: CalculatorId): CalcFavorite[] {
  return loadFavorites().filter((f) => f.calculatorId === id);
}
