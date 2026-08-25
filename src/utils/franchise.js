// Intelligent Anime Franchise Normalizer & Grouping Engine
// Detects and aggregates individual seasons, cours, movies, OVAs, and arcs into unified franchise hubs

export function getFranchiseKey(rawTitle) {
  if (!rawTitle) return '';
  let str = rawTitle.trim();

  // 1. Strip Demon Slayer specific arc subtitles
  str = str.replace(/Demon Slayer:\s*Kimetsu no Yaiba.*$/i, 'Demon Slayer: Kimetsu no Yaiba');

  // 2. Strip "The Final Season", "Final Season", "Final Chapters", "Final Chapter", "Final Arc"
  str = str.replace(/[:\-]?\s*(The\s+)?Final\s+(Season|Chapter|Chapters|Part|Act|Arc).*$/i, '');

  // 3. Strip Season & Cour indicators: "Season 2", "2nd Season", "Part 2", "2nd Cour"
  str = str
    .replace(/[:\-]?\s*Season\s+\d+.*$/i, '')
    .replace(/[:\-]?\s*\d+(st|nd|rd|th)\s+Season.*$/i, '')
    .replace(/[:\-]?\s*(Part|Cour)\s+\d+.*$/i, '')
    .replace(/[:\-]?\s*\d+(st|nd|rd|th)\s+(Part|Cour).*$/i, '');

  // 4. Strip Roman Numerals at end (II, III, IV, V, VI, VII, VIII, IX, X)
  str = str.replace(/\s+(II|III|IV|V|VI|VII|VIII|IX|X)\b.*$/i, '');

  // 5. Strip trailing standalone numbers (e.g. "Jujutsu Kaisen 0", "KonoSuba 3")
  str = str.replace(/\s+\d+\b.*$/i, '');

  // 6. Strip standard OVA / OAD / Special / Movie endings
  str = str.replace(/[:\-]?\s*(OVA|OAD|Special|The Movie|Movie).*$/i, '');

  // 7. Strip subtitle arc names after dash or colon
  str = str.replace(/[:\-]\s*(The\s+)?(Conflict|Arise|Reze|Mugen Train|Entertainment District|Swordsmith Village|Hashira Training|Memory Snow|The Frozen Bond|Director's Cut|Shin Henshuu-ban|Code:\s*White|Sennen Kessen-hen|Thousand-Year Blood War|To the Top|NEW WORLD).*$/i, '');

  // 8. Strip trailing Arc/Hen markers
  str = str.replace(/[:\-]?\s*(\w+\s+)*(Arc|Hen|Chapter)\b.*$/i, '');

  // 9. Strip parenthetical tags like (TV), (2024), etc.
  str = str.replace(/\s*\([^)]*\)$/, '');

  // 10. Clean trailing punctuation
  str = str.replace(/[:\-\s]+$/, '').trim();

  // 11. Known franchise colon heads
  const colonIdx = str.indexOf(':');
  if (colonIdx > 2) {
    const head = str.substring(0, colonIdx).trim();
    if (!/^(Re|Fate|Steins)$/i.test(head)) {
      if (/^Demon Slayer/i.test(head)) {
        str = "Demon Slayer: Kimetsu no Yaiba";
      } else if (/^(Bleach|Dr\.\s*STONE|Spy\s*x\s*Family|Mushoku Tensei|Chainsaw Man|Solo Leveling|KonoSuba|Attack on Titan|Haikyuu!!|Jujutsu Kaisen|Boku no Hero Academia|My Hero Academia)$/i.test(head)) {
        str = head;
      }
    }
  }

  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function getFranchiseDisplayTitle(items) {
  if (!items || items.length === 0) return 'Franchise';
  
  // Find the earliest or shortest canonical title
  const sorted = [...items].sort((a, b) => {
    const lenA = (a.anime_title || '').length;
    const lenB = (b.anime_title || '').length;
    return lenA - lenB;
  });
  
  const shortest = sorted[0]?.anime_title || '';
  let cleaned = shortest
    .replace(/Demon Slayer:\s*Kimetsu no Yaiba.*$/i, 'Demon Slayer: Kimetsu no Yaiba')
    .replace(/[:\-]?\s*(The\s+)?Final\s+(Season|Chapter|Chapters|Part|Act|Arc).*$/i, '')
    .replace(/[:\-]?\s*Season\s+\d+.*$/i, '')
    .replace(/[:\-]?\s*\d+(st|nd|rd|th)\s+Season.*$/i, '')
    .replace(/[:\-]?\s*(Part|Cour)\s+\d+.*$/i, '')
    .replace(/\s+(II|III|IV|V|VI|VII|VIII|IX|X)\b.*$/i, '')
    .replace(/[:\-]?\s*(OVA|OAD|Special|The Movie|Movie).*$/i, '')
    .replace(/[:\-]\s*(The\s+)?(Conflict|Arise|Reze|Mugen Train|Entertainment District|Swordsmith Village|Hashira Training|Memory Snow|The Frozen Bond|Director's Cut|Shin Henshuu-ban|Code:\s*White|Sennen Kessen-hen|Thousand-Year Blood War|To the Top|NEW WORLD).*$/i, '')
    .replace(/[:\-\s]+$/, '')
    .trim();

  // If cleaned is too short (e.g. less than 4 chars or chopped mid-word), fallback to shortest
  if (!cleaned || (cleaned.length < 4 && shortest.length >= 4)) {
    cleaned = shortest.replace(/[:\-]?\s*Season\s+\d+.*$/i, '').trim();
  }

  return cleaned || shortest;
}

export function getSeasonSubtitle(rawTitle, franchiseTitle) {
  if (!rawTitle) return 'Season 1';
  let t = rawTitle.trim();
  
  // Try removing the franchiseTitle from the start
  if (franchiseTitle && t.toLowerCase().startsWith(franchiseTitle.toLowerCase())) {
    let remainder = t.substring(franchiseTitle.length).replace(/^[:\-\s]+/, '').replace(/[:\-\s]+$/, '').trim();
    if (remainder) {
      if (/^(II|III|IV|V|VI|VII|VIII|IX|X)\b/i.test(remainder)) {
        return 'Season ' + remainder;
      }
      return remainder;
    }
  }

  // Common pattern matches if franchise prefix didn't match cleanly
  const finalMatch = t.match(/(The\s+)?Final\s+(Season|Chapters?|Part|Act|Arc)[^)]*/i);
  if (finalMatch) return finalMatch[0].trim();

  const seasonPartMatch = t.match(/Season\s+\d+(\s+Part\s+\d+)?/i);
  if (seasonPartMatch) return seasonPartMatch[0].trim();

  const ordSeasonMatch = t.match(/\d+(st|nd|rd|th)\s+Season(\s+Part\s+\d+)?/i);
  if (ordSeasonMatch) return ordSeasonMatch[0].trim();

  const partMatch = t.match(/(Part|Cour)\s+\d+/i);
  if (partMatch) return partMatch[0].trim();

  const movieMatch = t.match(/(The\s+Movie|Movie)[^)]*/i);
  if (movieMatch) return movieMatch[0].trim();

  const ovaMatch = t.match(/(OVA|OAD|Special|Memory Snow|The Frozen Bond)[^)]*/i);
  if (ovaMatch) return ovaMatch[0].trim();

  const romanMatch = t.match(/\s+(II|III|IV|V|VI|VII|VIII|IX|X)\b/i);
  if (romanMatch) return 'Season ' + romanMatch[1].trim();

  return 'Season 1';
}

/**
 * Group a flat watchlist array into Franchise Groups
 * Returns an array of franchise objects:
 * {
 *   franchiseKey: string,
 *   title: string,
 *   cover: string,
 *   items: Array<WatchlistItem>,
 *   isMultiSeason: boolean,
 *   totalWatched: number,
 *   totalEps: number | null,
 *   progressPercent: number,
 *   overallStatus: string,
 *   hasAiring: boolean,
 *   latestUpdatedAt: string
 * }
 */
export function groupWatchlistByFranchise(watchlist = []) {
  if (!watchlist || watchlist.length === 0) return [];

  const groupsMap = new Map();

  watchlist.forEach(item => {
    const title = item.anime_title || item.title || 'Unknown Title';
    const key = getFranchiseKey(title) || `anime_${item.anime_id || item.id}`;

    if (!groupsMap.has(key)) {
      groupsMap.set(key, {
        franchiseKey: key,
        items: []
      });
    }
    groupsMap.get(key).items.push(item);
  });

  const franchiseList = [];

  for (const group of groupsMap.values()) {
    // Sort seasons chronologically / naturally by anime_id or start_date
    const items = group.items.sort((a, b) => {
      const idA = Number(a.anime_id || a.id || 0);
      const idB = Number(b.anime_id || b.id || 0);
      return idA - idB;
    });

    const displayTitle = getFranchiseDisplayTitle(items);
    // Representative cover (first season or latest active)
    const cover = items[0]?.anime_cover || items[0]?.anime_cover_image || items[0]?.coverImage || '';

    // Calculate aggregated franchise totals
    let totalWatched = 0;
    let totalEps = 0;
    let hasNullTotal = false;
    let hasWatching = false;
    let allCompleted = true;
    let latestUpdate = 0;

    items.forEach(it => {
      const watched = Number(it.episodes_watched) || 0;
      totalWatched += watched;

      const eps = Number(it.total_episodes) || Number(it.episodes) || null;
      if (eps) {
        totalEps += eps;
      } else {
        hasNullTotal = true;
        totalEps += watched; // fallback
      }

      if (it.status === 'watching') hasWatching = true;
      if (it.status !== 'completed') allCompleted = false;

      const upTime = new Date(it.updated_at || it.created_at || 0).getTime();
      if (upTime > latestUpdate) latestUpdate = upTime;
    });

    const finalTotalEps = hasNullTotal && totalEps === 0 ? null : totalEps;
    const progressPercent = finalTotalEps && finalTotalEps > 0
      ? Math.min(100, Math.round((totalWatched / finalTotalEps) * 100))
      : (totalWatched > 0 ? 100 : 0);

    const overallStatus = hasWatching 
      ? 'watching' 
      : (allCompleted ? 'completed' : (items[0]?.status || 'watching'));

    franchiseList.push({
      franchiseKey: group.franchiseKey,
      title: displayTitle,
      cover,
      items,
      isMultiSeason: items.length > 1,
      seasonCount: items.length,
      totalWatched,
      totalEps: finalTotalEps,
      progressPercent,
      overallStatus,
      latestUpdatedAt: latestUpdate
    });
  }

  // Sort franchises by recently updated
  return franchiseList.sort((a, b) => b.latestUpdatedAt - a.latestUpdatedAt);
}
