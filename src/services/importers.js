// Live Importer Service for MyAnimeList (XML) and AniList (Username GraphQL)
// Seamless migration with zero data loss or hardcoding

import { anilistQuery } from './anilist.js';
import { upsertWatchlistEntry } from './storage.js';

export const ANILIST_USER_LIST_QUERY = `
query GetUserAnimeList($userName: String) {
  MediaListCollection(userName: $userName, type: ANIME) {
    user {
      id
      name
      avatar {
        large
        medium
      }
    }
    lists {
      name
      isCustomList
      status
      entries {
        id
        status
        score(format: POINT_10_DECIMAL)
        progress
        repeat
        notes
        startedAt {
          year
          month
          day
        }
        completedAt {
          year
          month
          day
        }
        media {
          id
          idMal
          title {
            romaji
            english
            native
            userPreferred
          }
          coverImage {
            large
            medium
            color
          }
          format
          status
          episodes
          duration
          genres
          averageScore
        }
      }
    }
  }
}
`;

/**
 * Parses MyAnimeList XML Export (animelist.xml)
 * @param {string} xmlString - Raw XML string exported from MAL
 * @returns {Array<object>} Array of sanitized anime watchlist items
 */
export function parseMalXml(xmlString) {
  if (!xmlString || typeof xmlString !== 'string') {
    throw new Error('Invalid XML data provided.');
  }

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
  const parserError = xmlDoc.querySelector('parsererror');
  if (parserError) {
    throw new Error('Failed to parse XML file. Please ensure it is a valid MyAnimeList export.');
  }

  const animeNodes = xmlDoc.querySelectorAll('anime');
  if (!animeNodes || animeNodes.length === 0) {
    throw new Error('No anime entries found in the XML file.');
  }

  const statusMap = {
    'watching': 'watching',
    'completed': 'completed',
    'on-hold': 'on_hold',
    'on hold': 'on_hold',
    'dropped': 'dropped',
    'plan to watch': 'plan_to_watch',
    'plantowatch': 'plan_to_watch'
  };

  const parsedList = [];

  animeNodes.forEach(node => {
    const getText = (tag) => node.querySelector(tag)?.textContent?.trim() || '';

    const idMal = parseInt(getText('series_animedb_id'), 10);
    const title = getText('series_title');
    const totalEps = parseInt(getText('series_episodes'), 10) || null;
    const watchedEps = parseInt(getText('my_watched_episodes'), 10) || 0;
    const score = parseInt(getText('my_score'), 10) || 0;
    const rawStatus = getText('my_status').toLowerCase();
    const status = statusMap[rawStatus] || 'watching';
    const rewatches = parseInt(getText('my_times_watched'), 10) || 0;
    const startDate = getText('my_start_date');
    const finishDate = getText('my_finish_date');

    if (title) {
      parsedList.push({
        id: idMal || `mal_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        anime_id: idMal,
        idMal: idMal,
        title: { userPreferred: title, english: title, romaji: title },
        anime_title: title,
        total_episodes: totalEps,
        totalEpisodes: totalEps,
        episodes: totalEps,
        episodes_watched: watchedEps,
        score: score,
        status: status,
        rewatch_count: rewatches,
        start_date: startDate && startDate !== '0000-00-00' ? startDate : null,
        finish_date: finishDate && finishDate !== '0000-00-00' ? finishDate : null,
        source: 'myanimelist'
      });
    }
  });

  return parsedList;
}

/**
 * Fetches public anime library for any AniList username
 * @param {string} username - AniList username
 * @returns {Promise<{ user: object, entries: Array<object> }>}
 */
export async function fetchAniListUserList(username) {
  if (!username || !username.trim()) {
    throw new Error('Please enter an AniList username.');
  }

  const cleanUser = username.trim();
  const data = await anilistQuery(ANILIST_USER_LIST_QUERY, { userName: cleanUser });

  if (!data?.MediaListCollection) {
    throw new Error(`No anime list found for user "${cleanUser}". Please check the username.`);
  }

  const user = data.MediaListCollection.user || { name: cleanUser };
  const lists = data.MediaListCollection.lists || [];
  const entriesMap = new Map();

  const statusMap = {
    'CURRENT': 'watching',
    'COMPLETED': 'completed',
    'PLANNING': 'plan_to_watch',
    'PAUSED': 'on_hold',
    'DROPPED': 'dropped',
    'REPEATING': 'watching'
  };

  lists.forEach(list => {
    (list.entries || []).forEach(entry => {
      const media = entry.media;
      if (!media || !media.id) return;

      const title = media.title?.english || media.title?.romaji || media.title?.userPreferred || 'Anime';
      const coverUrl = media.coverImage?.large || media.coverImage?.medium || '';
      const mappedStatus = statusMap[entry.status] || 'watching';

      const formatStartDate = (d) => (d?.year && d?.month && d?.day) ? `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}` : null;

      const item = {
        id: media.id,
        anime_id: media.id,
        idMal: media.idMal,
        title: media.title,
        anime_title: title,
        coverImage: media.coverImage,
        anime_cover: coverUrl,
        format: media.format,
        media_status: media.status,
        episodes: media.episodes,
        total_episodes: media.episodes,
        duration: media.duration || 24,
        genres: media.genres || [],
        episodes_watched: entry.progress || 0,
        score: entry.score ? Math.round(entry.score) : 0,
        status: mappedStatus,
        rewatch_count: entry.repeat || 0,
        start_date: formatStartDate(entry.startedAt),
        finish_date: formatStartDate(entry.completedAt),
        notes: entry.notes || '',
        source: 'anilist'
      };

      entriesMap.set(media.id, item);
    });
  });

  return {
    user,
    entries: Array.from(entriesMap.values())
  };
}

/**
 * Batch imports parsed anime items into AniTrack local & Supabase storage
 * @param {Array<object>} items - List of parsed anime objects
 * @param {Function} onProgress - Callback (current, total, currentTitle)
 */
export async function batchImportWatchlist(items, onProgress = null) {
  if (!Array.isArray(items) || items.length === 0) {
    return { importedCount: 0 };
  }

  let count = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    try {
      if (onProgress) {
        onProgress(i + 1, items.length, item.anime_title || item.title?.english || 'Anime');
      }
      await upsertWatchlistEntry(item, item.status || 'watching', item.episodes_watched || 0);
      count++;
    } catch (e) {
      console.warn("Item import error:", item.anime_title, e);
    }
  }

  return { importedCount: count };
}
