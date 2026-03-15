import { RecentCompetition } from '../types';

const ACTIVE_COMPETITION_KEY = 'brafa_active_competition';
const RECENT_COMPETITIONS_KEY = 'brafa_recent_competitions';
const MAX_RECENT_COMPETITIONS = 5;

const isBrowser = () => typeof window !== 'undefined';

const readStorageItem = (key: string): RecentCompetition[] | RecentCompetition | null => {
  if (!isBrowser()) return null;

  try {
    const rawValue = window.localStorage.getItem(key);
    if (!rawValue) return null;

    return JSON.parse(rawValue) as RecentCompetition[] | RecentCompetition;
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
};

const getRecentCompetitionKey = (item: RecentCompetition) => {
  return [item.temporadaId, item.categoriaId, item.fase || '', item.id].join('::');
};

export const getActiveCompetition = (): RecentCompetition | null => {
  const item = readStorageItem(ACTIVE_COMPETITION_KEY);
  return item && !Array.isArray(item) ? item : null;
};

export const setActiveCompetition = (item: RecentCompetition) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(ACTIVE_COMPETITION_KEY, JSON.stringify(item));
};

export const getRecentCompetitions = (): RecentCompetition[] => {
  const items = readStorageItem(RECENT_COMPETITIONS_KEY);
  return Array.isArray(items) ? items : [];
};

export const upsertRecentCompetition = (item: RecentCompetition): RecentCompetition[] => {
  const currentItems = getRecentCompetitions();
  const nextItems = [
    item,
    ...currentItems.filter((entry) => getRecentCompetitionKey(entry) !== getRecentCompetitionKey(item)),
  ].slice(0, MAX_RECENT_COMPETITIONS);

  if (isBrowser()) {
    window.localStorage.setItem(RECENT_COMPETITIONS_KEY, JSON.stringify(nextItems));
  }

  return nextItems;
};