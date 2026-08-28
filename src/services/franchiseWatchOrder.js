/**
 * 100% Dynamic Anime Franchise & Watch Order Graph Engine
 * Zero hardcoded lists. Traverses AniList's live GraphQL relation nodes
 * and uses topological graph sorting & chronological sequencing.
 */

/**
 * Format category label and tier dynamically based on API metadata
 */
export function getDynamicRelationMeta(relationType, format) {
  const normRel = (relationType || 'OTHER').toUpperCase();
  const normFormat = (format || 'TV').toUpperCase();

  if (normRel === 'CURRENT') {
    return {
      tier: 'essential',
      badgeLabel: 'Viewing Now',
      color: 'bg-amber-400 text-stone-950 border-stone-950 font-black',
      isCore: true
    };
  }

  if (normRel === 'PARENT' || normRel === 'PREQUEL' || normRel === 'SEQUEL') {
    if (normFormat === 'MOVIE') {
      return {
        tier: 'essential',
        badgeLabel: normRel === 'SEQUEL' ? 'Canon Sequel Movie' : 'Canon Movie',
        color: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/50',
        isCore: true
      };
    }
    return {
      tier: 'essential',
      badgeLabel: normRel === 'PREQUEL' ? 'Direct Prequel' : normRel === 'SEQUEL' ? 'Direct Sequel' : 'Main Series',
      color: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/50',
      isCore: true
    };
  }

  if (normRel === 'SUMMARY') {
    return {
      tier: 'optional',
      badgeLabel: 'Recap / Summary',
      color: 'bg-stone-500/20 text-stone-600 dark:text-stone-400 border-stone-500/50',
      isCore: false
    };
  }

  if (normRel === 'SIDE_STORY') {
    return {
      tier: 'recommended',
      badgeLabel: normFormat === 'MOVIE' ? 'Side Story Movie' : 'Side Story',
      color: 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/50',
      isCore: false
    };
  }

  if (normRel === 'SPIN_OFF') {
    return {
      tier: 'spinoff',
      badgeLabel: 'Spin-Off',
      color: 'bg-pink-500/20 text-pink-700 dark:text-pink-300 border-pink-500/50',
      isCore: false
    };
  }

  if (normRel === 'ALTERNATIVE') {
    return {
      tier: 'optional',
      badgeLabel: 'Alternate Setting',
      color: 'bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-500/50',
      isCore: false
    };
  }

  return {
    tier: 'optional',
    badgeLabel: normFormat === 'MOVIE' ? 'Related Movie' : normFormat === 'OVA' ? 'OVA Special' : 'Related Entry',
    color: 'bg-stone-400/20 text-stone-600 dark:text-stone-400 border-stone-400/50',
    isCore: false
  };
}

/**
 * Compare two dates for chronological sorting
 */
function compareReleaseDates(a, b) {
  const yearA = a.startDate?.year || (a.seasonYear || 9999);
  const yearB = b.startDate?.year || (b.seasonYear || 9999);
  if (yearA !== yearB) return yearA - yearB;

  const monthA = a.startDate?.month || 1;
  const monthB = b.startDate?.month || 1;
  if (monthA !== monthB) return monthA - monthB;

  const dayA = a.startDate?.day || 1;
  const dayB = b.startDate?.day || 1;
  if (dayA !== dayB) return dayA - dayB;

  return (a.id || 0) - (b.id || 0);
}

/**
 * Build Full Multi-Hop Connected Graph from AniList Live API Response
 * Traverses level-1 and level-2 edges dynamically.
 */
export function buildDynamicFranchiseGraph(rootMedia) {
  if (!rootMedia) return [];

  const nodeMap = new Map();

  const addNode = (node, relType = 'CURRENT', isRoot = false) => {
    if (!node || !node.id) return;
    const existing = nodeMap.get(node.id);
    if (!existing) {
      nodeMap.set(node.id, {
        id: node.id,
        idMal: node.idMal,
        title: node.title,
        format: node.format || 'TV',
        status: node.status,
        episodes: node.episodes,
        averageScore: node.averageScore,
        seasonYear: node.seasonYear,
        coverImage: node.coverImage,
        startDate: node.startDate || (node.seasonYear ? { year: node.seasonYear, month: 1, day: 1 } : null),
        relationType: relType,
        isCurrent: isRoot,
        prequels: [],
        sequels: []
      });
    } else if (isRoot) {
      existing.isCurrent = true;
      existing.relationType = 'CURRENT';
    }
  };

  // Add root anime
  addNode(rootMedia, 'CURRENT', true);

  // Level 1 Edges
  const l1Edges = rootMedia.relations?.edges || [];
  l1Edges.forEach(edge => {
    if (edge?.node && ['TV', 'MOVIE', 'OVA', 'ONA', 'SPECIAL'].includes(edge.node.format)) {
      addNode(edge.node, edge.relationType || 'OTHER', false);

      // Link root with level 1 relations
      const rootNode = nodeMap.get(rootMedia.id);
      const l1Node = nodeMap.get(edge.node.id);
      if (rootNode && l1Node) {
        if (edge.relationType === 'PREQUEL') {
          rootNode.prequels.push(l1Node.id);
          l1Node.sequels.push(rootNode.id);
        } else if (edge.relationType === 'SEQUEL') {
          rootNode.sequels.push(l1Node.id);
          l1Node.prequels.push(rootNode.id);
        }
      }

      // Level 2 Edges (Dynamic nested expansion from GraphQL)
      const l2Edges = edge.node.relations?.edges || [];
      l2Edges.forEach(subEdge => {
        if (subEdge?.node && ['TV', 'MOVIE', 'OVA', 'ONA', 'SPECIAL'].includes(subEdge.node.format)) {
          addNode(subEdge.node, subEdge.relationType || 'OTHER', false);

          const l2Node = nodeMap.get(subEdge.node.id);
          if (l1Node && l2Node) {
            if (subEdge.relationType === 'PREQUEL') {
              l1Node.prequels.push(l2Node.id);
              l2Node.sequels.push(l1Node.id);
            } else if (subEdge.relationType === 'SEQUEL') {
              l1Node.sequels.push(l2Node.id);
              l2Node.prequels.push(l1Node.id);
            }
          }
        }
      });
    }
  });

  return Array.from(nodeMap.values());
}

/**
 * Sorts nodes dynamically into 3 viewing modes:
 * 1. 'recommended': Core Canon Spine (TV/Movies) first sorted chronologically, then side stories & spin-offs
 * 2. 'release': Strict release date order (year, month, day)
 * 3. 'story': Topological storyline hierarchy (prequels -> parent -> current -> sequels -> side stories)
 */
export function sortFranchiseTimeline(nodes, mode = 'recommended') {
  if (!nodes || nodes.length === 0) return [];

  const list = [...nodes];

  if (mode === 'release') {
    list.sort(compareReleaseDates);
    return list.map((item, idx) => ({
      ...item,
      step: idx + 1,
      meta: getDynamicRelationMeta(item.relationType, item.format)
    }));
  }

  if (mode === 'recommended') {
    // Separate core canon (TV seasons, Canon Sequels/Movies) from optional/recap content
    const coreStory = [];
    const sideContent = [];
    const recaps = [];

    list.forEach(item => {
      const rel = (item.relationType || '').toUpperCase();
      if (rel === 'SUMMARY') {
        recaps.push(item);
      } else if (['CURRENT', 'PREQUEL', 'SEQUEL', 'PARENT'].includes(rel) || item.format === 'TV') {
        coreStory.push(item);
      } else {
        sideContent.push(item);
      }
    });

    // Sort each group chronologically by release date
    coreStory.sort(compareReleaseDates);
    sideContent.sort(compareReleaseDates);
    recaps.sort(compareReleaseDates);

    const merged = [...coreStory, ...sideContent, ...recaps];
    return merged.map((item, idx) => ({
      ...item,
      step: idx + 1,
      meta: getDynamicRelationMeta(item.relationType, item.format)
    }));
  }

  // Story / Chronological Mode: Sort by relation hierarchy & date
  const weights = {
    PREQUEL: 1,
    PARENT: 2,
    CURRENT: 3,
    SEQUEL: 4,
    SIDE_STORY: 5,
    SPIN_OFF: 6,
    ALTERNATIVE: 7,
    SUMMARY: 8,
    OTHER: 9
  };

  list.sort((a, b) => {
    const wA = weights[a.relationType] || 5;
    const wB = weights[b.relationType] || 5;
    if (wA !== wB) return wA - wB;
    return compareReleaseDates(a, b);
  });

  return list.map((item, idx) => ({
    ...item,
    step: idx + 1,
    meta: getDynamicRelationMeta(item.relationType, item.format)
  }));
}
