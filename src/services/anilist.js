// AniList GraphQL API Service with Instant 0ms Cache & Resilient Retries
const ANILIST_URL = 'https://graphql.anilist.co';
const memoryCache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 15; // 15 mins
const REQUEST_TIMEOUT_MS = 12000; // 12s generous timeout for mobile / high latency connections

export async function anilistQuery(query, variables = {}, retries = 2) {
  // Generate a distinct, collision-free cache key including all variable parameters
  const qName = (query.match(/(?:query|mutation)\s+(\w+)/) || [])[1] || 'query';
  const cacheKey = `anitrack_v2_${qName}_${JSON.stringify(variables)}`;

  // 1. Check in-memory cache
  const mem = memoryCache.get(cacheKey);
  if (mem && (Date.now() - mem.timestamp < CACHE_TTL_MS)) {
    return mem.data;
  }

  // 2. Check session storage cache for instant cold recovery
  try {
    const raw = sessionStorage.getItem(cacheKey);
    if (raw) {
      const stored = JSON.parse(raw);
      if (Date.now() - stored.timestamp < CACHE_TTL_MS) {
        memoryCache.set(cacheKey, stored);
        return stored.data;
      }
    }
  } catch (_) {}

  // 3. Network fetch with auto-retry on timeout / transient network errors
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      if (attempt > 0) {
        // Backoff delay before retry
        await new Promise(r => setTimeout(r, 600 * attempt));
      }

      const response = await fetch(ANILIST_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ query, variables }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          // Rate limited: wait 1000ms and retry
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
        throw new Error(`AniList API returned status ${response.status}`);
      }

      const { data, errors } = await response.json();
      if (errors && errors.length > 0 && !data) {
        throw new Error(errors[0]?.message || 'GraphQL query error');
      }

      const entry = { data, timestamp: Date.now() };
      memoryCache.set(cacheKey, entry);
      try { sessionStorage.setItem(cacheKey, JSON.stringify(entry)); } catch (_) {}
      return data;
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;

      // If aborted by timeout, continue to retry
      const isAbort = err.name === 'AbortError' || err.message?.includes('aborted');
      if (attempt < retries) {
        console.warn(`AniList query attempt ${attempt + 1} failed (${isAbort ? 'Timeout' : err.message}). Retrying...`);
        continue;
      }
    }
  }

  // 4. Fallback to stale cache if available before throwing
  if (mem?.data) {
    console.warn("Using stale in-memory cache for AniList query:", cacheKey);
    return mem.data;
  }
  try {
    const fallback = sessionStorage.getItem(cacheKey);
    if (fallback) {
      const parsed = JSON.parse(fallback);
      if (parsed?.data) {
        console.warn("Using stale sessionStorage cache for AniList query:", cacheKey);
        return parsed.data;
      }
    }
  } catch (_) {}

  // Format a friendly error message
  if (lastError?.name === 'AbortError' || lastError?.message?.includes('aborted')) {
    throw new Error('Connection timed out while reaching AniList. Please check your internet connection.');
  }

  console.warn("AniList network request failed:", lastError);
  throw lastError || new Error('Failed to reach AniList servers.');
}

export const WEEKLY_AIRING_SCHEDULE_QUERY = `
query GetSchedule($airingAt_greater: Int, $airingAt_lesser: Int, $page: Int) {
  Page(page: $page, perPage: 50) {
    pageInfo {
      hasNextPage
    }
    airingSchedules(
      airingAt_greater: $airingAt_greater
      airingAt_lesser: $airingAt_lesser
      sort: TIME
    ) {
      id
      airingAt
      timeUntilAiring
      episode
      media {
        id
        title {
          romaji
          english
          native
        }
        coverImage {
          large
          medium
          color
        }
        bannerImage
        format
        status
        episodes
        duration
        averageScore
        popularity
        genres
        studios(isMain: true) {
          nodes {
            name
          }
        }
      }
    }
  }
}`;

export const SEARCH_ANIME_QUERY = `
query SearchAnime($search: String, $page: Int, $sort: [MediaSort]) {
  Page(page: $page, perPage: 24) {
    media(search: $search, type: ANIME, sort: $sort, isAdult: false) {
      id
      title {
        romaji
        english
        native
      }
      coverImage {
        large
        medium
        color
      }
      bannerImage
      format
      status
      episodes
      duration
      averageScore
      popularity
      genres
      description(asHtml: false)
      nextAiringEpisode {
        airingAt
        timeUntilAiring
        episode
      }
      studios(isMain: true) {
        nodes {
          name
        }
      }
    }
  }
}`;

export const EXPLORE_VIBE_QUERY = `
query ExploreVibe($genre: String, $page: Int) {
  Page(page: $page, perPage: 24) {
    media(
      type: ANIME
      genre_in: [$genre]
      format: TV
      sort: SCORE_DESC
      isAdult: false
    ) {
      id
      title {
        romaji
        english
        native
      }
      coverImage {
        large
        medium
        color
      }
      averageScore
      episodes
      status
      genres
      description(asHtml: false)
      nextAiringEpisode {
        airingAt
        timeUntilAiring
        episode
      }
      studios(isMain: true) {
        nodes {
          name
        }
      }
    }
  }
}`;

export const POPULAR_DISCUSSIONS_QUERY = `
query PopularDiscussions {
  Page(page: 1, perPage: 15) {
    threads(sort: REPLIED_AT_DESC, categoryId: 5) {
      id
      title
      replyCount
      viewCount
      siteUrl
      mediaCategories {
        id
        title { romaji english }
        coverImage { medium color }
      }
      user {
        name
        avatar { medium }
      }
      body(asHtml: false)
      createdAt
      repliedAt
    }
  }
}`;

export const ANIME_DETAIL_QUERY = `
query GetAnimeDetail($id: Int) {
  Media(id: $id, type: ANIME) {
    id
    idMal
    title {
      romaji
      english
      native
    }
    coverImage {
      large
      extraLarge
      color
    }
    bannerImage
    format
    status
    episodes
    duration
    season
    seasonYear
    averageScore
    meanScore
    popularity
    favourites
    genres
    tags {
      name
      rank
      isMediaSpoiler
    }
    description(asHtml: false)
    trailer {
      id
      site
      thumbnail
    }
    externalLinks {
      id
      url
      site
      icon
      color
      type
    }
    nextAiringEpisode {
      airingAt
      timeUntilAiring
      episode
    }
    studios(isMain: true) {
      nodes {
        id
        name
      }
    }
    streamingEpisodes {
      title
      thumbnail
      url
      site
    }
    recommendations(page: 1, perPage: 6, sort: RATING_DESC) {
      nodes {
        mediaRecommendation {
          id
          title {
            english
            romaji
          }
          coverImage {
            large
          }
          averageScore
        }
      }
    }
  }
}`;

export const EXPLORE_PAGE_QUERY = `
query GetExploreContent($season: MediaSeason, $seasonYear: Int) {
  trending: Page(page: 1, perPage: 12) {
    media(sort: TRENDING_DESC, type: ANIME, isAdult: false) {
      id
      title { romaji english native }
      coverImage { large color }
      bannerImage
      format
      status
      episodes
      averageScore
      popularity
      genres
      nextAiringEpisode {
        airingAt
        timeUntilAiring
        episode
      }
    }
  }
  topRated: Page(page: 1, perPage: 12) {
    media(sort: SCORE_DESC, type: ANIME, isAdult: false) {
      id
      title { romaji english native }
      coverImage { large color }
      bannerImage
      format
      status
      episodes
      averageScore
      popularity
      genres
      nextAiringEpisode {
        airingAt
        timeUntilAiring
        episode
      }
    }
  }
  movies: Page(page: 1, perPage: 12) {
    media(format: MOVIE, sort: SCORE_DESC, type: ANIME, isAdult: false) {
      id
      title { romaji english native }
      coverImage { large color }
      bannerImage
      format
      status
      episodes
      averageScore
      popularity
      genres
      nextAiringEpisode {
        airingAt
        timeUntilAiring
        episode
      }
    }
  }
  popularThisSeason: Page(page: 1, perPage: 12) {
    media(season: $season, seasonYear: $seasonYear, sort: POPULARITY_DESC, type: ANIME, isAdult: false) {
      id
      title { romaji english native }
      coverImage { large color }
      bannerImage
      format
      status
      episodes
      averageScore
      popularity
      genres
      nextAiringEpisode {
        airingAt
        timeUntilAiring
        episode
      }
    }
  }
}`;

export async function prefetchInitialData() {
  const now = new Date();
  const targetStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const targetEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  return Promise.allSettled([
    anilistQuery(WEEKLY_AIRING_SCHEDULE_QUERY, {
      airingAt_greater: Math.floor(targetStart.getTime() / 1000),
      airingAt_lesser: Math.floor(targetEnd.getTime() / 1000),
      page: 1
    }).catch(() => null),
    anilistQuery(POPULAR_DISCUSSIONS_QUERY).catch(() => null)
  ]);
}
