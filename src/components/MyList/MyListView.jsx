import React, { useState } from 'react';
import { Plus, Trash2, Search, Download, Film, LayoutGrid, List } from 'lucide-react';
import AnimeCard from '../Common/AnimeCard';

const STATUS_CONFIG = [
  { id: 'all', label: 'All', color: 'bg-stone-900 text-sand-50' },
  { id: 'watching', label: 'Watching', color: 'bg-status-watching text-sand-50' },
  { id: 'completed', label: 'Completed', color: 'bg-status-completed text-sand-50' },
  { id: 'plan_to_watch', label: 'Plan to Watch', color: 'bg-status-plan text-sand-50' },
  { id: 'on_hold', label: 'On Hold', color: 'bg-status-hold text-sand-50' },
  { id: 'dropped', label: 'Dropped', color: 'bg-status-dropped text-sand-50' }
];

export default function MyListView({ 
  watchlist, 
  onUpdateStatus, 
  onIncrementEpisode, 
  onRemoveItem, 
  onSelectAnime,
  titleLanguage = 'english'
}) {
  const [activeStatus, setActiveStatus] = useState('all');
  const [filterQuery, setFilterQuery] = useState('');
  const [sortBy, setSortBy] = useState('updated_at'); // 'updated_at' | 'title' | 'score'
  const [viewMode, setViewMode] = useState('grid');

  const filteredList = (watchlist || []).filter(item => {
    const matchesStatus = activeStatus === 'all' || item.status === activeStatus;
    const title = (item.anime_title || '').toLowerCase();
    const matchesQuery = !filterQuery || title.includes(filterQuery.toLowerCase());
    return matchesStatus && matchesQuery;
  }).sort((a, b) => {
    if (sortBy === 'title') return (a.anime_title || '').localeCompare(b.anime_title || '');
    if (sortBy === 'score') return (b.score || 0) - (a.score || 0);
    return new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0);
  });

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

      {/* Header & Controls */}
      <div className="card-manga-panel p-4 bg-sand-50 dark:bg-sand-200 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-black text-xl md:text-2xl text-ink-900 uppercase tracking-tight">
              My Watchlist
            </h1>
            <p className="text-xs text-stone-500 font-mono mt-0.5">
              {(watchlist || []).length} anime tracked
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-sand-200 dark:bg-sand-300 p-1 rounded-md border-2 border-stone-900 shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)]">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded transition-all ${
                  viewMode === 'grid' 
                    ? 'bg-amber-400 text-ink-900 font-black shadow-sm' 
                    : 'text-stone-600 hover:text-ink-900'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded transition-all ${
                  viewMode === 'list' 
                    ? 'bg-amber-400 text-ink-900 font-black shadow-sm' 
                    : 'text-stone-600 hover:text-ink-900'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <button 
              onClick={exportJson}
              className="btn-manga bg-sand-100 dark:bg-sand-300 hover:bg-amber-400 text-ink-900 text-xs px-2.5 py-1.5 flex items-center gap-1.5"
              title="Export JSON Backup"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Backup</span>
            </button>
          </div>
        </div>

        {/* Search & Sort Filters */}
        <div className="flex gap-2">
          <div className="relative flex-grow">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-500" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter list..."
              className="w-full pl-9 pr-3 py-1.5 bg-sand-100 dark:bg-sand-300 border-2 border-stone-900 rounded-md font-sans text-xs text-ink-900 focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-sand-100 dark:bg-sand-300 border-2 border-stone-900 rounded-md px-2 py-1.5 text-xs font-bold text-ink-900 focus:outline-none"
          >
            <option value="updated_at">Last Updated</option>
            <option value="title">Title A-Z</option>
            <option value="score">Score</option>
          </select>
        </div>

        {/* Status Horizontal Tabs */}
        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pt-2 border-t border-sand-300 dark:border-sand-400">
          {STATUS_CONFIG.map(tab => {
            const count = tab.id === 'all' 
              ? (watchlist || []).length 
              : (watchlist || []).filter(i => i.status === tab.id).length;
            const isSelected = activeStatus === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveStatus(tab.id)}
                className={`shrink-0 px-3 py-1 rounded-md text-xs font-black transition-all border-2 border-stone-900 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-amber-400 text-ink-900 shadow-[2px_2px_0px_0px_rgba(24,19,13,1)] scale-[1.02]'
                    : 'bg-sand-100 dark:bg-sand-300 text-stone-700 hover:bg-sand-200'
                }`}
              >
                <span>{tab.label}</span>
                <span className="font-mono text-[10px] opacity-80">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* List / Grid Display */}
      {filteredList.length === 0 ? (
        <div className="card-manga-panel p-8 text-center bg-sand-50 dark:bg-sand-200">
          <Film className="w-10 h-10 text-stone-400 mx-auto mb-2" />
          <p className="font-display font-bold text-base text-ink-900">No anime in this list</p>
          <p className="text-xs text-stone-500 font-sans mt-1">Browse the Schedule tab to discover and add anime.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5">
          {filteredList.map((item) => {
            const cover = item.anime_cover || item.anime_cover_image || item.coverImage || '';
            return (
              <AnimeCard
                key={item.anime_id || item.id}
                anime={{
                  id: item.anime_id || item.id,
                  title: item.anime_title,
                  coverImage: cover,
                  totalEpisodes: item.total_episodes,
                  genres: item.genres,
                  averageScore: item.score ? item.score * 10 : null
                }}
                watchlistEntry={item}
                onUpdateStatus={(anime, newStatus) => onUpdateStatus(anime.id, newStatus)}
                onRemoveItem={onRemoveItem}
                onSelectAnime={onSelectAnime}
                titleLanguage={titleLanguage}
              />
            );
          })}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredList.map((item) => {
            const total = item.total_episodes || null;
            const watched = item.episodes_watched || 0;
            const cover = item.anime_cover || item.anime_cover_image || item.coverImage || '';

            return (
              <div
                key={item.anime_id || item.id}
                className="card-manga-panel p-3 flex gap-3 group relative items-center justify-between bg-sand-50 dark:bg-sand-200"
              >
                {/* Anime Info */}
                <div 
                  className="flex gap-3 items-center min-w-0 flex-grow cursor-pointer"
                  onClick={() => onSelectAnime(item.anime_id || item.id)}
                >
                  <img 
                    src={cover} 
                    alt={item.anime_title} 
                    className="w-12 h-16 object-cover rounded-sm border-2 border-stone-900 shrink-0 bg-sand-200"
                  />
                  <div className="min-w-0 pr-2">
                    <h3 className="font-display font-bold text-sm text-ink-900 leading-snug line-clamp-1 group-hover:text-navy-700">
                      {item.anime_title}
                    </h3>

                    {/* Status Pill */}
                    <div className="flex items-center gap-2 mt-1">
                      <select
                        value={item.status}
                        onChange={(e) => {
                          e.stopPropagation();
                          onUpdateStatus(item.anime_id || item.id, e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[10px] font-black uppercase px-2 py-0.5 rounded border border-stone-900 bg-sand-100 dark:bg-sand-300 text-ink-900 focus:outline-none"
                      >
                        <option value="watching">Watching</option>
                        <option value="completed">Completed</option>
                        <option value="plan_to_watch">Plan</option>
                        <option value="on_hold">Hold</option>
                        <option value="dropped">Dropped</option>
                      </select>

                      <span className="font-mono text-xs text-stone-600 font-bold">
                        {watched} / {total || '?'} ep
                      </span>
                    </div>
                  </div>
                </div>

                {/* Episode Progress Button */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onIncrementEpisode(item.anime_id || item.id)}
                    className="btn-manga bg-amber-400 hover:bg-amber-300 text-ink-900 text-xs px-2.5 py-1.5 rounded flex items-center gap-1 font-mono"
                    title="Increment Episode (+1)"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>1</span>
                  </button>

                  <button
                    onClick={() => {
                      if (window.confirm(`Remove "${item.anime_title}" from your watchlist?`)) {
                        onRemoveItem(item.anime_id || item.id);
                      }
                    }}
                    className="p-1.5 rounded hover:bg-status-dropped-bg text-stone-400 hover:text-status-dropped transition-colors"
                    title="Remove from list"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
