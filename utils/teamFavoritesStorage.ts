const TEAM_FAVORITES_KEY = 'brafa_team_favorites';

const isBrowser = () => typeof window !== 'undefined';

export const getTeamFavorites = (): string[] => {
  if (!isBrowser()) return [];

  try {
    const rawValue = window.localStorage.getItem(TEAM_FAVORITES_KEY);
    if (!rawValue) return [];

    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((value) => String(value));
  } catch {
    window.localStorage.removeItem(TEAM_FAVORITES_KEY);
    return [];
  }
};

export const setTeamFavorites = (favorites: string[]) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(TEAM_FAVORITES_KEY, JSON.stringify(Array.from(new Set(favorites.map(String)))));
};

export const toggleTeamFavorite = (teamId: string | number): string[] => {
  const normalizedTeamId = String(teamId);
  const currentFavorites = getTeamFavorites();

  if (currentFavorites.includes(normalizedTeamId)) {
    const nextFavorites = currentFavorites.filter((id) => id !== normalizedTeamId);
    setTeamFavorites(nextFavorites);
    return nextFavorites;
  }

  const nextFavorites = [normalizedTeamId, ...currentFavorites];
  setTeamFavorites(nextFavorites);
  return nextFavorites;
};