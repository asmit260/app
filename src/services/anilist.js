// AniList GraphQL API Service with Instant 0ms Cache
const ANILIST_URL = 'https://graphql.anilist.co';
const memoryCache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 15; // 15 mins

export async function anilistQuery(query, variables = {}) {
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

  // 3. Network fetch
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
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
        // Rate limited: wait 800ms and try once more
        await new Promise(r => setTimeout(r, 800));
        const retryRes = await fetch(ANILIST_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ query, variables })
        });
        if (retryRes.ok) {
          const { data } = await retryRes.json();
          const entry = { data, timestamp: Date.now() };
          memoryCache.set(cacheKey, entry);
          return data;
        }
      }
      throw new Error(`AniList API returned ${response.status}`);
    }

    const { data } = await response.json();
    const entry = { data, timestamp: Date.now() };
    memoryCache.set(cacheKey, entry);
    try { sessionStorage.setItem(cacheKey, JSON.stringify(entry)); } catch (_) {}
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    // If network fails, fallback to stale cache if available
    if (mem?.data) return mem.data;
    try {
      const fallback = sessionStorage.getItem(cacheKey);
      if (fallback) return JSON.parse(fallback).data;
    } catch (_) {}
    console.warn("AniList network request failed:", err);
    throw err;
  }
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
