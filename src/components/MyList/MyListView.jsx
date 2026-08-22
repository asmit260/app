import React, { useState, useMemo } from 'react';
import { Film, LayoutGrid, List, Columns2, ArrowUpDown } from 'lucide-react';
import WatchlistCard from './WatchlistCard';
import QuickEpisodeModal from '../Common/QuickEpisodeModal';
import { startRewatch, upsertWatchlistEntry } from '../../services/storage';

const STATUS_CONFIG = [
  { id: 'all', label: 'All', icon: '✨' },
  { id: 'watching', label: 'Watching', icon: '🔥' },
  { id: 'completed', label: 'Completed', icon: '🏆' },
  { id: 'plan_to_watch', label: 'Plan', icon: '📌' },
  { id: 'on_hold', label: 'On Hold', icon: '⏸️' },
  { id: 'dropped', label: 'Dropped', icon: '🛑' }
];

export default function MyListView({ 
  watchlist = [], 
  onUpdateStatus, 
  onIncrementEpisode, 
  onRemoveItem, 
  onSelectAnime,
  titleLanguage = 'english'
}) {
  const [activeStatus, setActiveStatus] = useState('all');
  const [sortBy, setSortBy] = useState('updated_at'); // 'updated_at' | 'progress_desc' | 'score' | 'title'
  const [viewMode, setViewMode] = useState('compact'); // 'compact' | 'dense' | 'grid'
  const [pickerAnime, setPickerAnime] = useState(null);

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

  // Filtered & Sorted Watchlist Items
  const filteredList = useMemo(() => {
    return watchlist.filter(item => {
      return activeStatus === 'all' || item.status === activeStatus;
    }).sort((a, b) => {
      if (sortBy === 'title') {
        return (a.anime_title || '').localeCompare(b.anime_title || '');
      }
      if (sortBy === 'score') {
        return (b.score || 0) - (a.score || 0);
      }
      if (sortBy === 'progress_desc') {
        const aPct = a.total_episodes ? (a.episodes_watched || 0) / a.total_episodes : 0;
        const bPct = b.total_episodes ? (b.episodes_watched || 0) / b.total_episodes : 0;
        return bPct - aPct;
      }
      return new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0);
    });
  }, [watchlist, activeStatus, sortBy]);

  // Direct episode stepper handler
  const handleStepEpisode = async (animeId, nextEp, nextStatus) => {
    const item = watchlist.find(i => (i.anime_id == animeId || i.id == animeId));
    if (!item) return;

    const fullAnime = {
      id: animeId,
      title: item.anime_title,
      anime_title: item.anime_title,
      coverImage: item.anime_cover,
      anime_cover: item.anime_cover,
      genres: item.genres,
      duration: item.duration,
      totalEpisodes: item.total_episodes,
      episodes: item.total_episodes,
      score: item.score,
      rewatch_count: item.rewatch_count || 0
    };

    await upsertWatchlistEntry(fullAnime, nextStatus || item.status, nextEp);
  };

  // Direct start rewatch
  const handleStartRewatch = async (item) => {
    if (window.confirm(`Start a new rewatch cycle for "${item.anime_title}"? (Lifetime stats and previous completions will be preserved!)`)) {
      await startRewatch(item);
    }
  };

  const handleConfirmPickerEpisodes = async (selectedEp) => {
    if (!pickerAnime) return;
    const animeId = pickerAnime.anime_id || pickerAnime.id;
    const isFinished = pickerAnime.total_episodes && selectedEp >= pickerAnime.total_episodes;
    await handleStepEpisode(animeId, selectedEp, isFinished ? 'completed' : pickerAnime.status);
    setPickerAnime(null);
  };

  return (
    <div className="space-y-3.5 pb-20">

      {/* ═══ HEADER & CONTROLS CARD ═══ */}
      <div className="card-manga-panel p-3.5 bg-sand-50 dark:bg-sand-200 rounded-lg border-2 border-stone-900 shadow-[3px_3px_0px_0px_rgba(24,19,13,1)] space-y-3">
        
        {/* Row 1: Title & Layout Switcher */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="font-display font-black text-lg sm:text-xl text-ink-900 uppercase tracking-tight truncate">
              My Watchlist
            </h1>
            <span className="bg-stone-900 text-amber-400 dark:bg-sand-300 dark:text-stone-900 text-[10px] font-mono font-black px-2 py-0.5 rounded-full border border-stone-900 shrink-0">
              {watchlist.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center bg-sand-100 dark:bg-sand-300 p-0.5 rounded-md border-2 border-stone-900 shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)]">
              <button
                onClick={() => setViewMode('compact')}
                className={`p-1.5 rounded transition-all ${viewMode === 'compact' ? 'bg-amber-400 text-ink-900 font-black shadow-sm' : 'text-stone-500 hover:text-ink-900'}`}
                title="Compact Card View"
              >
                <Columns2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('dense')}
                className={`p-1.5 rounded transition-all ${viewMode === 'dense' ? 'bg-amber-400 text-ink-900 font-black shadow-sm' : 'text-stone-500 hover:text-ink-900'}`}
                title="Dense List Rows"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded transition-all ${viewMode === 'grid' ? 'bg-amber-400 text-ink-900 font-black shadow-sm' : 'text-stone-500 hover:text-ink-900'}`}
                title="Poster Bookshelf Grid"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Horizontally Scrollable Status Chips & Sort Controls */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-900/10 dark:border-stone-100/10">
          <div className="flex gap-1.5 overflow-x-auto hide-scrollbar flex-grow py-0.5">
            {STATUS_CONFIG.map(tab => {
              const count = statusCounts[tab.id] || 0;
              const isSelected = activeStatus === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveStatus(tab.id)}
                  className={`shrink-0 px-2.5 py-1 rounded-md text-[11px] font-black transition-all border-2 border-stone-900 flex items-center gap-1 select-none ${isSelected ? 'bg-amber-400 text-ink-900 shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)] scale-[1.02]' : 'bg-sand-100 dark:bg-sand-300 text-stone-700 hover:bg-sand-200'}`}
                >
                  <span className="text-xs">{tab.icon}</span>
                  <span>{tab.label}</span>
                  <span className="font-mono text-[9px] opacity-80">({count})</span>
                </button>
              );
            })}
          </div>

          <div className="relative shrink-0 flex items-center bg-sand-100 dark:bg-sand-300 border-2 border-stone-900 rounded-md px-1.5 py-1 shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)]">
            <ArrowUpDown className="w-3 h-3 text-stone-500 mr-1 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-[11px] font-bold text-ink-900 focus:outline-none cursor-pointer pr-1"
            >
              <option value="updated_at">Updated</option>
              <option value="progress_desc">Progress</option>
              <option value="score">Score</option>
              <option value="title">A–Z</option>
            </select>
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
          maxAiredEp={
            pickerAnime.nextAiringEpisode?.episode 
              ? Math.max(1, pickerAnime.nextAiringEpisode.episode - 1)
              : (pickerAnime.airing_episode || pickerAnime.total_episodes || 24)
          }
          onConfirm={handleConfirmPickerEpisodes}
          titleLanguage={titleLanguage}
        />
      )}

    </div>
  );
}
