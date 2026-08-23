// Real-Time MAL (MyAnimeList) Episode Ratings & Table Parser Service
// Scrapes the live MyAnimeList episode table (myanimelist.net/anime/{id}/.../episode)
// Parses all aired episode titles, air dates, and community poll vote averages (scaled 1-5 to 1-10)

const JIKAN_BASE = 'https://api.jikan.moe/v4';

/**
 * Parse raw HTML from MyAnimeList episode table into structured episodes
 */
function parseMALEpisodeHTML(html) {
  if (!html || typeof html !== 'string') return null;

  const rows = [];
  const trRegex = /<tr class="episode-list-data[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
  let match;

  while ((match = trRegex.exec(html)) !== null) {
    const rowContent = match[1];

    // 1. Episode Number
    const numMatch = rowContent.match(/<td class="episode-number[^"]*"[^>]*data-raw="(\d+)"/i) ||
                     rowContent.match(/<td class="episode-number[^"]*"[^>]*>\s*(\d+)\s*<\/td>/i);
    const epNum = numMatch ? parseInt(numMatch[1], 10) : null;
    if (!epNum) continue;

    // 2. English / Main Title
    const titleMatch = rowContent.match(/<td class="episode-title[^"]*"[^>]*>[\s\S]*?<a[^>]*class="[^"]*fw-b[^"]*"[^>]*>([\s\S]*?)<\/a>/i) ||
                       rowContent.match(/<td class="episode-title[^"]*"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i);
    const titleText = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : `Episode ${epNum}`;

    // 3. Romaji / Japanese Subtitle
    const subTitleMatch = rowContent.match(/<span class="di-ib[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
    const subTitle = subTitleMatch ? subTitleMatch[1].replace(/&nbsp;/g, ' ').replace(/<[^>]*>/g, '').trim() : null;

    // 4. Air Date
    const dateMatch = rowContent.match(/<td class="episode-aired[^"]*"[^>]*>\s*([\s\S]*?)\s*<\/td>/i);
    const airDate = dateMatch ? dateMatch[1].replace(/<[^>]*>/g, '').trim() : null;

    // 5. Poll Vote Average Score (MAL uses 1-5 scale, convert to 1-10)
    const pollRawMatch = rowContent.match(/<td class="episode-poll[^"]*"[^>]*data-raw="([\d.]+)"/i) ||
                         rowContent.match(/<span class="value">\s*([\d.]+)\s*<\/span>/i);
    const rawScore = pollRawMatch ? parseFloat(pollRawMatch[1]) : null;
    const score10 = (rawScore !== null && rawScore > 0)
      ? Number((rawScore <= 5 ? rawScore * 2 : rawScore).toFixed(1))
      : null;

    rows.push({
      episode: epNum,
      epLabel: `E${epNum.toString().padStart(2, '0')}`,
      score: score10,
      rawScore,
      title: titleText,
      titleJapanese: subTitle,
      aired: airDate,
      isAired: true
    });
  }

  return rows.length > 0 ? rows : null;
}

/**
 * Fetch live MAL episode HTML page using multi-endpoint pipeline
 */
async function fetchLiveMALEpisodes(idMal) {
  if (!idMal) return null;
  const cacheKey = `anitrack_mal_live_v1_${idMal}`;

  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) {}

  const targetUrl = `https://myanimelist.net/anime/${idMal}/_/episode`;
  const endpoints = [
    targetUrl,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
    `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`
  ];

  for (const url of endpoints) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });
      clearTimeout(timer);

      if (!res.ok) continue;
      const html = await res.text();
      if (html && html.includes('episode-list-data')) {
        const episodes = parseMALEpisodeHTML(html);
        if (episodes && episodes.length > 0) {
          try { sessionStorage.setItem(cacheKey, JSON.stringify(episodes)); } catch (_) {}
          return episodes;
        }
      }
    } catch (_) {}
  }

  // Fallback to Jikan API v4 if live scrape encounters network issues
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${JIKAN_BASE}/anime/${idMal}/episodes`, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const json = await res.json();
      if (json?.data && Array.isArray(json.data) && json.data.length > 0) {
        const jikanEps = json.data.map(item => {
          const rawScore = item.score != null && item.score > 0 ? item.score : null;
          const score10 = rawScore !== null 
            ? Number((rawScore <= 5 ? rawScore * 2 : rawScore).toFixed(1)) 
            : null;
          return {
            episode: item.mal_id,
            epLabel: `E${item.mal_id.toString().padStart(2, '0')}`,
            score: score10,
            rawScore,
            title: item.title || `Episode ${item.mal_id}`,
            titleJapanese: item.title_japanese || null,
            aired: item.aired || null,
            isAired: true
          };
        });
        try { sessionStorage.setItem(cacheKey, JSON.stringify(jikanEps)); } catch (_) {}
        return jikanEps;
      }
    }
  } catch (_) {}

  return null;
}

/**
 * Get accurate, up-to-date MAL episode ratings and counts
 */
export async function getAccurateEpisodeRatings(anime) {
  if (!anime) return { episodes: [], source: 'No Data', hasData: false };

  const isAiring = anime.status === 'RELEASING' || !!anime.nextAiringEpisode;

  // 1. Fetch live MAL episode table directly
  let malEpisodes = null;
  if (anime.idMal) {
    malEpisodes = await fetchLiveMALEpisodes(anime.idMal);
  }

  // Determine aired count directly from MAL if available
  let airedCount = 0;
  if (malEpisodes && malEpisodes.length > 0) {
    airedCount = malEpisodes.length;
  } else if (anime.nextAiringEpisode?.episode) {
    airedCount = Math.max(1, anime.nextAiringEpisode.episode - 1);
  } else if (isAiring) {
    airedCount = anime.episodes_watched ? Math.max(1, anime.episodes_watched) : (anime.episodes || 1);
  } else {
    airedCount = anime.episodes || anime.totalEpisodes || 0;
  }

  // Total planned count
  const totalPlanned = anime.episodes || anime.totalEpisodes || Math.max(12, airedCount);

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

  // 2. Build full list including unreleased upcoming episodes
  const episodes = [...malEpisodes];
  let hasAnyScore = false;

  episodes.forEach(ep => {
    if (ep.score !== null && ep.score > 0) {
      hasAnyScore = true;
    }
  });

  // Add placeholder entries for announced upcoming episodes not yet aired
  const maxListedEp = episodes.length > 0 ? Math.max(...episodes.map(e => e.episode)) : 0;
  if (totalPlanned > maxListedEp) {
    for (let i = maxListedEp + 1; i <= totalPlanned; i++) {
      episodes.push({
        episode: i,
        epLabel: `E${i.toString().padStart(2, '0')}`,
        score: null,
        title: `Episode ${i}`,
        titleJapanese: null,
        isAired: false
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
