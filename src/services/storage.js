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
    : (existing ? existing.episodes_watched : 0);

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
    .eq('episode_number', episodeNumber)
    .maybeSingle();

  if (existing) {
    await supabase.from('episode_progress').update({
      note: note || null,
      watched_at: new Date().toISOString()
    }).eq('id', existing.id);
  } else {
    await supabase.from('episode_progress').insert({
      user_id: user.id,
      anime_id: parseInt(animeId),
      episode_number: episodeNumber,
      note: note || null,
      watched_at: new Date().toISOString()
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

// ─── Profile ────────────────────────────────────────────────────

export async function getProfileSettings() {
  const user = await getUser();
  if (!user) {
    // Try to load local profile
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
    .single();
  
  if (data) {
    return {
      username: data.display_name || data.username || 'Scout Trainee',
      titleLanguage: data.title_language || 'english',
      theme: data.theme || 'light',
      bio: data.bio || '',
      email: user.email || ''
    };
  }
  
  return {
    username: user.raw_user_meta_data?.display_name || user.email?.split('@')[0] || 'Scout Trainee',
    titleLanguage: 'english',
    theme: 'light',
    email: user.email || ''
  };
}

export async function saveProfileSettings(settings) {
  const user = await getEffectiveUser();
  
  await supabase.from('profiles').upsert({
    id: user.id,
    display_name: settings.username,
    title_language: settings.titleLanguage,
    theme: settings.theme,
    bio: settings.bio || '',
    updated_at: new Date().toISOString()
  });
  
  window.dispatchEvent(new CustomEvent('anitrack-profile-changed', { detail: settings }));
}

// ─── Data Export ─────────────────────────────────────────────────

export async function exportWatchlistJSON() {
  const watchlist = await getStoredWatchlist();
  const history = await getWatchHistory();
  const blob = new Blob([JSON.stringify({ watchlist, history }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `anitrack-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importWatchlistJSON(file) {
  const user = await getEffectiveUser();

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const raw = JSON.parse(evt.target.result);
        const list = Array.isArray(raw) ? raw : (raw.watchlist || raw.entries || []);
        
        for (const item of list) {
          await supabase.from('watchlist').upsert({
            ...item,
            user_id: user.id,
            updated_at: new Date().toISOString()
          });
        }

        if (raw.history && Array.isArray(raw.history)) {
          for (const h of raw.history) {
            await supabase.from('episode_progress').upsert({
              ...h,
              user_id: user.id
            });
          }
        }
        
        window.dispatchEvent(new CustomEvent('anitrack-watchlist-changed'));
        resolve(list.length);
      } catch (err) {
        console.error("Import error:", err);
        resolve(0);
      }
    };
    reader.readAsText(file);
  });
}

// ─── Data Reset ─────────────────────────────────────────────────

export async function resetAllData() {
  const user = await getEffectiveUser();
  const db = JSON.parse(localStorage.getItem('anitrack_mock_db') || '{}');
  
  ['watchlist', 'episode_progress', 'calendar_events', 'custom_lists', 'custom_list_items'].forEach(table => {
    if (db[table]) {
      Object.keys(db[table]).forEach(key => {
        if (db[table][key]?.user_id === user.id || (user.id === 'local_user' && !db[table][key]?.user_id)) {
          delete db[table][key];
        }
      });
    }
  });
  
  localStorage.setItem('anitrack_mock_db', JSON.stringify(db));
  window.dispatchEvent(new CustomEvent('anitrack-watchlist-changed'));
}
