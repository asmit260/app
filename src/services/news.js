// News Service with resilient live fallback

import { anilistQuery, POPULAR_DISCUSSIONS_QUERY } from './anilist';

export async function fetchLiveNews() {
  try {
    const res = await fetch(`/api/news?t=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.items && data.items.length > 0) {
        return data.items;
      }
    }
  } catch (err) {
    console.warn("[News] Local API not reachable, falling back to AniList discussions...", err);
  }

  // Fallback to AniList discussions
  try {
    const res = await anilistQuery(POPULAR_DISCUSSIONS_QUERY);
    if (res?.Page?.threads) {
      const threadsWithMedia = res.Page.threads.filter(t => t.mediaCategories && t.mediaCategories.length > 0);
      return threadsWithMedia.slice(0, 8).map(t => ({
        title: t.title,
        link: t.siteUrl,
        imageUrl: t.mediaCategories[0]?.coverImage?.medium || '',
        timeAgo: formatTimeAgo(t.repliedAt || t.createdAt)
      }));
    }
  } catch (e) {
    console.error("[News] Fallback failed:", e);
  }

  return [];
}

function formatTimeAgo(timestamp) {
  if (!timestamp) return 'Recently';
  const seconds = Math.floor(Date.now() / 1000) - timestamp;
  if (seconds < 3600) return `${Math.max(1, Math.floor(seconds / 60))}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  const days = Math.floor(seconds / 86400);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}
