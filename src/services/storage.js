import { supabase } from './supabase.js';
import { getUser } from './auth.js';
import { isAnimeOngoing, getMaxAiredEpisode } from '../utils/animeRules.js';

const LOCAL_WATCHLIST_KEY = 'anitrack_local_watchlist';
const LOCAL_HISTORY_KEY = 'anitrack_local_history';
const LOCAL_PROFILE_KEY = 'anitrack_local_profile';

// Validate standard RFC 4122 UUID (used by Supabase auth.users & postgres uuid columns)
function isValidUUID(id) {
  return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// ─── Local Storage Accessors ────────────────────────────────────────────────

function sanitizeWatchlistItems(items) {
  if (!Array.isArray(items)) return [];
  let modified = false;
  const sanitized = items.map(item => {
    if (isAnimeOngoing(item)) {
      const maxAired = getMaxAiredEpisode(item);
      let updated = { ...item };
      if (updated.status === 'completed') {
        updated.status = 'watching';
        modified = true;
      }
      if (maxAired && Number(updated.episodes_watched) > maxAired) {
        updated.episodes_watched = maxAired;
        modified = true;
      }
      return updated;
    }
    return item;
  });
  if (modified) {
    try {
      localStorage.setItem(LOCAL_WATCHLIST_KEY, JSON.stringify(sanitized));
    } catch (_) {}
  }
  return sanitized;
}

function getLocalWatchlist() {
  try {
    const raw = localStorage.getItem(LOCAL_WATCHLIST_KEY);
    if (raw) return sanitizeWatchlistItems(JSON.parse(raw));

    // Auto-migrate from previous mock database if it exists
    const mockRaw = localStorage.getItem('anitrack_mock_db');
    if (mockRaw) {
      const parsed = JSON.parse(mockRaw);
      if (parsed?.watchlist) {
        const items = Object.values(parsed.watchlist);
        if (items.length > 0) {
          saveLocalWatchlist(items);
          return items;
        }
      }
    }
    return [];
  } catch (e) {
    console.error("Failed to read local watchlist:", e);
    return [];
  }
}

function saveLocalWatchlist(list) {
  try {
    localStorage.setItem(LOCAL_WATCHLIST_KEY, JSON.stringify(list || []));
  } catch (e) {
    console.error("Failed to save local watchlist:", e);
  }
}

function getLocalHistory() {
  try {
    const raw = localStorage.getItem(LOCAL_HISTORY_KEY);
    if (raw) return JSON.parse(raw);

    const mockRaw = localStorage.getItem('anitrack_mock_db');
    if (mockRaw) {
      const parsed = JSON.parse(mockRaw);
      if (parsed?.episode_progress) {
        const items = Object.values(parsed.episode_progress);
        if (items.length > 0) {
          saveLocalHistory(items);
          return items;
        }
      }
    }
    return [];
  } catch (e) {
    return [];
  }
}

function saveLocalHistory(history) {
  try {
    localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(history || []));
  } catch (e) {
    console.error("Failed to save local history:", e);
  }
}

function getLocalProfile() {
  try {
    const raw = localStorage.getItem(LOCAL_PROFILE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return {
    username: 'Anime Scout',
    bio: 'Dedicated anime watcher & seasonal tracker',
    avatar: '',
    titleLanguage: 'english',
    theme: 'light',
    email: ''
  };
}

function saveLocalProfile(prof) {
  try {
    localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(prof));
  } catch (_) {}
}

// ─── Watchlist Operations ───────────────────────────────────────────────────

export async function getStoredWatchlist() {
  const user = await getUser();

  // 1. If not logged in or local guest, return local storage directly
  if (!user || !isValidUUID(user.id)) {
    return getLocalWatchlist();
  }

  // 2. If authenticated with Supabase, fetch from cloud DB with local fallback
  try {
    const { data, error } = await supabase
      .from('watchlist')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn("Supabase watchlist fetch error, using local cache:", error);
      return getLocalWatchlist();
    }

    const cloudItems = data || [];
    saveLocalWatchlist(cloudItems);
    return cloudItems;
  } catch (err) {
    console.warn("Network error fetching watchlist from Supabase:", err);
    return getLocalWatchlist();
  }
}

export async function upsertWatchlistEntry(anime, status, episodesWatched = null) {
  const user = await getUser();
  const animeId = parseInt(anime.id || anime.anime_id);
  if (!animeId) return null;

  const existing = await getWatchlistItem(animeId);
  const isOngoing = isAnimeOngoing(anime);

  let targetStatus = status;
  if (targetStatus === 'completed' && isOngoing) {
    targetStatus = 'watching';
  }

  let finalEpisodesWatched = episodesWatched !== null 
    ? episodesWatched 
    : (existing ? existing.episodes_watched : (targetStatus === 'completed' && (anime.episodes || anime.totalEpisodes) ? (anime.episodes || anime.totalEpisodes) : (targetStatus === 'watching' ? 1 : 0)));

  // Strict Episode Limit Enforcement:
  const maxAired = getMaxAiredEpisode(anime, episodesWatched);
  const effectiveMaxEp = isOngoing 
    ? maxAired 
    : (anime.totalEpisodes || anime.episodes || (existing ? existing.total_episodes : maxAired));

  if (effectiveMaxEp && Number(finalEpisodesWatched) > effectiveMaxEp) {
    finalEpisodesWatched = effectiveMaxEp;
  }

  // Extract cover safely from any format
  let coverUrl = '';
  if (anime.coverImage) {
    if (typeof anime.coverImage === 'string') coverUrl = anime.coverImage;
    else coverUrl = anime.coverImage.large || anime.coverImage.medium || anime.coverImage.extraLarge || '';
  }
  if (!coverUrl) {
    coverUrl = anime.anime_cover || anime.cover || (existing ? existing.anime_cover : '');
  }

  // Extract title safely
  let titleStr = '';
  if (anime.title) {
    if (typeof anime.title === 'string') titleStr = anime.title;
    else titleStr = anime.title.english || anime.title.romaji || anime.title.native || '';
  }
  if (!titleStr) {
    titleStr = anime.anime_title || (existing ? existing.anime_title : 'Unknown Title');
  }

  // Extract genres safely
  let genresArr = anime.genres;
  if (typeof genresArr === 'string') {
    try { genresArr = JSON.parse(genresArr); } catch (_) { genresArr = []; }
  }
  if (!Array.isArray(genresArr)) {
    genresArr = existing ? (Array.isArray(existing.genres) ? existing.genres : []) : [];
  }

  const isAuthUser = user && isValidUUID(user.id);
  const userId = isAuthUser ? user.id : 'local_user';

  const payload = {
    id: existing?.id || `wl_${animeId}`,
    user_id: userId,
    anime_id: animeId,
    status: targetStatus,
    media_status: anime.media_status || anime.mediaStatus || (typeof anime.status === 'string' && ['RELEASING', 'NOT_YET_RELEASED', 'FINISHED', 'HIATUS'].includes(anime.status.toUpperCase()) ? anime.status.toUpperCase() : (existing ? existing.media_status : null)),
    nextAiringEpisode: anime.nextAiringEpisode || (existing ? existing.nextAiringEpisode : null),
    airing_episode: anime.nextAiringEpisode?.episode ? Math.max(1, anime.nextAiringEpisode.episode - 1) : (anime.airing_episode || (existing ? existing.airing_episode : null)),
    anime_title: titleStr,
    anime_cover: coverUrl,
    genres: genresArr,
    duration: anime.duration || (existing ? existing.duration : 24),
    total_episodes: anime.totalEpisodes || anime.episodes || (existing ? existing.total_episodes : null),
    episodes_watched: finalEpisodesWatched,
    score: (anime.score !== undefined && anime.score !== null) ? anime.score : (existing ? existing.score || 0 : 0),
    rewatch_count: anime.rewatch_count !== undefined ? anime.rewatch_count : (existing ? existing.rewatch_count || 0 : 0),
    updated_at: new Date().toISOString()
  };

  if (targetStatus === 'completed' && payload.total_episodes) {
    payload.episodes_watched = payload.total_episodes;
    payload.finish_date = new Date().toISOString().split('T')[0];
  } else if (targetStatus === 'watching' && (!existing || !existing.start_date)) {
    payload.start_date = new Date().toISOString().split('T')[0];
  }

  // 1. ALWAYS update local storage cache immediately
  const localList = getLocalWatchlist();
  const existingIdx = localList.findIndex(i => (parseInt(i.anime_id || i.id) === animeId));
  if (existingIdx >= 0) {
    localList[existingIdx] = { ...localList[existingIdx], ...payload };
  } else {
    localList.unshift(payload);
  }
  saveLocalWatchlist(localList);

  // 2. If authenticated with Supabase, sync to cloud in background
  if (isAuthUser) {
    try {
      const cloudPayload = { ...payload };
      if (cloudPayload.id && String(cloudPayload.id).startsWith('wl_')) {
        delete cloudPayload.id; // Let Postgres handle primary key UUID if new
      }
      await supabase.from('watchlist').upsert(cloudPayload, { onConflict: 'user_id,anime_id' });
    } catch (cloudErr) {
      console.warn("Cloud sync error for watchlist:", cloudErr);
    }
  }

  // 3. Log all user anime actions into the Anime Progress Stream
  let actionType = status;
  let actionNote = '';
  let epToLog = payload.episodes_watched || 0;

  if (status === 'plan_to_watch') {
    actionNote = existing ? 'Moved to Plan to Watch' : 'Added to Plan to Watch';
    epToLog = 0;
  } else if (status === 'watching') {
    if (!existing || (!existing.episodes_watched && payload.episodes_watched <= 1)) {
      actionNote = 'Started watching (Ep 1)';
      epToLog = 1;
    } else {
      actionNote = `Updated to Ep ${payload.episodes_watched}`;
      epToLog = payload.episodes_watched;
    }
  } else if (status === 'completed') {
    actionNote = `Completed (${payload.episodes_watched || payload.total_episodes || ''} eps)`;
    epToLog = payload.episodes_watched || payload.total_episodes || 1;
  } else if (status === 'on_hold') {
    actionNote = payload.episodes_watched > 0 ? `Put on Hold (at Ep ${payload.episodes_watched})` : 'Moved to On Hold';
  } else if (status === 'dropped') {
    actionNote = payload.episodes_watched > 0 ? `Dropped (at Ep ${payload.episodes_watched})` : 'Dropped anime';
  }

  await logEpisodeProgress(animeId, epToLog, actionNote, actionType, titleStr);

  // 4. Notify app listeners immediately
  window.dispatchEvent(new CustomEvent('anitrack-watchlist-changed'));
  return payload;
}

export async function startRewatch(anime) {
  const animeId = parseInt(anime.id || anime.anime_id);
  if (!animeId) return null;
  const existing = await getWatchlistItem(animeId);
  const currentRewatches = (existing?.rewatch_count || 0) + 1;

  const res = await upsertWatchlistEntry({
    ...anime,
    rewatch_count: currentRewatches
  }, 'watching', 1);

  await logEpisodeProgress(animeId, 1, `Started Rewatch #${currentRewatches}`, 'rewatch', anime.title || anime.anime_title || '');
  return res;
}

export async function getWatchlistItem(animeId) {
  if (!animeId) return null;
  const idNum = parseInt(animeId);
  
  // Check local cache first
  const local = getLocalWatchlist();
  const found = local.find(i => (parseInt(i.anime_id || i.id) === idNum));
  if (found) return found;

  // If authenticated, check Supabase
  const user = await getUser();
  if (user && isValidUUID(user.id)) {
    try {
      const { data } = await supabase
        .from('watchlist')
        .select('*')
        .eq('user_id', user.id)
        .eq('anime_id', idNum)
        .maybeSingle();
      if (data) return data;
    } catch (_) {}
  }
  return null;
}

export async function removeWatchlistEntry(animeId) {
  if (!animeId) return;
  const idNum = parseInt(animeId);

  // 1. Find existing entry to log title
  const local = getLocalWatchlist();
  const itemToRemove = local.find(i => (parseInt(i.anime_id || i.id) === idNum));
  const filtered = local.filter(i => (parseInt(i.anime_id || i.id) !== idNum));
  saveLocalWatchlist(filtered);

  // 2. Remove from Supabase if authenticated
  const user = await getUser();
  if (user && isValidUUID(user.id)) {
    try {
      await supabase
        .from('watchlist')
        .delete()
        .eq('user_id', user.id)
        .eq('anime_id', idNum);
    } catch (err) {
      console.warn("Cloud delete error:", err);
    }
  }

  // 3. Log removal action to Anime Progress Stream
  if (itemToRemove) {
    await logEpisodeProgress(idNum, 0, 'Removed from Watchlist', 'removed', itemToRemove.anime_title || '');
  }

  window.dispatchEvent(new CustomEvent('anitrack-watchlist-changed'));
}

export async function updateWatchlistRating(animeId, score) {
  if (!animeId) return null;
  const idNum = parseInt(animeId);

  // 1. Update local storage
  const local = getLocalWatchlist();
  const item = local.find(i => (parseInt(i.anime_id || i.id) === idNum));
  if (item) {
    item.score = score === 0 ? null : score;
    item.updated_at = new Date().toISOString();
    saveLocalWatchlist(local);
  }

  // 2. Update Supabase if authenticated
  const user = await getUser();
  if (user && isValidUUID(user.id)) {
    try {
      await supabase
        .from('watchlist')
        .update({ score: score === 0 ? null : score, updated_at: new Date().toISOString() })
        .match({ user_id: user.id, anime_id: idNum });
    } catch (err) {
      console.warn("Cloud update rating error:", err);
    }
  }

  window.dispatchEvent(new CustomEvent('anitrack-watchlist-changed'));
}

// ─── Anime Progress Stream (History) ────────────────────────────────────────

export async function logEpisodeProgress(animeId, episodeNumber, note = '', actionType = 'watching', animeTitle = '') {
  if (!animeId) return;
  const idNum = parseInt(animeId);
  const epNum = Number.isInteger(parseInt(episodeNumber)) ? parseInt(episodeNumber) : 0;
  const user = await getUser();
  const isAuthUser = user && isValidUUID(user.id);
  const userId = isAuthUser ? user.id : 'local_user';

  // 1. Always save to local history
  const history = getLocalHistory();
  const newRecord = {
    id: 'hist_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    user_id: userId,
    anime_id: idNum,
    anime_title: animeTitle || '',
    action_type: actionType,
    episode_number: epNum,
    watched_at: new Date().toISOString(),
    note: note || (actionType === 'watching' ? `Episode ${epNum}` : note)
  };
  history.unshift(newRecord);
  saveLocalHistory(history.slice(0, 1000));

  // 2. Save to Supabase if authenticated
  if (isAuthUser) {
    try {
      const logPayload = {
        user_id: userId,
        anime_id: idNum,
        episode_number: epNum,
        watched_at: new Date().toISOString(),
        note: note || (actionType === 'watching' ? `Episode ${epNum}` : note)
      };

      const { error } = await supabase
        .from('episode_progress')
        .upsert(logPayload, {
          onConflict: 'user_id,anime_id,episode_number',
          ignoreDuplicates: false
        });

      if (error && error.code !== '23505') {
        // Fallback: If composite key differs, attempt plain upsert
        await supabase.from('episode_progress').upsert(logPayload).catch(() => {});
      }
    } catch (err) {
      // Quietly absorb non-critical network conflict logs
    }
  }
}

export async function getWatchHistory() {
  const user = await getUser();

  // If not authenticated, return local history
  if (!user || !isValidUUID(user.id)) {
    return getLocalHistory();
  }

  // If authenticated, fetch from Supabase
  try {
    const { data, error } = await supabase
      .from('episode_progress')
      .select('*')
      .eq('user_id', user.id)
      .order('watched_at', { ascending: false });

    if (error) {
      return getLocalHistory();
    }
    const cloudHistory = data || [];
    saveLocalHistory(cloudHistory);
    return cloudHistory;
  } catch (err) {
    return getLocalHistory();
  }
}

// ─── Profile & Data Management ──────────────────────────────────────────────

export async function getProfileSettings() {
  const user = await getUser();
  const localProf = getLocalProfile();

  if (!user || !isValidUUID(user.id)) {
    return localProf;
  }

  try {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    const prof = {
      username: data?.display_name || user.user_metadata?.display_name || user.email?.split('@')[0] || localProf.username,
      bio: data?.bio !== undefined ? data.bio : (localProf.bio || ''),
      avatar: data?.avatar_url || data?.avatar || localProf.avatar || '',
      titleLanguage: data?.title_language || localProf.titleLanguage || 'english',
      theme: data?.theme || localProf.theme || 'light',
      email: user.email || ''
    };
    saveLocalProfile(prof);
    return prof;
  } catch (err) {
    return localProf;
  }
}

export async function updateProfileSettings(settings) {
  const user = await getUser();
  const isAuthUser = user && isValidUUID(user.id);
  const userId = isAuthUser ? user.id : 'local_user';

  const payload = {
    id: userId,
    display_name: settings.username || 'Anime Scout',
    bio: settings.bio !== undefined ? settings.bio : '',
    avatar_url: settings.avatar !== undefined ? settings.avatar : '',
    title_language: settings.titleLanguage || 'english',
    theme: settings.theme || 'light',
    updated_at: new Date().toISOString()
  };

  saveLocalProfile({
    username: payload.display_name,
    bio: payload.bio,
    avatar: payload.avatar_url,
    titleLanguage: payload.title_language,
    theme: payload.theme,
    email: user?.email || ''
  });

  if (isAuthUser) {
    try {
      await supabase
        .from('profiles')
        .upsert(payload);
    } catch (err) {
      console.warn("Cloud profile update error:", err);
    }
  }

  window.dispatchEvent(new CustomEvent('anitrack-db-changed'));
  return payload;
}

export const saveProfileSettings = updateProfileSettings;

export async function exportWatchlistJSON() {
  const list = await getStoredWatchlist();
  const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `anitrack-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importWatchlistJSON(jsonData) {
  try {
    const items = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    if (!Array.isArray(items)) return { success: false, error: 'Invalid backup format' };
    
    for (const item of items) {
      await upsertWatchlistEntry(item, item.status || 'watching', item.episodes_watched || 0);
    }
    return { success: true, count: items.length };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function resetAllData() {
  const user = await getUser();
  localStorage.removeItem(LOCAL_WATCHLIST_KEY);
  localStorage.removeItem(LOCAL_HISTORY_KEY);
  localStorage.removeItem(LOCAL_PROFILE_KEY);

  if (user && isValidUUID(user.id)) {
    try {
      await supabase.from('watchlist').delete().eq('user_id', user.id);
      await supabase.from('episode_progress').delete().eq('user_id', user.id);
    } catch (_) {}
  }

  window.dispatchEvent(new CustomEvent('anitrack-watchlist-changed'));
  window.dispatchEvent(new CustomEvent('anitrack-db-changed'));
}
