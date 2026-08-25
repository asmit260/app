// Intelligent Dynamic Anime Franchise Normalizer & Grouping Engine
// Uses linguistic tokenization, prefix containment, and anime syntax analysis to group any franchise dynamically without hardcoded lists

const NOISE_PATTERNS = [
  // Parentheses / Brackets (e.g. (TV), (OVA), (2024), [Special])
  /\s*\([^)]*\)/g,
  /\s*\[[^\]]*\]/g,
  
  // Final markers (e.g. The Final Season, Final Chapters, Final Arc)
  /[:\-—–]?\s*(The\s+)?Final\s+(Season|Chapter|Chapters|Part|Act|Arc|Movie|Stage).*$/i,
  
  // Seasons, Cours, Parts (e.g. Season 2, 2nd Season, Part 2, Cour 2)
  /[:\-—–]?\s*Season\s+\d+(\s+Part\s+\d+)?(\s+Cour\s+\d+)?.*$/i,
  /[:\-—–]?\s*\d+(st|nd|rd|th)\s+Season(\s+Part\s+\d+)?.*$/i,
  /[:\-—–]?\s*(Part|Cour|Act|Stage)\s+\d+.*$/i,
  /[:\-—–]?\s*\d+(st|nd|rd|th)\s+(Part|Cour|Act).*$/i,

  // Roman numerals at end (e.g. II, III, IV, V, VI, VII, VIII, IX, X)
  /\s+(II|III|IV|V|VI|VII|VIII|IX|X)\b.*$/i,

  // Universal Media Formats (e.g. OVA, OAD, Special, The Movie, Film, Gekijouban, Recap, Picture Drama, Spinoff)
  /[:\-—–]?\s*(The\s+)?(OVA|OAD|Specials?|The Movie|Movie|Gekijouban|Film|Shorts?|Picture Drama|Recap|Chronicle|Summary|Chibi|Mini Anime|Spinoff|Spin-off)\b.*$/i,

  // Arc & Chapter indicators
  /[:\-—–]?\s*(\w+\s+)*(Arc|Hen|Kanketsu-hen|Ressha-hen|Kessen-hen|Geiko-hen|Sato-hen|Yuukaku-hen|Chapter)\b.*$/i,

  // Trailing numbers (e.g. "KonoSuba 2", "Jujutsu Kaisen 0")
  /\s+\d+\b.*$/
];

// Stopwords excluded during token overlap calculation
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'no', 'to', 'in', 'on', 'of', 'and', 'with', 'for', 'by', 'at', 
  'na', 'wa', 'ga', 'ni', 'wo', 'de', 'kara', 'mo', 'isekai', 'hen', 'arc'
]);

/**
 * Clean a raw anime title into its core franchise root
 */
export function cleanBaseTitle(rawTitle) {
  if (!rawTitle) return '';
  let str = rawTitle.trim();

  // Apply noise filters
  for (const pattern of NOISE_PATTERNS) {
    str = str.replace(pattern, '');
  }

  // Strip trailing punctuation
  str = str.replace(/[:\-—–\s]+$/, '').trim();

  // Handle secondary colon or dash subtitles
  const sepMatch = str.match(/^(.*?)([:\-—–])\s*(.*)$/);
  if (sepMatch) {
    const head = sepMatch[1].trim();
    // Retain head if it has a meaningful length and is not a short fragment
    if (head.length >= 5 && head.split(/\s+/).length >= 1 && !/^(Re|Fate|Dr)$/i.test(head)) {
      str = head;
    }
  }

  return str.trim() || rawTitle.trim();
}

/**
 * Alphanumeric normalized stem key for fast indexing
 */
export function getStemKey(title) {
  return (title || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9\s]/g, '') // remove punctuation
    .trim();
}

/**
 * Extract meaningful semantic word tokens
 */
function getWordTokens(stem) {
  return stem.split(/\s+/).filter(w => w.length > 1 && !STOP_WORDS.has(w));
}

/**
 * Calculate token Jaccard overlap score
 */
function tokenOverlapScore(tokensA, tokensB) {
  if (!tokensA.length || !tokensB.length) return 0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  const minLen = Math.min(tokensA.length, tokensB.length);
  return intersection / minLen;
}

/**
 * Get dynamic single franchise key
 */
export function getFranchiseKey(rawTitle) {
  if (!rawTitle) return '';
  const cleaned = cleanBaseTitle(rawTitle);
  const stem = getStemKey(cleaned);
  return stem.replace(/\s+/g, '');
}

/**
 * Get cleanest canonical display title from a list of season items
 */
export function getFranchiseDisplayTitle(items) {
  if (!items || items.length === 0) return 'Franchise';

  // Find the cleanest, shortest non-empty title
  const sorted = [...items].sort((a, b) => {
    const titleA = cleanBaseTitle(a.anime_title || a.title || '');
    const titleB = cleanBaseTitle(b.anime_title || b.title || '');
    return titleA.length - titleB.length;
  });

  const best = sorted[0];
  const cleaned = cleanBaseTitle(best?.anime_title || best?.title || '');
  return cleaned || best?.anime_title || 'Franchise';
}

/**
 * Dynamically identify the season or OVA/Movie subtitle
 */
export function getSeasonSubtitle(rawTitle, franchiseTitle) {
  if (!rawTitle) return 'Season 1';
  let t = rawTitle.trim();

  // Try extracting the remaining subtitle after removing the franchiseTitle prefix
  if (franchiseTitle && t.toLowerCase().startsWith(franchiseTitle.toLowerCase())) {
    const rem = t.substring(franchiseTitle.length).replace(/^[:\-—–\s]+/, '').replace(/[:\-—–\s]+$/, '').trim();
    if (rem) {
      if (/\b(The\s+Movie|Movie|Film|Gekijouban)\b/i.test(rem) && !/\(Movie\)/i.test(rem)) return `${rem} (Movie)`;
      if (/\b(OVA|OAD)\b/i.test(rem) && !/\(OVA\)/i.test(rem)) return `${rem} (OVA)`;
      if (/^(II|III|IV|V|VI|VII|VIII|IX|X)\b/i.test(rem)) return `Season ${rem}`;
      return rem;
    }
  }

  // Common subtitle recognizers
  if (/\b(The\s+Movie|Movie|Film|Gekijouban)\b/i.test(t)) {
    const movieMatch = t.match(/[:\-—–]\s*(The\s+Movie[:\s]*)?([^()]+?)(?:\s*\(Movie\))?$/i);
    return movieMatch ? `${movieMatch[2].trim()} (Movie)` : 'The Movie';
  }

  if (/\b(OVA|OAD)\b/i.test(t)) {
    const ovaMatch = t.match(/[:\-—–]\s*([^()]+?)(?:\s*\(OVA\))?$/i);
    return ovaMatch ? `${ovaMatch[1].trim()} (OVA)` : 'OVA / Special';
  }

  const finalMatch = t.match(/(The\s+)?Final\s+(Season|Chapters?|Part|Act|Arc)(\s+Part\s+\d+)?/i);
  if (finalMatch) return finalMatch[0].trim();

  const seasonPartMatch = t.match(/Season\s+\d+(\s+Part\s+\d+)?(\s+Cour\s+\d+)?/i);
  if (seasonPartMatch) return seasonPartMatch[0].trim();

  const ordSeasonMatch = t.match(/\d+(st|nd|rd|th)\s+Season(\s+Part\s+\d+)?/i);
  if (ordSeasonMatch) return ordSeasonMatch[0].trim();

  const partMatch = t.match(/(Part|Cour|Act)\s+\d+/i);
  if (partMatch) return partMatch[0].trim();

  const romanMatch = t.match(/\s+(II|III|IV|V|VI|VII|VIII|IX|X)\b/i);
  if (romanMatch) return 'Season ' + romanMatch[1].trim();

  // Standalone trailing numbers (e.g. 2, 3)
  const numMatch = t.match(/\s+(\d+)\b/);
  if (numMatch && parseInt(numMatch[1]) > 1 && parseInt(numMatch[1]) < 20) {
    return 'Season ' + numMatch[1];
  }

  return 'Season 1';
}

/**
 * Dynamically group a watchlist into Franchise Clusters
 * Uses prefix containment, token overlap, and stem clustering
 */
export function groupWatchlistByFranchise(watchlist = []) {
  if (!watchlist || watchlist.length === 0) return [];

  const clusters = [];

  for (const item of watchlist) {
    const rawTitle = item.anime_title || item.title || 'Unknown Title';
    const cleaned = cleanBaseTitle(rawTitle);
    const stem = getStemKey(cleaned);
    const compactKey = stem.replace(/\s+/g, '');
    const tokens = getWordTokens(stem);

    let bestCluster = null;
    let highestScore = 0;

    for (const cluster of clusters) {
      const clusterCompact = cluster.compactKey;
      const clusterTokens = cluster.tokens;

      // 1. Exact Compact Key Match
      if (compactKey === clusterCompact) {
        bestCluster = cluster;
        break;
      }

      // 2. Prefix / Substring Containment (e.g. "rezerostartinglifeinanotherworld" in "rezerostartinglifeinanotherworldmemorysnow")
      if (compactKey.startsWith(clusterCompact) || clusterCompact.startsWith(compactKey)) {
        const shorter = Math.min(compactKey.length, clusterCompact.length);
        if (shorter >= 5) {
          bestCluster = cluster;
          break;
        }
      }

      // 3. Token Overlap Similarity (≥ 75% overlap)
      const score = tokenOverlapScore(tokens, clusterTokens);
      if (score >= 0.75 && score > highestScore) {
        highestScore = score;
        bestCluster = cluster;
      }
    }

    if (bestCluster) {
      bestCluster.items.push(item);
      // Keep shortest clean title as cluster title
      if (cleaned.length < bestCluster.displayTitle.length && cleaned.length >= 3) {
        bestCluster.displayTitle = cleaned;
        bestCluster.stem = stem;
        bestCluster.compactKey = compactKey;
        bestCluster.tokens = tokens;
      }
    } else {
      clusters.push({
        displayTitle: cleaned || rawTitle,
        stem,
        compactKey: compactKey || `cluster_${clusters.length}`,
        tokens,
        items: [item]
      });
    }
  }

  // Map clusters into standardized Franchise objects
  const franchiseList = clusters.map(cluster => {
    // Sort items chronologically by anime_id or start_date
    const items = cluster.items.sort((a, b) => {
      const idA = Number(a.anime_id || a.id || 0);
      const idB = Number(b.anime_id || b.id || 0);
      return idA - idB;
    });

    const displayTitle = cluster.displayTitle;
    const cover = items[0]?.anime_cover || items[0]?.anime_cover_image || items[0]?.coverImage || '';

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
        totalEps += watched;
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

    return {
      franchiseKey: cluster.compactKey,
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
    };
  });

  return franchiseList.sort((a, b) => b.latestUpdatedAt - a.latestUpdatedAt);
}
