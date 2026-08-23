// Supabase-backed storage manager — shared with website
// Uses the same DB tables as the website: watchlist, episode_progress, profiles

import { supabase } from './supabase.js';
import { getUser } from './auth.js';

// Helper to get active user ID (logged in or local)
async function getEffectiveUser() {
  const user = await getUser();
  if (user) return user;
  return { id: 'local_user', email: '', raw_user_meta_data: { display_name: 'Anime Scout' } };
}

// ─── Watchlist ──────────────────────────────────────────────────

export async function getStoredWatchlist() {
  const user = await getEffectiveUser();
  
  const { data, error } = await supabase
    .from('watchlist')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });
    
  if (error) {
    console.error("Watchlist fetch error:", error);
    return [];
  }
  return data || [];
}

export async function upsertWatchlistEntry(anime, status, episodesWatched = null) {
  const user = await getEffectiveUser();
  const animeId = parseInt(anime.id || anime.anime_id);
  if (!animeId) return null;

  const existing = await getWatchlistItem(animeId);

  let finalEpisodesWatched = episodesWatched !== null 
    ? episodesWatched 
    : (existing ? existing.episodes_watched : (status === 'completed' && (anime.episodes || anime.totalEpisodes) ? (anime.episodes || anime.totalEpisodes) : (status === 'watching' ? 1 : 0)));

  // Strict Episode Limit Enforcement:
  // For airing / releasing shows with scheduled countdown, cap at the latest aired episode.
  // For other shows, cap at total planned episodes if known.
  const maxAired = anime.nextAiringEpisode?.episode 
    ? Math.max(1, anime.nextAiringEpisode.episode - 1)
    : (anime.airing_episode || null);
  const effectiveMaxEp = maxAired || anime.totalEpisodes || anime.episodes || (existing ? existing.total_episodes : null);

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

  const payload = {
    user_id: user.id,
    anime_id: animeId,
    status,
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

  if (status === 'completed' && payload.total_episodes) {
    payload.episodes_watched = payload.total_episodes;
    payload.finish_date = new Date().toISOString().split('T')[0];
  } else if (status === 'watching' && (!existing || !existing.start_date)) {
    payload.start_date = new Date().toISOString().split('T')[0];
  }

  const { error } = await supabase
    .from('watchlist')
    .upsert(payload);
    
  if (error) {
    console.error("Upsert error:", error);
    return null;
  }

  // Log activity progress for streak, heatmap, and timeline tracking
  const epToLog = payload.episodes_watched > 0 ? payload.episodes_watched : 1;
  const note = status === 'completed' 
    ? `Completed (${payload.episodes_watched} eps)` 
    : (payload.episodes_watched > 0 ? `Episode ${payload.episodes_watched}` : `Started watching`);
  await logEpisodeProgress(animeId, epToLog, note);

  window.dispatchEvent(new CustomEvent('anitrack-watchlist-changed'));
  return payload;
}

/**
 * Start a new rewatch cycle for an anime, preserving previous completion and score
 */
export async function startRewatch(anime) {
  const animeId = parseInt(anime.id || anime.anime_id);
  if (!animeId) return null;
  const existing = await getWatchlistItem(animeId);
  const currentRewatches = (existing?.rewatch_count || 0) + 1;

  const res = await upsertWatchlistEntry({
    ...anime,
    rewatch_count: currentRewatches
  }, 'watching', 1);

  await logEpisodeProgress(animeId, 1, `Started Rewatch #${currentRewatches}`);
  return res;
}

export async function getWatchlistItem(animeId) {
  const user = await getEffectiveUser();
  if (!animeId) return null;
  
  const { data } = await supabase
    .from('watchlist')
    .select('*')
    .eq('user_id', user.id)
    .eq('anime_id', parseInt(animeId))
    .maybeSingle();
    
  return data;
}

export async function removeWatchlistEntry(animeId) {
  const user = await getEffectiveUser();
  if (!animeId) return;
  
  await supabase
    .from('watchlist')
    .delete()
    .eq('user_id', user.id)
    .eq('anime_id', parseInt(animeId));
  
  window.dispatchEvent(new CustomEvent('anitrack-watchlist-changed'));
}

export async function updateWatchlistRating(animeId, score) {
  const user = await getEffectiveUser();
  if (!animeId) return null;
  
  await supabase
    .from('watchlist')
    .update({ score: score === 0 ? null : score, updated_at: new Date().toISOString() })
    .match({ user_id: user.id, anime_id: parseInt(animeId) });
  
  window.dispatchEvent(new CustomEvent('anitrack-watchlist-changed'));
}

// ─── Episode Progress (History) ─────────────────────────────────

export async function logEpisodeProgress(animeId, episodeNumber, note = '') {
  const user = await getEffectiveUser();
  if (!animeId) return;
  
  const { data: existing } = await supabase.from('episode_progress')
    .select('id')
    .eq('user_id', user.id)
    .eq('anime_id', parseInt(animeId))
    .eq('episode_number', parseInt(episodeNumber))
    .maybeSingle();

  if (existing) {
    await supabase.from('episode_progress')
      .update({ watched_at: new Date().toISOString(), note: note || `Episode ${episodeNumber}` })
      .eq('id', existing.id);
  } else {
    await supabase.from('episode_progress')
      .insert({
        user_id: user.id,
        anime_id: parseInt(animeId),
        episode_number: parseInt(episodeNumber),
        watched_at: new Date().toISOString(),
        note: note || `Episode ${episodeNumber}`
      });
  }
}

export async function getWatchHistory() {
  const user = await getEffectiveUser();
  
  const { data, error } = await supabase
    .from('episode_progress')
    .select('*')
    .eq('user_id', user.id)
    .order('watched_at', { ascending: false });
    
  if (error) {
    console.error("History fetch error:", error);
    return [];
  }
  return data || [];
}

// ─── Profile & Data Management ──────────────────────────────────

export async function getProfileSettings() {
  const user = await getUser();
  if (!user) {
    const { data } = await supabase.from('profiles').select('*').eq('id', 'local_user').maybeSingle();
    return {
      username: data?.display_name || 'Scout Trainee',
      titleLanguage: data?.title_language || 'english',
      theme: data?.theme || 'light',
      email: ''
    };
  }

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  return {
    username: data?.display_name || user.user_metadata?.display_name || user.email?.split('@')[0] || 'Anime Scout',
    titleLanguage: data?.title_language || 'english',
    theme: data?.theme || 'light',
    email: user.email || ''
  };
}

export async function updateProfileSettings(settings) {
  const user = await getEffectiveUser();
  
  const payload = {
    id: user.id,
    display_name: settings.username || 'Anime Scout',
    title_language: settings.titleLanguage || 'english',
    theme: settings.theme || 'light',
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from('profiles')
    .upsert(payload);

  if (error) {
    console.error("Profile update error:", error);
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
  const user = await getEffectiveUser();
  await supabase.from('watchlist').delete().eq('user_id', user.id);
  await supabase.from('episode_progress').delete().eq('user_id', user.id);
  window.dispatchEvent(new CustomEvent('anitrack-watchlist-changed'));
  window.dispatchEvent(new CustomEvent('anitrack-db-changed'));
}
