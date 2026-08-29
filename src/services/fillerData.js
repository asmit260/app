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

  // 3. Fetch from Jikan API if MAL ID is available (with 3.5s timeout protection)
  if (idMal && Number(idMal) > 0) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    try {
      const res = await fetch(`${JIKAN_BASE}/anime/${idMal}/episodes`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

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
      } else {
        // Log subtle debug without throwing loud errors for 504 / 404 / 429
        console.debug(`Jikan filler data unavailable (${res.status}) for MAL ID ${idMal}`);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      // Quietly absorb timeout or offline network issues
      console.debug("Jikan filler fetch skipped/timed out:", err.message || err);
    }
  }

  // 4. Default return if not a known filler anime or upstream is slow
  const defaultResult = { episodes: [], hasFiller: false };
  fillerCache.set(cacheKey, defaultResult);
  try { sessionStorage.setItem(cacheKey, JSON.stringify(defaultResult)); } catch (_) {}
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
