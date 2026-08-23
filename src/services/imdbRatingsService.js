// MAL (MyAnimeList) Episode Ratings Service
// Uses Jikan API v4 — the official unofficial REST API for MyAnimeList
// Only real MAL community episode scores are displayed. No synthetic/calculated data.

const JIKAN_BASE = 'https://api.jikan.moe/v4';

/**
 * Fetch all episode pages from Jikan for a given MAL anime ID.
 * Jikan paginates at 100 episodes per page.
 */
async function fetchAllJikanEpisodes(idMal) {
  if (!idMal) return null;
  const cacheKey = `anitrack_mal_eps_v4_${idMal}`;

  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.length > 0) return parsed;
    }
  } catch (_) {}

  const allEpisodes = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= 5) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${JIKAN_BASE}/anime/${idMal}/episodes?page=${page}`, {
        signal: controller.signal
      });
      clearTimeout(timer);

      if (!res.ok) break;
      const json = await res.json();

      if (!json?.data || !Array.isArray(json.data) || json.data.length === 0) break;

      for (const item of json.data) {
        // MAL episode poll scores use a 1-5 star scale → convert to standard 10-point scale
        const rawScore = item.score != null && item.score > 0 ? item.score : null;
        const score10 = rawScore !== null 
          ? Number((rawScore <= 5 ? rawScore * 2 : rawScore).toFixed(1)) 
          : null;

        allEpisodes.push({
          episode: item.mal_id,
          score: score10,
          title: item.title || item.title_japanese || `Episode ${item.mal_id}`,
          titleJapanese: item.title_japanese || null,
          titleRomanji: item.title_romanji || null,
          aired: item.aired || null,
          filler: !!item.filler,
          recap: !!item.recap
        });
      }

      hasMore = json.pagination?.has_next_page === true;
      page++;

      // Jikan rate limit: 3 req/sec for free tier — wait 350ms between pages
      if (hasMore) await new Promise(r => setTimeout(r, 350));
    } catch (err) {
      console.warn('MAL episode fetch notice:', err);
      break;
    }
  }

  if (allEpisodes.length > 0) {
    try { sessionStorage.setItem(cacheKey, JSON.stringify(allEpisodes)); } catch (_) {}
  }

  return allEpisodes.length > 0 ? allEpisodes : null;
}

/**
 * Get real MAL episode ratings for any anime.
 * Returns ONLY genuine MyAnimeList community scores — no synthetic data.
 */
export async function getAccurateEpisodeRatings(anime) {
  if (!anime) return { episodes: [], source: 'No Data', hasData: false };

  const isAiring = anime.status === 'RELEASING' || !!anime.nextAiringEpisode;

  // Determine currently aired episode count with exact precision
  let airedCount;
  if (anime.nextAiringEpisode?.episode) {
    airedCount = Math.max(1, anime.nextAiringEpisode.episode - 1);
  } else if (isAiring) {
    airedCount = anime.episodes_watched ? Math.max(1, anime.episodes_watched) : (anime.episodes || 1);
  } else {
    airedCount = anime.episodes || anime.totalEpisodes || 0;
  }

  // Total planned episodes for the season
  const totalPlanned = anime.episodes || anime.totalEpisodes || airedCount || 12;

  // Fetch real MAL episode data via Jikan
  let malEpisodes = null;
  if (anime.idMal) {
    try {
      malEpisodes = await fetchAllJikanEpisodes(anime.idMal);
    } catch (_) {}
  }

  // No MAL data available at all
  if (!malEpisodes || malEpisodes.length === 0) {
    return {
      episodes: [],
      airedCount,
      totalCount: totalPlanned,
      isAiring,
      hasData: false,
      hasScores: false,
      source: 'MAL Rating'
    };
  }

  // Build episode list from real MAL data only
  const episodes = [];
  let hasAnyScore = false;

  for (const ep of malEpisodes) {
    const epNum = ep.episode;
    const isEpAired = !isAiring || epNum <= airedCount;

    if (ep.score !== null && ep.score > 0) {
      hasAnyScore = true;
    }

    episodes.push({
      episode: epNum,
      epLabel: `E${epNum.toString().padStart(2, '0')}`,
      score: (isEpAired && ep.score !== null && ep.score > 0) ? ep.score : null,
      title: ep.title,
      titleJapanese: ep.titleJapanese,
      isAired: isEpAired,
      filler: ep.filler,
      recap: ep.recap
    });
  }

  // Add placeholder entries for announced but not-yet-listed upcoming/unindexed episodes
  const maxListedEp = episodes.length > 0 ? Math.max(...episodes.map(e => e.episode)) : 0;
  if (totalPlanned > maxListedEp) {
    for (let i = maxListedEp + 1; i <= totalPlanned; i++) {
      const isEpAired = !isAiring || i <= airedCount;
      episodes.push({
        episode: i,
        epLabel: `E${i.toString().padStart(2, '0')}`,
        score: null,
        title: `Episode ${i}`,
        titleJapanese: null,
        isAired: isEpAired,
        filler: false,
        recap: false
      });
    }
  }

  return {
    episodes,
    airedCount,
    totalCount: Math.max(totalPlanned, episodes.length),
    isAiring,
    hasData: hasAnyScore,
    hasScores: hasAnyScore,
    source: 'MAL Rating'
  };
}
