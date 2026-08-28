// Dynamic community deep-linking utilities for Reddit r/anime and MyAnimeList discussions
// Formats clean search queries matching official discussion thread title conventions

export function cleanAnimeTitleForSearch(title) {
  if (!title) return '';
  let str = typeof title === 'string' ? title : (title.english || title.romaji || title.userPreferred || '');
  return str
    .replace(/[^\w\s-]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Returns a direct search URL to the official Reddit r/anime weekly episode discussion
 * Format typically used by AutoLovewing / r/anime mods: "[Spoilers] {Anime Title} - Episode {N} discussion"
 */
export function getRedditEpisodeDiscussionUrl(animeTitle, episodeNum = null) {
  const cleanTitle = cleanAnimeTitleForSearch(animeTitle);
  if (!cleanTitle) return 'https://www.reddit.com/r/anime/';

  let query = `${cleanTitle}`;
  if (episodeNum && Number(episodeNum) > 0) {
    query += ` Episode ${episodeNum} discussion`;
  } else {
    query += ` episode discussion`;
  }

  return `https://www.reddit.com/r/anime/search/?q=${encodeURIComponent(query)}&restrict_sr=1&sort=new`;
}

/**
 * Returns a direct MyAnimeList topic forum search / discussion URL
 */
export function getMalDiscussionUrl(idMal, animeTitle, episodeNum = null) {
  if (idMal && Number(idMal) > 0) {
    return `https://myanimelist.net/forum/?animeid=${idMal}&topic=episode`;
  }
  const cleanTitle = cleanAnimeTitleForSearch(animeTitle);
  return `https://myanimelist.net/anime.php?q=${encodeURIComponent(cleanTitle)}`;
}
