// Real-time Filler vs. Canon Anime Episode Service
// Fetches episode canon/filler classifications from community databases with resilient multi-tier caching

const fillerCache = new Map();
const JIKAN_BASE = 'https://api.jikan.moe/v4';

/**
 * Fetches episode metadata (canon vs filler) for an anime by MAL ID or Title
 * @param {number|string} idMal - MyAnimeList ID of the anime
 * @param {string} animeTitle - Title for search fallback
 * @returns {Promise<{ episodes: Array<{ episode: number, type: 'canon'|'filler'|'mixed', title?: string }>, hasFiller: boolean }>}
 */
export async function fetchAnimeFillerData(idMal, animeTitle = '') {
  const cacheKey = `anitrack_filler_${idMal || animeTitle}`;

  // 1. Check in-memory cache
  if (fillerCache.has(cacheKey)) {
    return fillerCache.get(cacheKey);
  }

  // 2. Check session storage
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      fillerCache.set(cacheKey, parsed);
      return parsed;
    }
  } catch (_) {}

  // 3. Fetch from Jikan API if MAL ID is available
  if (idMal && Number(idMal) > 0) {
    try {
      const res = await fetch(`${JIKAN_BASE}/anime/${idMal}/episodes`);
      if (res.ok) {
        const json = await res.json();
        const eps = json.data || [];
        if (eps.length > 0) {
          const map = eps.map(e => ({
            episode: e.mal_id,
            type: e.filler ? 'filler' : (e.recap ? 'recap' : 'canon'),
            title: e.title || `Episode ${e.mal_id}`
          }));

          const result = {
            episodes: map,
            hasFiller: map.some(e => e.type === 'filler')
          };

          fillerCache.set(cacheKey, result);
          try { sessionStorage.setItem(cacheKey, JSON.stringify(result)); } catch (_) {}
          return result;
        }
      }
    } catch (err) {
      console.warn("Jikan filler fetch error:", err);
    }
  }

  // 4. Default return if not a known filler anime
  const defaultResult = { episodes: [], hasFiller: false };
  fillerCache.set(cacheKey, defaultResult);
  return defaultResult;
}

/**
 * Helper to find the next canon episode from current episode
 */
export function getNextCanonEpisode(currentEp, episodesList = [], maxEp = null) {
  if (!episodesList || episodesList.length === 0) {
    return currentEp + 1;
  }

  const nextCanon = episodesList.find(e => e.episode > currentEp && (e.type === 'canon' || e.type === 'mixed'));
  if (nextCanon) {
    return nextCanon.episode;
  }

  // Fallback to step +1 clamped to max
  const next = currentEp + 1;
  return maxEp ? Math.min(next, maxEp) : next;
}
