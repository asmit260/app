import React, { useState, useMemo, useEffect } from 'react';
import { Film, LayoutGrid, List, Columns2, Sparkles, Flame, Trophy, Bookmark, PauseCircle, XCircle, Layers, ArrowUpDown, Grid3X3 } from 'lucide-react';
import WatchlistCard from './WatchlistCard';
import FranchiseCard from './FranchiseCard';
import QuickEpisodeModal from '../Common/QuickEpisodeModal';
import ConfirmModal from '../Common/ConfirmModal';
import Grid3x3Modal from '../Social/Grid3x3Modal';
import { sound } from '../../services/soundEffects';
import { startRewatch } from '../../services/storage';
import { groupWatchlistByFranchise } from '../../utils/franchise';
import { isAnimeOngoing, getMaxAiredEpisode } from '../../utils/animeRules';

const STATUS_CONFIG = [
  { id: 'all', label: 'All', icon: Sparkles },
  { id: 'watching', label: 'Watching', icon: Flame },
  { id: 'completed', label: 'Completed', icon: Trophy },
  { id: 'plan_to_watch', label: 'Plan', icon: Bookmark },
  { id: 'on_hold', label: 'On Hold', icon: PauseCircle },
  { id: 'dropped', label: 'Dropped', icon: XCircle }
];

// Helper for sorting watchlist items according to selected criteria
function sortWatchlistItems(items, sortKey) {
  return [...items].sort((a, b) => {
    if (sortKey === 'title_asc') {
      return (a.anime_title || '').localeCompare(b.anime_title || '');
    }
    if (sortKey === 'score_desc') {
      return (b.score || 0) - (a.score || 0);
    }
    if (sortKey === 'progress_desc') {
      const pA = a.total_episodes ? (Number(a.episodes_watched) || 0) / a.total_episodes : 0;
      const pB = b.total_episodes ? (Number(b.episodes_watched) || 0) / b.total_episodes : 0;
      return pB - pA;
    }
    if (sortKey === 'activity_desc') {
      return new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0);
    }
    // Default: 'added_desc'
    const timeA = new Date(a.created_at || 0).getTime() || 0;
    const timeB = new Date(b.created_at || 0).getTime() || 0;
    if (timeA && timeB && timeA !== timeB) return timeB - timeA;
    return 0;
  });
}

export default function MyListView({ 
  watchlist = [], 
  onUpdateStatus, 
  onIncrementEpisode, 
  onRemoveItem, 
  onSelectAnime,
  titleLanguage = 'english'
}) {
  const [activeStatus, setActiveStatus] = useState('all');
  const [viewMode, setViewMode] = useState('compact'); // 'compact' | 'dense' | 'grid'
  const [sortBy, setSortBy] = useState(() => {
    try {
      return localStorage.getItem('anitrack_watchlist_sort') || 'added_desc';
    } catch (_) {
      return 'added_desc';
    }
  });
  const [groupBySeries, setGroupBySeries] = useState(() => {
    try {
      const stored = localStorage.getItem('anitrack_group_series');
      return stored === null ? true : stored === 'true';
    } catch (_) {
      return true;
    }
  });
  const [pickerAnime, setPickerAnime] = useState(null);
  const [rewatchTarget, setRewatchTarget] = useState(null);
  const [show3x3Modal, setShow3x3Modal] = useState(false);

  // 1. Session-stable frozen order of anime IDs
  // When user enters this page, capture the visual order so editing episode count NEVER jumps the card!
  const [stableOrderIds, setStableOrderIds] = useState(() => {
    const initialSorted = sortWatchlistItems(watchlist, sortBy);
    return initialSorted.map(i => parseInt(i.anime_id || i.id));
  });

  // Track the set of IDs to detect only genuine additions / deletions
  const watchlistIdsKey = useMemo(() => {
    return watchlist.map(i => parseInt(i.anime_id || i.id)).sort().join(',');
  }, [watchlist]);

  useEffect(() => {
    setStableOrderIds(prevOrder => {
      const currentIds = watchlist.map(i => parseInt(i.anime_id || i.id));
      const prevSet = new Set(prevOrder);
      
      // If the exact same items exist (just episode progress/status modified), keep existing visual positions frozen!
      const isExactSameSet = currentIds.length === prevOrder.length && currentIds.every(id => prevSet.has(id));
      if (isExactSameSet) {
        return prevOrder;
      }

      // If new anime were added or items removed, compute fresh sort
      const newlySorted = sortWatchlistItems(watchlist, sortBy);
      return newlySorted.map(i => parseInt(i.anime_id || i.id));
    });
  }, [watchlistIdsKey, sortBy]);

  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    try {
      localStorage.setItem('anitrack_watchlist_sort', newSort);
    } catch (_) {}
    const reSorted = sortWatchlistItems(watchlist, newSort);
    setStableOrderIds(reSorted.map(i => parseInt(i.anime_id || i.id)));
  };

  const handleStatusChange = (statusId) => {
    setActiveStatus(statusId);
    sound.playTab();
  };

  const handleToggleGroupSeries = () => {
    setGroupBySeries(prev => {
      const next = !prev;
      try {
        localStorage.setItem('anitrack_group_series', String(next));
      } catch (_) {}
      return next;
    });
  };

  // Status counts map
  const statusCounts = useMemo(() => {
    const counts = { all: watchlist.length };
    STATUS_CONFIG.forEach(s => {
      if (s.id !== 'all') {
        counts[s.id] = watchlist.filter(i => i.status === s.id).length;
      }
    });
    return counts;
  }, [watchlist]);

  // Filtered & Stably Ordered Watchlist Items (Cards stay strictly in their place while editing episodes!)
  const filteredList = useMemo(() => {
    const itemMap = new Map();
    watchlist.forEach(item => {
      const id = parseInt(item.anime_id || item.id);
      itemMap.set(id, item);
    });

    const list = [];
    const seen = new Set();

    // 1. Follow the stable visual order established on page entry
    stableOrderIds.forEach(id => {
      const item = itemMap.get(id);
      if (item) {
        if (activeStatus === 'all' || item.status === activeStatus) {
          list.push(item);
        }
        seen.add(id);
      }
    });

    // 2. Append any newly added items not yet in stableOrderIds
    watchlist.forEach(item => {
      const id = parseInt(item.anime_id || item.id);
      if (!seen.has(id)) {
        if (activeStatus === 'all' || item.status === activeStatus) {
          list.push(item);
        }
      }
    });

    return list;
  }, [watchlist, stableOrderIds, activeStatus]);

  // Grouped Watchlist by Franchise / Series
  const franchiseGroups = useMemo(() => {
    return groupWatchlistByFranchise(filteredList);
  }, [filteredList]);

  // Direct episode stepper handler — delegates through App.jsx optimistic UI path
  const handleStepEpisode = (animeId, nextEp, nextStatus = null) => {
    const item = watchlist.find(i => parseInt(i.anime_id || i.id) === parseInt(animeId));
    if (!item) return;
    onUpdateStatus(animeId, nextStatus || item.status, item, nextEp);
  };

  // Direct start rewatch
  const handleStartRewatch = (item) => {
    setRewatchTarget(item);
  };

  const handleConfirmPickerEpisodes = (selectedEp) => {
    if (!pickerAnime) return;
    const animeId = pickerAnime.anime_id || pickerAnime.id;
    const isOngoing = isAnimeOngoing(pickerAnime);
    const isFinished = !isOngoing && pickerAnime.total_episodes && selectedEp >= pickerAnime.total_episodes;
    onUpdateStatus(animeId, isFinished ? 'completed' : pickerAnime.status, pickerAnime, selectedEp);
    setPickerAnime(null);
  };

  return (
    <div className="space-y-3.5 pb-20">

      {/* ═══ HEADER & CONTROLS CARD ═══ */}
      <div className="card-manga-panel p-3.5 bg-sand-50 dark:bg-sand-200 rounded-lg border-2 border-stone-900 shadow-[3px_3px_0px_0px_rgba(24,19,13,1)] space-y-3">
        
        {/* Row 1: Title & Controls Toolbar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="font-display font-black text-lg sm:text-xl text-ink-900 uppercase tracking-tight truncate">
              My Watchlist
            </h1>
            <span className="bg-amber-400 text-stone-950 dark:bg-amber-400 dark:text-stone-950 text-[10px] font-mono font-black px-2 py-0.5 rounded-full border border-stone-900 shrink-0">
              {groupBySeries ? `${franchiseGroups.length} Series (${watchlist.length} shows)` : watchlist.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Group by Series Hub Toggle Button */}
            <button
              onClick={handleToggleGroupSeries}
              className={`px-2.5 py-1.5 rounded-md border-2 border-stone-900 text-xs font-black flex items-center gap-1.5 transition-all shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)] select-none active:translate-y-0.5 ${
                groupBySeries 
                  ? 'bg-amber-400 text-stone-950 font-black' 
                  : 'bg-sand-100 dark:bg-sand-300 text-stone-600 dark:text-stone-300 hover:bg-sand-200'
              }`}
              title={groupBySeries ? "Series Grouping Active: Multiple seasons & OVAs are grouped under unified hubs (Click for flat list)" : "Flat List Active: Showing all entries individually (Click to group by Series)"}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{groupBySeries ? 'Grouped by Series' : 'Flat List'}</span>
            </button>

            {/* 3x3 Grid & Tier Studio Launcher */}
            <button
              onClick={() => { setShow3x3Modal(true); sound.playTab(); }}
              className="px-2.5 py-1.5 rounded-md border-2 border-stone-900 bg-sand-100 dark:bg-sand-300 hover:bg-amber-400 hover:text-stone-950 text-ink-900 text-xs font-black flex items-center gap-1.5 transition-all shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)] select-none active:translate-y-0.5"
              title="Open 3x3 Favorite Grid & Seasonal Tier Maker"
            >
              <Grid3X3 className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden md:inline">3x3 Grid</span>
            </button>

            {/* Layout switchers */}
            <div className="flex items-center bg-sand-100 dark:bg-sand-300 p-0.5 rounded-md border-2 border-stone-900 shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)]">
              <button
                onClick={() => setViewMode('compact')}
                className={`p-1.5 rounded transition-all ${viewMode === 'compact' ? 'bg-amber-400 text-stone-950 font-black shadow-sm' : 'text-stone-500 hover:text-ink-900'}`}
                title="Compact Card View"
              >
                <Columns2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('dense')}
                className={`p-1.5 rounded transition-all ${viewMode === 'dense' ? 'bg-amber-400 text-stone-950 font-black shadow-sm' : 'text-stone-500 hover:text-ink-900'}`}
                title="Dense List Rows"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded transition-all ${viewMode === 'grid' ? 'bg-amber-400 text-stone-950 font-black shadow-sm' : 'text-stone-500 hover:text-ink-900'}`}
                title="Poster Bookshelf Grid"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Sort Dropdown */}
            <div className="relative flex items-center bg-sand-100 dark:bg-sand-300 rounded-md border-2 border-stone-900 shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)] px-1.5 py-1">
              <ArrowUpDown className="w-3 h-3 text-stone-600 dark:text-stone-300 mr-1 pointer-events-none shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
                className="bg-transparent text-[11px] font-black text-ink-900 cursor-pointer focus:outline-none appearance-none pr-1"
                title="Sort Watchlist Order"
              >
                <option value="added_desc" className="bg-sand-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100">Added</option>
                <option value="title_asc" className="bg-sand-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100">Title A-Z</option>
                <option value="score_desc" className="bg-sand-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100">Top Rated</option>
                <option value="progress_desc" className="bg-sand-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100">Progress</option>
                <option value="activity_desc" className="bg-sand-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100">Activity</option>
              </select>
            </div>
          </div>
        </div>

        {/* Row 2: Full-Width Horizontally Scrollable Status Chips (Zero Clipping / Overlapping) */}
        <div className="pt-2 border-t border-stone-900/10 dark:border-stone-100/10">
          <div className="flex gap-2 overflow-x-auto hide-scrollbar py-0.5 scroll-smooth -mx-1 px-1">
            {STATUS_CONFIG.map(tab => {
              const count = statusCounts[tab.id] || 0;
              const isSelected = activeStatus === tab.id;
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleStatusChange(tab.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-black transition-all border-2 border-stone-900 flex items-center gap-1.5 select-none active:translate-y-0.5 ${
                    isSelected 
                      ? 'bg-amber-400 text-stone-950 font-black shadow-[2px_2px_0px_0px_rgba(24,19,13,1)] scale-[1.02]' 
                      : 'bg-sand-100 dark:bg-sand-300 text-stone-700 dark:text-stone-300 hover:bg-sand-200 shadow-sm'
                  }`}
                >
                  <TabIcon className={`w-3.5 h-3.5 ${isSelected ? 'stroke-[2.5]' : ''}`} />
                  <span>{tab.label}</span>
                  <span className={`font-mono text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected 
                      ? 'bg-stone-900 text-amber-400 font-black' 
                      : 'bg-stone-900/10 dark:bg-stone-700/60 text-stone-700 dark:text-stone-300'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══ WATCHLIST ITEMS DISPLAY ═══ */}
      {filteredList.length === 0 ? (
        <div className="card-manga-panel p-8 text-center bg-sand-50 dark:bg-sand-200 rounded-lg border-2 border-stone-900 shadow-manga space-y-2">
          <Film className="w-10 h-10 text-stone-400 mx-auto" />
          <p className="font-display font-bold text-base text-ink-900">
            {activeStatus === 'all' ? 'Your watchlist is currently empty' : `No anime in "${activeStatus.replace('_', ' ')}"`}
          </p>
          <p className="text-xs text-stone-500 font-sans">
            Add airing anime directly from the Airing Schedule tab to track your progress.
          </p>
        </div>
      ) : groupBySeries ? (
        <div className={viewMode === 'grid' ? "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5 sm:gap-4" : viewMode === 'dense' ? "space-y-3" : "grid grid-cols-1 md:grid-cols-2 gap-3.5"}>
          {franchiseGroups.map((franchise) => (
            <FranchiseCard
              key={franchise.franchiseKey}
              franchise={franchise}
              viewMode={viewMode}
              onSelectAnime={onSelectAnime}
              onUpdateStatus={(animeId, newStatus) => onUpdateStatus(animeId, newStatus)}
              onStepEpisode={handleStepEpisode}
              onRemoveItem={onRemoveItem}
              onStartRewatch={handleStartRewatch}
              onOpenEpisodePicker={(clickedItem) => setPickerAnime(clickedItem)}
              titleLanguage={titleLanguage}
            />
          ))}
        </div>
      ) : (
        <div className={viewMode === 'grid' ? "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5 sm:gap-4" : viewMode === 'dense' ? "space-y-2" : "grid grid-cols-1 md:grid-cols-2 gap-3"}>
          {filteredList.map((item) => (
            <WatchlistCard
              key={item.anime_id || item.id}
              item={item}
              viewMode={viewMode}
              onSelectAnime={onSelectAnime}
              onUpdateStatus={(animeId, newStatus) => onUpdateStatus(animeId, newStatus)}
              onStepEpisode={handleStepEpisode}
              onRemoveItem={onRemoveItem}
              onStartRewatch={handleStartRewatch}
              onOpenEpisodePicker={(clickedItem) => setPickerAnime(clickedItem)}
              titleLanguage={titleLanguage}
            />
          ))}
        </div>
      )}

      {/* Quick Episode Picker Modal for Watchlist */}
      {pickerAnime && (
        <QuickEpisodeModal
          isOpen={!!pickerAnime}
          onClose={() => setPickerAnime(null)}
          anime={{
            id: pickerAnime.anime_id || pickerAnime.id,
            title: pickerAnime.anime_title,
            coverImage: pickerAnime.anime_cover,
            totalEpisodes: pickerAnime.total_episodes,
            status: pickerAnime.status
          }}
          currentEp={Number(pickerAnime.episodes_watched) || 1}
          maxAiredEp={getMaxAiredEpisode(pickerAnime, pickerAnime.episodes_watched)}
          onConfirm={handleConfirmPickerEpisodes}
          titleLanguage={titleLanguage}
        />
      )}

      {/* Rewatch Confirmation Dialog */}
      <ConfirmModal
        isOpen={Boolean(rewatchTarget)}
        onClose={() => setRewatchTarget(null)}
        onConfirm={async () => {
          if (rewatchTarget) await startRewatch(rewatchTarget);
        }}
        title="Start Rewatch Cycle"
        message={`Start a new rewatch cycle for "${rewatchTarget?.anime_title}"? Your lifetime stats, previous finishes, and ratings will remain safely preserved.`}
        confirmText="Start Rewatch"
        type="info"
      />

      {/* 3x3 Grid & Tier List Studio Modal */}
      <Grid3x3Modal
        isOpen={show3x3Modal}
        onClose={() => setShow3x3Modal(false)}
        watchlist={watchlist}
        titleLanguage={titleLanguage}
      />
    </div>
  );
}

