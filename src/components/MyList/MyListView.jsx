import React, { useState, useMemo } from 'react';
import { Plus, Search, Download, Film, LayoutGrid, List, Columns2, Sparkles, Filter, ArrowUpDown } from 'lucide-react';
import WatchlistCard from './WatchlistCard';
import AddAnimeModal from './AddAnimeModal';
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
  const [filterQuery, setFilterQuery] = useState('');
  const [sortBy, setSortBy] = useState('updated_at'); // 'updated_at' | 'progress_desc' | 'score' | 'title'
  const [viewMode, setViewMode] = useState('compact'); // 'compact' | 'dense' | 'grid'
  const [showAddModal, setShowAddModal] = useState(false);

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

  // Filtered & Sorted List
  const filteredList = useMemo(() => {
    return watchlist.filter(item => {
      const matchesStatus = activeStatus === 'all' || item.status === activeStatus;
      const title = (item.anime_title || '').toLowerCase();
      const matchesQuery = !filterQuery.trim() || title.includes(filterQuery.trim().toLowerCase());
      return matchesStatus && matchesQuery;
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
  }, [watchlist, activeStatus, filterQuery, sortBy]);

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

  // Backup Export
  const exportJson = () => {
    const dataStr = JSON.stringify(watchlist, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `anitrack_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="space-y-4 pb-20">

      {/* Header & Controls Panel */}
      <div className="card-manga-panel p-4 bg-sand-50 dark:bg-sand-200 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-black text-xl md:text-2xl text-ink-900 uppercase tracking-tight">
              My Watchlist
            </h1>
            <p className="text-xs text-stone-500 font-mono mt-0.5">
              {watchlist.length} anime tracked · {statusCounts.watching || 0} active
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Direct Add Anime Button */}
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-manga bg-amber-400 hover:bg-amber-300 text-ink-900 text-xs px-3 py-1.5 flex items-center gap-1.5 font-black shadow-[2px_2px_0px_0px_rgba(24,19,13,1)] active:translate-y-0.5"
              title="Search and Add Anime to Watchlist"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add Anime</span>
            </button>

            {/* 3-Way View Mode Selector */}
            <div className="flex items-center gap-0.5 bg-sand-200 dark:bg-sand-300 p-0.5 rounded-md border-2 border-stone-900 shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)]">
              <button
                onClick={() => setViewMode('compact')}
                className={`p-1.5 rounded transition-all ${
                  viewMode === 'compact' 
                    ? 'bg-amber-400 text-ink-900 font-black shadow-sm' 
                    : 'text-stone-600 hover:text-ink-900'
                }`}
                title="Compact Card View (Recommended)"
              >
                <Columns2 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setViewMode('dense')}
                className={`p-1.5 rounded transition-all ${
                  viewMode === 'dense' 
                    ? 'bg-amber-400 text-ink-900 font-black shadow-sm' 
                    : 'text-stone-600 hover:text-ink-900'
                }`}
                title="Dense List Rows"
              >
                <List className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded transition-all ${
                  viewMode === 'grid' 
                    ? 'bg-amber-400 text-ink-900 font-black shadow-sm' 
                    : 'text-stone-600 hover:text-ink-900'
                }`}
                title="Poster Bookshelf Grid"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>

            <button 
              onClick={exportJson}
              className="btn-manga bg-sand-100 dark:bg-sand-300 hover:bg-amber-400 text-ink-900 text-xs px-2 py-1.5 flex items-center gap-1"
              title="Export JSON Backup"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex gap-2">
          <div className="relative flex-grow">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-500" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Search in your watchlist..."
              className="w-full pl-9 pr-3 py-1.5 bg-sand-100 dark:bg-sand-300 border-2 border-stone-900 rounded-md font-sans text-xs text-ink-900 focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
          </div>

          <div className="flex items-center gap-1 bg-sand-100 dark:bg-sand-300 border-2 border-stone-900 rounded-md px-2 py-1">
            <ArrowUpDown className="w-3 h-3 text-stone-500 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-xs font-bold text-ink-900 focus:outline-none cursor-pointer"
            >
              <option value="updated_at">Recently Updated</option>
              <option value="progress_desc">Highest Progress</option>
              <option value="score">Top Score</option>
              <option value="title">Title (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Status Horizontal Pill Tabs */}
        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pt-2 border-t border-sand-300 dark:border-sand-400">
          {STATUS_CONFIG.map(tab => {
            const count = statusCounts[tab.id] || 0;
            const isSelected = activeStatus === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveStatus(tab.id)}
                className={`shrink-0 px-3 py-1 rounded-md text-xs font-black transition-all border-2 border-stone-900 flex items-center gap-1.5 select-none ${
                  isSelected
                    ? 'bg-amber-400 text-ink-900 shadow-[2px_2px_0px_0px_rgba(24,19,13,1)] scale-[1.02]'
                    : 'bg-sand-100 dark:bg-sand-300 text-stone-700 hover:bg-sand-200'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                <span className="font-mono text-[10px] opacity-80">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Watchlist Items Display */}
      {filteredList.length === 0 ? (
        <div className="card-manga-panel p-8 text-center bg-sand-50 dark:bg-sand-200 space-y-3">
          <Film className="w-10 h-10 text-stone-400 mx-auto" />
          <div>
            <p className="font-display font-bold text-base text-ink-900">
              {activeStatus === 'all' ? 'Your watchlist is currently empty' : `No anime in "${activeStatus.replace('_', ' ')}"`}
            </p>
            <p className="text-xs text-stone-500 font-sans mt-0.5">
              Search and add any anime or track airing shows in the Schedule.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-manga bg-amber-400 text-ink-900 px-4 py-2 text-xs font-black inline-flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(24,19,13,1)]"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Search & Add Anime</span>
          </button>
        </div>
      ) : viewMode === 'compact' ? (
        /* 🎴 MODE 1: COMPACT MANGA CARDS (2-Col on Tablet/Desktop, 1-Col on Mobile) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredList.map((item) => (
            <WatchlistCard
              key={item.anime_id || item.id}
              item={item}
              viewMode="compact"
              onSelectAnime={onSelectAnime}
              onUpdateStatus={(animeId, newStatus) => onUpdateStatus(animeId, newStatus)}
              onStepEpisode={handleStepEpisode}
              onRemoveItem={onRemoveItem}
              onStartRewatch={handleStartRewatch}
              titleLanguage={titleLanguage}
            />
          ))}
        </div>
      ) : viewMode === 'dense' ? (
        /* 📜 MODE 2: DENSE LIST ROWS */
        <div className="space-y-2">
          {filteredList.map((item) => (
            <WatchlistCard
              key={item.anime_id || item.id}
              item={item}
              viewMode="dense"
              onSelectAnime={onSelectAnime}
              onUpdateStatus={(animeId, newStatus) => onUpdateStatus(animeId, newStatus)}
              onStepEpisode={handleStepEpisode}
              onRemoveItem={onRemoveItem}
              onStartRewatch={handleStartRewatch}
              titleLanguage={titleLanguage}
            />
          ))}
        </div>
      ) : (
        /* 📚 MODE 3: POSTER BOOKSHELF GRID (3 Columns Mobile, 5 on Desktop) */
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5 sm:gap-4">
          {filteredList.map((item) => (
            <WatchlistCard
              key={item.anime_id || item.id}
              item={item}
              viewMode="grid"
              onSelectAnime={onSelectAnime}
              onUpdateStatus={(animeId, newStatus) => onUpdateStatus(animeId, newStatus)}
              onStepEpisode={handleStepEpisode}
              onRemoveItem={onRemoveItem}
              onStartRewatch={handleStartRewatch}
              titleLanguage={titleLanguage}
            />
          ))}
        </div>
      )}

      {/* Add Anime Search Modal */}
      <AddAnimeModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        watchlist={watchlist}
        onUpdateStatus={onUpdateStatus}
        onSelectAnime={onSelectAnime}
        titleLanguage={titleLanguage}
      />

    </div>
  );
}
