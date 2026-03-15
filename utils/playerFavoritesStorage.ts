const PLAYER_FAVORITES_KEY = 'brafa_player_favorites';

const isBrowser = () => typeof window !== 'undefined';

export const getPlayerFavorites = (): string[] => {
  if (!isBrowser()) return [];

  try {
    const rawValue = window.localStorage.getItem(PLAYER_FAVORITES_KEY);
    if (!rawValue) return [];

    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((value) => String(value));
  } catch {
    window.localStorage.removeItem(PLAYER_FAVORITES_KEY);
    return [];
  }
};

export const setPlayerFavorites = (favorites: string[]) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(PLAYER_FAVORITES_KEY, JSON.stringify(Array.from(new Set(favorites.map(String)))));
};

export const togglePlayerFavorite = (playerId: string | number): string[] => {
  const normalizedPlayerId = String(playerId);
  const currentFavorites = getPlayerFavorites();

  if (currentFavorites.includes(normalizedPlayerId)) {
    const nextFavorites = currentFavorites.filter((id) => id !== normalizedPlayerId);
    setPlayerFavorites(nextFavorites);
    return nextFavorites;
  }

  const nextFavorites = [normalizedPlayerId, ...currentFavorites];
  setPlayerFavorites(nextFavorites);
  return nextFavorites;
};
