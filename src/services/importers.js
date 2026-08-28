// Live Importer & Metadata Enrichment Service for MyAnimeList (XML) and AniList (Username GraphQL)
// Seamless migration with zero data loss, exact AniList ID mapping & high-res covers

import { anilistQuery } from './anilist.js';
import { upsertWatchlistEntry, getStoredWatchlist } from './storage.js';

export const BATCH_MAL_TO_ANILIST_QUERY = `
  query ($idMalList: [Int]) {
    Page(page: 1, perPage: 50) {
      media(idMal_in: $idMalList, type: ANIME) {
        id
        idMal
        title {
          romaji
          english
          native
          userPreferred
        }
        coverImage {
          extraLarge
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
        nextAiringEpisode {
          airingAt
          episode
        }
      }
    }
  }
`;

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
          nextAiringEpisode {
            airingAt
            episode
          }
        }
      }
    }
  }
}
`;

/**
 * Enriches MAL entries by resolving MyAnimeList IDs (idMal) to canonical AniList IDs & High-Res Covers
 */
export async function enrichMalEntriesWithAniList(items, onProgress = null) {
  if (!Array.isArray(items) || items.length === 0) return items;

  const validMalItems = items.filter(i => i.idMal && (!i.anime_cover || i.anime_id === i.idMal));
  if (validMalItems.length === 0) return items;

  const chunkSize = 50;
  const malToMediaMap = new Map();

  for (let i = 0; i < validMalItems.length; i += chunkSize) {
    const chunk = validMalItems.slice(i, i + chunkSize);
    const idMalList = chunk.map(c => c.idMal).filter(Boolean);

    if (onProgress) {
      onProgress(i, items.length, `Matching AniList covers (${Math.min(i + chunkSize, items.length)}/${items.length})...`);
    }

    try {
      const res = await anilistQuery(BATCH_MAL_TO_ANILIST_QUERY, { idMalList });
      const mediaList = res?.Page?.media || [];
      mediaList.forEach(m => {
        if (m.idMal) {
          malToMediaMap.set(m.idMal, m);
        }
      });
    } catch (err) {
      console.warn("AniList MAL batch query warning:", err);
    }
  }

  // Merge enriched metadata back into items
  return items.map(item => {
    if (!item.idMal) return item;
    const media = malToMediaMap.get(item.idMal);
    if (!media) return item;

    const engTitle = media.title?.english;
    const romTitle = media.title?.romaji;
    const primaryTitle = engTitle || romTitle || item.anime_title;
    const coverUrl = media.coverImage?.large || media.coverImage?.medium || '';

    return {
      ...item,
      id: media.id,
      anime_id: media.id,
      idMal: media.idMal,
      title: media.title || item.title,
      anime_title: primaryTitle,
      coverImage: media.coverImage,
      anime_cover: coverUrl,
      format: media.format || item.format,
      media_status: media.status || item.media_status,
      episodes: media.episodes || item.total_episodes,
      total_episodes: media.episodes || item.total_episodes,
      totalEpisodes: media.episodes || item.total_episodes,
      duration: media.duration || 24,
      genres: media.genres || [],
      nextAiringEpisode: media.nextAiringEpisode || item.nextAiringEpisode
    };
  });
}

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
        id: idMal,
        anime_id: idMal,
        idMal: idMal,
        title: { userPreferred: title, english: title, romaji: title },
        anime_title: title,
        anime_cover: '',
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
        totalEpisodes: media.episodes,
        duration: media.duration || 24,
        genres: media.genres || [],
        episodes_watched: entry.progress || 0,
        score: entry.score ? Math.round(entry.score) : 0,
        status: mappedStatus,
        rewatch_count: entry.repeat || 0,
        start_date: formatStartDate(entry.startedAt),
        finish_date: formatStartDate(entry.completedAt),
        notes: entry.notes || '',
        nextAiringEpisode: media.nextAiringEpisode,
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
 * Auto-enriches MAL entries with canonical AniList IDs and covers before storing.
 * @param {Array<object>} items - List of parsed anime objects
 * @param {Function} onProgress - Callback (current, total, currentTitle)
 */
export async function batchImportWatchlist(items, onProgress = null) {
  if (!Array.isArray(items) || items.length === 0) {
    return { importedCount: 0 };
  }

  // 1. Enrich MAL items with AniList IDs and Covers if needed
  let processItems = items;
  const needsEnrichment = items.some(i => i.source === 'myanimelist' || !i.anime_cover);
  if (needsEnrichment) {
    if (onProgress) onProgress(0, items.length, 'Matching AniList database covers & IDs...');
    processItems = await enrichMalEntriesWithAniList(items, onProgress);
  }

  // 2. Batch Upsert into Watchlist
  let count = 0;
  for (let i = 0; i < processItems.length; i++) {
    const item = processItems[i];
    try {
      if (onProgress) {
        onProgress(i + 1, processItems.length, item.anime_title || item.title?.english || 'Anime');
      }
      await upsertWatchlistEntry(item, item.status || 'watching', item.episodes_watched || 0);
      count++;
    } catch (e) {
      console.warn("Item import error:", item.anime_title, e);
    }
  }

  return { importedCount: count, items: processItems };
}
