// Live Importer & Metadata Enrichment Service for MyAnimeList (XML) and AniList (Username GraphQL)
// Seamless migration with exact AniList ID mapping, high-res covers, and full historical date sync

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
        updatedAt
        createdAt
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
 * Parses MyAnimeList XML Export (animelist.xml) with bulletproof DOMParser + Regex fallback
 * @param {string} rawXmlString - Raw XML string exported from MAL
 * @returns {Array<object>} Array of sanitized anime watchlist items
 */
export function parseMalXml(rawXmlString) {
  if (!rawXmlString || typeof rawXmlString !== 'string') {
    throw new Error('Invalid XML data provided.');
  }

  let xmlString = rawXmlString.trim();

  // Strip leading garbage or broken comment preambles before <myanimelist>
  const rootIndex = xmlString.indexOf('<myanimelist>');
  if (rootIndex > 0) {
    xmlString = xmlString.substring(rootIndex);
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

  // Helper for converting date
  const cleanDate = (d) => {
    if (!d || d === '0000-00-00' || d.startsWith('0000')) return null;
    return d.trim();
  };

  // Helper for timestamp
  const parseUnix = (ts) => {
    const num = parseInt(ts, 10);
    if (num && num > 100000000) {
      return new Date(num * 1000).toISOString();
    }
    return null;
  };

  // 1. Try browser DOMParser
  let parsedViaDOM = false;
  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
      const parserError = xmlDoc.querySelector('parsererror');
      if (!parserError) {
        const animeNodes = xmlDoc.querySelectorAll('anime');
        if (animeNodes && animeNodes.length > 0) {
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
            const startDate = cleanDate(getText('my_start_date'));
            const finishDate = cleanDate(getText('my_finish_date'));
            const lastUpdated = parseUnix(getText('my_last_updated'));

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
                start_date: startDate,
                finish_date: finishDate,
                updated_at: lastUpdated || (finishDate ? `${finishDate}T12:00:00.000Z` : (startDate ? `${startDate}T12:00:00.000Z` : new Date().toISOString())),
                source: 'myanimelist'
              });
            }
          });
          parsedViaDOM = parsedList.length > 0;
        }
      }
    } catch (_) {}
  }

  // 2. Regex Fallback Parser (guarantees parsing even if XML is slightly malformed)
  if (!parsedViaDOM || parsedList.length === 0) {
    const animeBlocks = xmlString.match(/<anime>[\s\S]*?<\/anime>/gi) || [];
    if (animeBlocks.length === 0) {
      throw new Error('No anime entries found in the XML file.');
    }

    animeBlocks.forEach(block => {
      const getField = (tag) => {
        const match = block.match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i'));
        return match ? match[1].trim() : '';
      };

      const idMal = parseInt(getField('series_animedb_id'), 10);
      const title = getField('series_title');
      const totalEps = parseInt(getField('series_episodes'), 10) || null;
      const watchedEps = parseInt(getField('my_watched_episodes'), 10) || 0;
      const score = parseInt(getField('my_score'), 10) || 0;
      const rawStatus = getField('my_status').toLowerCase();
      const status = statusMap[rawStatus] || 'watching';
      const rewatches = parseInt(getField('my_times_watched'), 10) || 0;
      const startDate = cleanDate(getField('my_start_date'));
      const finishDate = cleanDate(getField('my_finish_date'));
      const lastUpdated = parseUnix(getField('my_last_updated'));

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
          start_date: startDate,
          finish_date: finishDate,
          updated_at: lastUpdated || (finishDate ? `${finishDate}T12:00:00.000Z` : (startDate ? `${startDate}T12:00:00.000Z` : new Date().toISOString())),
          source: 'myanimelist'
        });
      }
    });
  }

  return parsedList;
}

/**
 * Fetches public anime library for any AniList username
 * Fully syncs watch dates (startedAt, completedAt, updatedAt) for heatmaps & history
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

  const formatFuzzyDate = (d) => {
    if (!d || !d.year) return null;
    const y = d.year;
    const m = d.month ? String(d.month).padStart(2, '0') : '01';
    const day = d.day ? String(d.day).padStart(2, '0') : '01';
    return `${y}-${m}-${day}`;
  };

  lists.forEach(list => {
    (list.entries || []).forEach(entry => {
      const media = entry.media;
      if (!media || !media.id) return;

      const title = media.title?.english || media.title?.romaji || media.title?.userPreferred || 'Anime';
      const coverUrl = media.coverImage?.large || media.coverImage?.medium || '';
      const mappedStatus = statusMap[entry.status] || 'watching';

      const startDate = formatFuzzyDate(entry.startedAt);
      const finishDate = formatFuzzyDate(entry.completedAt);
      const updatedAtIso = entry.updatedAt ? new Date(entry.updatedAt * 1000).toISOString() : (finishDate ? `${finishDate}T12:00:00.000Z` : (startDate ? `${startDate}T12:00:00.000Z` : new Date().toISOString()));

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
        episodes_watched: entry.progress || (mappedStatus === 'completed' ? (media.episodes || 12) : 0),
        score: entry.score ? Math.round(entry.score) : 0,
        status: mappedStatus,
        rewatch_count: entry.repeat || 0,
        start_date: startDate,
        finish_date: finishDate,
        updated_at: updatedAtIso,
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
 * Auto-enriches MAL entries with canonical AniList IDs, covers, and creates full historical timeline logs
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
    if (onProgress) onProgress(0, items.length, 'Matching AniList covers & metadata...');
    processItems = await enrichMalEntriesWithAniList(items, onProgress);
  }

  // 2. Batch Upsert into Watchlist with preserved dates
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
