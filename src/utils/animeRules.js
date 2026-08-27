/**
 * animeRules.js
 * Centralized business logic for anime airing status, maximum aired episodes, and valid lifecycle states.
 */

/**
 * Checks if an anime is currently ongoing / unreleased (not finished airing).
 * @param {Object} anime 
 * @returns {boolean}
 */
export function isAnimeOngoing(anime) {
  if (!anime) return false;
  const mediaStatus = String(anime.media_status || anime.mediaStatus || '').toUpperCase();
  const rawStatus = String(anime.status || '').toUpperCase();
  
  if (['RELEASING', 'NOT_YET_RELEASED', 'HIATUS'].includes(mediaStatus)) {
    return true;
  }
  if (['RELEASING', 'NOT_YET_RELEASED', 'HIATUS'].includes(rawStatus)) {
    return true;
  }
  if (anime.nextAiringEpisode && typeof anime.nextAiringEpisode.episode === 'number') {
    return true;
  }
  if (anime.airing_episode && Number(anime.airing_episode) > 0 && (anime.total_episodes || anime.episodes) && Number(anime.airing_episode) < Number(anime.total_episodes || anime.episodes)) {
    return true;
  }
  if (anime.airingInfo && !anime.airingInfo.isFinished) {
    return true;
  }
  if (mediaStatus === 'FINISHED' || rawStatus === 'FINISHED') {
    return false;
  }
  return false;
}

/**
 * Calculates the exact maximum number of episodes that have currently aired.
 * @param {Object} anime 
 * @param {number|null} currentWatched 
 * @returns {number}
 */
export function getMaxAiredEpisode(anime, currentWatched = null) {
  if (!anime) return 1;
  const mediaStatus = String(anime.media_status || anime.mediaStatus || '').toUpperCase();
  const rawStatus = String(anime.status || '').toUpperCase();

  // 1. Not yet released -> 0 episodes aired
  if (mediaStatus === 'NOT_YET_RELEASED' || rawStatus === 'NOT_YET_RELEASED') {
    return 0;
  }

  // 2. Next airing episode provided by AniList schedule -> exactly episode - 1
  if (anime.nextAiringEpisode && typeof anime.nextAiringEpisode.episode === 'number') {
    return Math.max(1, anime.nextAiringEpisode.episode - 1);
  }

  // 3. Airing info object from schedule view
  if (anime.airingInfo && typeof anime.airingInfo.episode === 'number') {
    return anime.airingInfo.isAired 
      ? anime.airingInfo.episode 
      : Math.max(1, anime.airingInfo.episode - 1);
  }

  // 4. Stored airing episode metadata on watchlist item
  if (anime.airing_episode && Number(anime.airing_episode) > 0) {
    return Number(anime.airing_episode);
  }

  // 5. Finished series -> total episodes
  const total = Number(anime.totalEpisodes || anime.total_episodes || anime.episodes);
  if ((mediaStatus === 'FINISHED' || rawStatus === 'FINISHED') && total > 0) {
    return total;
  }

  // 6. If ongoing but no airing schedule available, cap to watched or total
  if (isAnimeOngoing(anime)) {
    return Math.max(1, Number(currentWatched) || 1);
  }

  if (total > 0) {
    return total;
  }

  return Math.max(1, Number(currentWatched) || 12);
}

/**
 * Returns available statuses for an anime based on whether it is finished or ongoing.
 * Ongoing anime cannot be marked as 'completed'.
 * @param {Object} anime 
 * @returns {string[]}
 */
export function getAvailableStatusIds(anime) {
  if (isAnimeOngoing(anime)) {
    return ['watching', 'plan_to_watch', 'on_hold', 'dropped'];
  }
  return ['watching', 'completed', 'plan_to_watch', 'on_hold', 'dropped'];
}
