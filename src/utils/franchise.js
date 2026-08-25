// Intelligent Anime Franchise Normalizer & Grouping Engine
// Detects and aggregates individual seasons, cours, movies, OVAs, OADs, specials, and arcs into unified franchise hubs

const CANONICAL_FRANCHISE_MAP = [
  { pattern: /^(Re:?\s*Zero|ReZero)/i, key: 'rezerostartinglifeinanotherworld', title: 'Re:ZERO -Starting Life in Another World-' },
  { pattern: /^(Attack on Titan|Shingeki no Kyojin)/i, key: 'attackontitan', title: 'Attack on Titan' },
  { pattern: /^(Demon Slayer|Kimetsu no Yaiba)/i, key: 'demonslayerkimetsunoyaiba', title: 'Demon Slayer: Kimetsu no Yaiba' },
  { pattern: /^(My Hero Academia|Boku no Hero Academia)/i, key: 'myheroacademia', title: 'My Hero Academia' },
  { pattern: /^(Jujutsu Kaisen)/i, key: 'jujutsukaisen', title: 'Jujutsu Kaisen' },
  { pattern: /^(KonoSuba|Kono Subarashii Sekai)/i, key: 'konosuba', title: "KonoSuba: God's Blessing on this Wonderful World!" },
  { pattern: /^(Mushoku Tensei)/i, key: 'mushokutensei', title: 'Mushoku Tensei: Jobless Reincarnation' },
  { pattern: /^(Frieren|Sousou no Frieren)/i, key: 'frieren', title: 'Frieren: Beyond Journey\'s End' },
  { pattern: /^(That Time I Got Reincarnated as a Slime|Tensei shitara Slime Datta Ken|Slime Datta Ken)/i, key: 'thattimeigotreincarnatedasaslime', title: 'That Time I Got Reincarnated as a Slime' },
  { pattern: /^(The Eminence in Shadow|Kage no Jitsuryokusha)/i, key: 'theeminenceinshadow', title: 'The Eminence in Shadow' },
  { pattern: /^(Bleach)/i, key: 'bleach', title: 'Bleach' },
  { pattern: /^(Chainsaw Man)/i, key: 'chainsawman', title: 'Chainsaw Man' },
  { pattern: /^(Spy\s*x?\s*Family)/i, key: 'spyxfamily', title: 'Spy x Family' },
  { pattern: /^(Dr\.?\s*Stone)/i, key: 'drstone', title: 'Dr. STONE' },
  { pattern: /^(Haikyuu|Haikyu)/i, key: 'haikyuu', title: 'Haikyuu!!' },
  { pattern: /^(One Punch Man|Wanpanman)/i, key: 'onepunchman', title: 'One Punch Man' },
  { pattern: /^(Sword Art Online|SAO)/i, key: 'swordartonline', title: 'Sword Art Online' },
  { pattern: /^(Vinland Saga)/i, key: 'vinlandsaga', title: 'Vinland Saga' },
  { pattern: /^(Fate\/|Fate\s+)/i, key: 'fatestaynight', title: 'Fate Series' },
  { pattern: /^(Overlord)/i, key: 'overlord', title: 'Overlord' },
  { pattern: /^(Made in Abyss)/i, key: 'madeinabyss', title: 'Made in Abyss' },
  { pattern: /^(Mob Psycho 100)/i, key: 'mobpsycho100', title: 'Mob Psycho 100' },
  { pattern: /^(Tokyo Revengers)/i, key: 'tokyorevengers', title: 'Tokyo Revengers' },
  { pattern: /^(Oshi no Ko)/i, key: 'oshinoko', title: '【OSHI NO KO】' },
  { pattern: /^(DanMachi|Dungeon ni Deai|Is It Wrong to Try to Pick Up Girls in a Dungeon)/i, key: 'danmachi', title: 'Is It Wrong to Try to Pick Up Girls in a Dungeon?' },
  { pattern: /^(Fullmetal Alchemist|Hagane no Renkinjutsushi)/i, key: 'fullmetalalchemist', title: 'Fullmetal Alchemist' },
  { pattern: /^(Steins;?\s*Gate)/i, key: 'steinsgate', title: 'Steins;Gate' },
  { pattern: /^(Gintama)/i, key: 'gintama', title: 'Gintama' },
  { pattern: /^(Code Geass)/i, key: 'codegeass', title: 'Code Geass' },
  { pattern: /^(Hunter x Hunter|Hunter \/ Hunter)/i, key: 'hunterxhunter', title: 'Hunter x Hunter' },
  { pattern: /^(JoJo's Bizarre Adventure|JoJo no Kimyou na Bouken)/i, key: 'jojosbizarreadventure', title: "JoJo's Bizarre Adventure" },
  { pattern: /^(Bungou Stray Dogs|Bungo Stray Dogs)/i, key: 'bungostraydogs', title: 'Bungou Stray Dogs' },
  { pattern: /^(Black Clover)/i, key: 'blackclover', title: 'Black Clover' },
  { pattern: /^(Kaguya-sama|Kaguya-sama wa Kokurasetai|Kaguya-sama: Love Is War)/i, key: 'kaguyasama', title: 'Kaguya-sama: Love Is War' },
  { pattern: /^(Classroom of the Elite|Youkoso Jitsuryoku)/i, key: 'classroomoftheelite', title: 'Classroom of the Elite' },
  { pattern: /^(Blue Lock)/i, key: 'bluelock', title: 'Blue Lock' },
  { pattern: /^(Hell's Paradise|Jigokuraku)/i, key: 'hellsparadise', title: "Hell's Paradise" },
  { pattern: /^(Solo Leveling|Ore dake Level Up)/i, key: 'sololeveling', title: 'Solo Leveling' },
  { pattern: /^(Kaiju No\.?\s*8|Kaijuu 8-gou)/i, key: 'kaijuno8', title: 'Kaiju No.8' },
  { pattern: /^(Bakemonogatari|Nisemonogatari|Owarimonogatari|Kizumonogatari|Monogatari Series)/i, key: 'monogatariseries', title: 'Monogatari Series' },
  { pattern: /^(Naruto|Boruto)/i, key: 'narutoseries', title: 'Naruto' },
  { pattern: /^(Dragon Ball)/i, key: 'dragonballseries', title: 'Dragon Ball' }
];

export function getFranchiseKey(rawTitle) {
  if (!rawTitle) return '';
  const trimmed = rawTitle.trim();

  // 1. Direct Canonical mapping
  for (const canon of CANONICAL_FRANCHISE_MAP) {
    if (canon.pattern.test(trimmed)) {
      return canon.key;
    }
  }

  // 2. Generic Normalizer
  let str = trimmed;

  // Strip Demon Slayer specific arc subtitles
  str = str.replace(/Demon Slayer:\s*Kimetsu no Yaiba.*$/i, 'Demon Slayer: Kimetsu no Yaiba');

  // Strip Final Season/Part/Arc/Chapters
  str = str.replace(/[:\-—–]?\s*(The\s+)?Final\s+(Season|Chapter|Chapters|Part|Act|Arc|Movie).*$/i, '');

  // Strip Season & Cour indicators
  str = str
    .replace(/[:\-—–]?\s*Season\s+\d+.*$/i, '')
    .replace(/[:\-—–]?\s*\d+(st|nd|rd|th)\s+Season.*$/i, '')
    .replace(/[:\-—–]?\s*(Part|Cour)\s+\d+.*$/i, '')
    .replace(/[:\-—–]?\s*\d+(st|nd|rd|th)\s+(Part|Cour).*$/i, '');

  // Strip Roman Numerals at end (II, III, IV, V, VI, VII, VIII, IX, X)
  str = str.replace(/\s+(II|III|IV|V|VI|VII|VIII|IX|X)\b.*$/i, '');

  // Strip standalone trailing number
  str = str.replace(/\s+\d+\b.*$/i, '');

  // Strip standard OVA / OAD / Special / Movie / Spinoff / Recap
  str = str.replace(/[:\-—–]?\s*(The\s+)?(OVA|OAD|Specials?|The Movie|Movie|Gekijouban|Film|Shorts?|Picture Drama|Recap|Chibi|Mini Anime|Spinoff|Spin-off|Picture Drama)\b.*$/i, '');

  // Strip subtitle arc names after dash or colon
  str = str.replace(/[:\-—–]\s*(The\s+)?(Conflict|Arise|Reze|Mugen Train|Entertainment District|Swordsmith Village|Hashira Training|Memory Snow|The Frozen Bond|Hyouketsu no Kizuna|Director's Cut|Shin Henshuu-ban|Code:\s*White|Sennen Kessen-hen|Thousand-Year Blood War|To the Top|NEW WORLD|Legend of Crimson|Kurenai Densetsu|No Regrets|Kuinaki Sentaku|Ilse's Notebook|Lost Girls|Chronicle).*$/i, '');

  // Strip trailing Arc/Hen/Chapter markers
  str = str.replace(/[:\-—–]?\s*(\w+\s+)*(Arc|Hen|Chapter)\b.*$/i, '');

  // Strip parenthetical tags like (TV), (OVA), (2024), etc.
  str = str.replace(/\s*\([^)]*\)$/, '');

  // Clean trailing punctuation
  str = str.replace(/[:\-—–\s]+$/, '').trim();

  // Known franchise colon heads
  const colonIdx = str.indexOf(':');
  if (colonIdx > 2) {
    const head = str.substring(0, colonIdx).trim();
    if (!/^(Re|Fate|Steins)$/i.test(head)) {
      str = head;
    }
  }

  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function getFranchiseDisplayTitle(items) {
  if (!items || items.length === 0) return 'Franchise';
  
  // Check if any item matches a known canonical title
  for (const item of items) {
    const title = item.anime_title || '';
    for (const canon of CANONICAL_FRANCHISE_MAP) {
      if (canon.pattern.test(title)) {
        return canon.title;
      }
    }
  }

  // Find the earliest or shortest title
  const sorted = [...items].sort((a, b) => {
    const lenA = (a.anime_title || '').length;
    const lenB = (b.anime_title || '').length;
    return lenA - lenB;
  });
  
  const shortest = sorted[0]?.anime_title || '';
  let cleaned = shortest
    .replace(/Demon Slayer:\s*Kimetsu no Yaiba.*$/i, 'Demon Slayer: Kimetsu no Yaiba')
    .replace(/[:\-—–]?\s*(The\s+)?Final\s+(Season|Chapter|Chapters|Part|Act|Arc|Movie).*$/i, '')
    .replace(/[:\-—–]?\s*Season\s+\d+.*$/i, '')
    .replace(/[:\-—–]?\s*\d+(st|nd|rd|th)\s+Season.*$/i, '')
    .replace(/[:\-—–]?\s*(Part|Cour)\s+\d+.*$/i, '')
    .replace(/\s+(II|III|IV|V|VI|VII|VIII|IX|X)\b.*$/i, '')
    .replace(/[:\-—–]?\s*(The\s+)?(OVA|OAD|Specials?|The Movie|Movie|Gekijouban|Film|Shorts?|Picture Drama|Recap|Chibi|Mini Anime|Spinoff|Spin-off).*$/i, '')
    .replace(/[:\-—–]\s*(The\s+)?(Conflict|Arise|Reze|Mugen Train|Entertainment District|Swordsmith Village|Hashira Training|Memory Snow|The Frozen Bond|Hyouketsu no Kizuna|Director's Cut|Shin Henshuu-ban|Code:\s*White|Sennen Kessen-hen|Thousand-Year Blood War|To the Top|NEW WORLD|Legend of Crimson|No Regrets).*$/i, '')
    .replace(/[:\-—–\s]+$/, '')
    .trim();

  if (!cleaned || (cleaned.length < 4 && shortest.length >= 4)) {
    cleaned = shortest.replace(/[:\-—–]?\s*Season\s+\d+.*$/i, '').trim();
  }

  return cleaned || shortest;
}

export function getSeasonSubtitle(rawTitle, franchiseTitle) {
  if (!rawTitle) return 'Season 1';
  const t = rawTitle.trim();

  // 1. Specific Famous OVAs & Movies
  if (/Memory Snow/i.test(t)) return 'Memory Snow (OVA)';
  if (/The Frozen Bond|Hyouketsu no Kizuna/i.test(t)) return 'The Frozen Bond (Movie/OVA)';
  if (/Director's Cut|Shin Henshuu-ban/i.test(t)) return "Director's Cut";
  if (/No Regrets|Kuinaki Sentaku/i.test(t)) return 'No Regrets (OVA)';
  if (/Ilse's Notebook/i.test(t)) return "Ilse's Notebook (OVA)";
  if (/Lost Girls/i.test(t)) return 'Lost Girls (OVA)';
  if (/Legend of Crimson|Kurenai Densetsu/i.test(t)) return 'Legend of Crimson (Movie)';
  if (/An Explosion on This Wonderful World/i.test(t)) return 'Bakuen (Spin-off)';
  if (/Mugen Train|Mugen Ressha/i.test(t)) return 'Mugen Train Arc';
  if (/Entertainment District|Yuukaku-hen/i.test(t)) return 'Entertainment District Arc';
  if (/Swordsmith Village|Katanakaji/i.test(t)) return 'Swordsmith Village Arc';
  if (/Hashira Training|Hashira Geiko/i.test(t)) return 'Hashira Training Arc';
  if (/Infinity Castle/i.test(t)) return 'Infinity Castle (Movie)';
  if (/Code:?\s*White/i.test(t)) return 'Code: White (Movie)';
  if (/Jujutsu Kaisen 0/i.test(t)) return 'Jujutsu Kaisen 0 (Movie)';
  if (/Two Heroes/i.test(t)) return 'Two Heroes (Movie)';
  if (/Heroes Rising/i.test(t)) return 'Heroes Rising (Movie)';
  if (/World Heroes'? Mission/i.test(t)) return 'World Heroes\' Mission (Movie)';
  if (/You're Next/i.test(t)) return 'You\'re Next (Movie)';

  // 2. Final Season / Arcs
  const finalPartMatch = t.match(/(The\s+)?Final\s+(Season|Chapters?|Part|Act|Arc)(\s+Part\s+\d+)?(\s*-\s*The Final Chapters)?/i);
  if (finalPartMatch) return finalPartMatch[0].trim();

  // 3. Numbered Seasons & Parts
  const seasonPartMatch = t.match(/Season\s+\d+(\s+Part\s+\d+)?(\s+Cour\s+\d+)?/i);
  if (seasonPartMatch) return seasonPartMatch[0].trim();

  const ordSeasonMatch = t.match(/\d+(st|nd|rd|th)\s+Season(\s+Part\s+\d+)?(\s+Cour\s+\d+)?/i);
  if (ordSeasonMatch) return ordSeasonMatch[0].trim();

  const partMatch = t.match(/(Part|Cour)\s+\d+/i);
  if (partMatch) return partMatch[0].trim();

  // 4. General Movies & OVAs
  if (/\b(The\s+Movie|Movie|Film|Gekijouban)\b/i.test(t)) return 'The Movie';
  if (/\b(OVA|OAD)\b/i.test(t)) return 'OVA / Special';
  if (/\b(Special|Specials)\b/i.test(t)) return 'Special';
  if (/\b(Spinoff|Spin-off)\b/i.test(t)) return 'Spin-off';
  if (/\b(Recap|Chronicle)\b/i.test(t)) return 'Recap / Movie';

  // 5. Roman Numerals (II, III, IV, etc.)
  const romanMatch = t.match(/\s+(II|III|IV|V|VI|VII|VIII|IX|X)\b/i);
  if (romanMatch) return 'Season ' + romanMatch[1].trim();

  // 6. Standalone Trailing Number (e.g. KonoSuba 2)
  const numMatch = t.match(/\s+(\d+)\b/);
  if (numMatch && parseInt(numMatch[1]) > 1 && parseInt(numMatch[1]) < 20) {
    return 'Season ' + numMatch[1];
  }

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
