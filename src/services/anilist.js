// AniList GraphQL API Service

const ANILIST_URL = 'https://graphql.anilist.co';
const queryCache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 10; // 10 mins

export async function anilistQuery(query, variables = {}) {
  const cacheKey = query + JSON.stringify(variables);
  const cached = queryCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return cached.data;
  }

  const response = await fetch(ANILIST_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ query, variables })
  });

  if (!response.ok) {
    throw new Error(`AniList API returned ${response.status}`);
  }

  const { data } = await response.json();
  queryCache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
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
