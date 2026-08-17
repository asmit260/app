// Local-first reactive storage manager for AniTrack App

const STORAGE_KEYS = {
  WATCHLIST: 'anitrack_app_watchlist',
  PROGRESS: 'anitrack_app_progress',
  HISTORY: 'anitrack_app_history',
  PROFILE: 'anitrack_app_profile',
  THEME: 'anitrack_app_theme',
  CUSTOM_LISTS: 'anitrack_app_custom_lists'
};

export const getStoredWatchlist = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.WATCHLIST);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Storage error:", e);
    return [];
  }
};

export const saveWatchlist = (watchlist) => {
  try {
    localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(watchlist));
    window.dispatchEvent(new CustomEvent('anitrack-watchlist-changed', { detail: watchlist }));
  } catch (e) {
    console.error("Save error:", e);
  }
};

export const upsertWatchlistEntry = (anime, status, episodesWatched = null) => {
  const current = getStoredWatchlist();
  const existingIdx = current.findIndex(item => item.anime_id === anime.id || item.id === anime.id);
  const now = new Date().toISOString();

  let entry;
  if (existingIdx >= 0) {
    entry = {
      ...current[existingIdx],
      status,
      episodes_watched: episodesWatched !== null ? episodesWatched : current[existingIdx].episodes_watched || 0,
      updated_at: now
    };
    current[existingIdx] = entry;
  } else {
    entry = {
      id: 'local_' + anime.id,
      anime_id: anime.id,
      anime_title: anime.title?.english || anime.title?.romaji || anime.title || 'Unknown Title',
      anime_cover_image: anime.coverImage?.large || anime.coverImage?.medium || anime.coverImage || '',
      total_episodes: anime.totalEpisodes || anime.episodes || null,
      genres: anime.genres || [],
      status: status || 'watching',
      episodes_watched: episodesWatched !== null ? episodesWatched : (status === 'completed' && anime.totalEpisodes ? anime.totalEpisodes : 0),
      score: 0,
      notes: '',
      created_at: now,
      updated_at: now
    };
    current.unshift(entry);
  }

  saveWatchlist(current);
  logWatchHistory(entry.anime_id, entry.anime_title, entry.episodes_watched);
  return entry;
};

export const removeWatchlistEntry = (animeId) => {
  const current = getStoredWatchlist();
  const filtered = current.filter(item => item.anime_id !== animeId && item.id !== animeId);
  saveWatchlist(filtered);
};

export const logWatchHistory = (animeId, title, episodeNum) => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
    const history = raw ? JSON.parse(raw) : [];
    history.push({
      anime_id: animeId,
      anime_title: title,
      episode_number: episodeNum,
      watched_at: new Date().toISOString()
    });
    // Keep last 500 history items
    if (history.length > 500) history.splice(0, history.length - 500);
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  } catch (e) {}
};

export const getWatchHistory = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

export const getProfileSettings = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
    return raw ? JSON.parse(raw) : {
      username: 'Scout Trainee',
      titleLanguage: 'english', // 'english' | 'romaji' | 'native'
      theme: 'light'
    };
  } catch (e) {
    return { username: 'Scout Trainee', titleLanguage: 'english', theme: 'light' };
  }
};

export const saveProfileSettings = (settings) => {
  try {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('anitrack-profile-changed', { detail: settings }));
  } catch (e) {}
};
