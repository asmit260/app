import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Search, Download, Film, LayoutGrid, List, Columns2, Sparkles, X, ArrowUpDown, Loader2, Check, ExternalLink } from 'lucide-react';
import WatchlistCard from './WatchlistCard';
import AddAnimeModal from './AddAnimeModal';
import { startRewatch, upsertWatchlistEntry } from '../../services/storage';
import { anilistQuery, SEARCH_ANIME_QUERY } from '../../services/anilist';
import { sound } from '../../services/soundEffects';
import { burstConfetti } from '../../utils/confetti';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('updated_at'); // 'updated_at' | 'progress_desc' | 'score' | 'title'
  const [viewMode, setViewMode] = useState('compact'); // 'compact' | 'dense' | 'grid'
  const [showAddModal, setShowAddModal] = useState(false);

  // Global search state for AniList discover integration
  const [globalResults, setGlobalResults] = useState([]);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [addingFeedbacks, setAddingFeedbacks] = useState({});

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

  // Normalize string for fuzzy search
  const cleanStr = (str) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  // Filtered & Sorted Watchlist Items
  const filteredList = useMemo(() => {
    const q = cleanStr(searchQuery);

    return watchlist.filter(item => {
      // Status match (or show all if searching across watchlist)
      const matchesStatus = activeStatus === 'all' || item.status === activeStatus;
      
      if (!q) return matchesStatus;

      // Smart search across title, romaji, english, and genres
      const t1 = cleanStr(item.anime_title);
      const t2 = cleanStr(item.title?.english);
      const t3 = cleanStr(item.title?.romaji);
      const genres = cleanStr((item.genres || []).join(' '));

      const matchesQuery = t1.includes(q) || t2.includes(q) || t3.includes(q) || genres.includes(q);

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
  }, [watchlist, activeStatus, searchQuery, sortBy]);

  // Other status matches when filtering (e.g. searching on "Watching" tab but anime is in "Completed")
  const crossTabMatches = useMemo(() => {
    if (!searchQuery.trim() || activeStatus === 'all') return [];
    const q = cleanStr(searchQuery);

    return watchlist.filter(item => {
      if (item.status === activeStatus) return false;
      const t1 = cleanStr(item.anime_title);
      const t2 = cleanStr(item.title?.english);
      const t3 = cleanStr(item.title?.romaji);
      return t1.includes(q) || t2.includes(q) || t3.includes(q);
    });
  }, [watchlist, activeStatus, searchQuery]);

  // Live AniList Global Search (Debounced 320ms when query is typed)
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setGlobalResults([]);
      setGlobalLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setGlobalLoading(true);
      try {
        const data = await anilistQuery(SEARCH_ANIME_QUERY, {
          search: q,
          page: 1,
          sort: ['SEARCH_MATCH']
        });

        if (data?.Page?.media) {
          // Filter out shows already in watchlist
          const watchlistIds = new Set(watchlist.map(i => Number(i.anime_id || i.id)));
          const unadded = data.Page.media.filter(m => !watchlistIds.has(Number(m.id))).slice(0, 6);
          setGlobalResults(unadded);
        }
      } catch (err) {
        console.warn("Global AniList search error:", err);
      } finally {
        setGlobalLoading(false);
      }
    }, 320);

    return () => clearTimeout(timer);
  }, [searchQuery, watchlist]);

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

  // 1-Tap Quick Add from Global Results
  const handleQuickAddGlobal = async (anime, status) => {
    const animeId = anime.id;
    sound.playSaveSuccess();
    setAddingFeedbacks(prev => ({ ...prev, [animeId]: status }));

    const episodesWatched = status === 'completed' 
      ? (anime.episodes || anime.totalEpisodes || 1) 
      : (status === 'watching' ? 1 : 0);

    await onUpdateStatus(anime, status, episodesWatched);

    if (status === 'completed') {
      sound.playCelebration();
      burstConfetti();
    }

    setTimeout(() => {
      setAddingFeedbacks(prev => {
        const next = { ...prev };
        delete next[animeId];
        return next;
      });
    }, 1200);
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

  const getGlobalTitle = (anime) => {
    if (!anime) return '';
    if (typeof anime.title === 'string') return anime.title;
    if (titleLanguage === 'romaji') return anime.title?.romaji || anime.title?.english || anime.title?.native;
    if (titleLanguage === 'native') return anime.title?.native || anime.title?.romaji || anime.title?.english;
    return anime.title?.english || anime.title?.romaji || anime.title?.native || 'Unknown Title';
  };

  return (
    <div className="space-y-3.5 pb-20">

      {/* ═══ HEADER & CONTROLS CARD ═══ */}
      <div className="card-manga-panel p-3.5 bg-sand-50 dark:bg-sand-200 rounded-lg border-2 border-stone-900 shadow-[3px_3px_0px_0px_rgba(24,19,13,1)] space-y-3">
        
        {/* Row 1: Title & Action Controls */}
        <div className="flex items-center justify-between gap-2">
          {/* Brand Header */}
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="font-display font-black text-lg sm:text-xl text-ink-900 uppercase tracking-tight truncate">
              My Watchlist
            </h1>
            <span className="bg-stone-900 text-amber-400 dark:bg-sand-300 dark:text-stone-900 text-[10px] font-mono font-black px-2 py-0.5 rounded-full border border-stone-900 shrink-0">
              {watchlist.length}
            </span>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-sand-100 dark:bg-sand-300 p-0.5 rounded-md border-2 border-stone-900 shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)]">
              <button
                onClick={() => setViewMode('compact')}
                className={`p-1.5 rounded transition-all ${
                  viewMode === 'compact' 
                    ? 'bg-amber-400 text-ink-900 font-black shadow-sm' 
                    : 'text-stone-500 hover:text-ink-900'
                }`}
                title="Compact Card View"
              >
                <Columns2 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setViewMode('dense')}
                className={`p-1.5 rounded transition-all ${
                  viewMode === 'dense' 
                    ? 'bg-amber-400 text-ink-900 font-black shadow-sm' 
                    : 'text-stone-500 hover:text-ink-900'
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
                    : 'text-stone-500 hover:text-ink-900'
                }`}
                title="Poster Bookshelf Grid"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Backup Button */}
            <button 
              onClick={exportJson}
              className="p-1.5 bg-sand-100 dark:bg-sand-300 hover:bg-sand-200 text-stone-700 dark:text-stone-300 rounded-md border-2 border-stone-900 shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)] active:translate-y-0.5"
              title="Export JSON Backup"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            {/* Add Anime Button */}
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-manga bg-amber-400 hover:bg-amber-300 text-ink-900 text-xs px-2.5 py-1.5 rounded-md font-black flex items-center gap-1 shadow-[2px_2px_0px_0px_rgba(24,19,13,1)] active:translate-y-0.5"
              title="Search & Add Anime"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Row 2: Full-Width Universal Search Bar */}
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search watchlist or discover anime..."
            className="w-full pl-9 pr-8 py-2 bg-sand-100 dark:bg-sand-300 border-2 border-stone-900 rounded-md font-sans text-xs text-ink-900 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Row 3: Horizontally Scrollable Status Chips & Sort Controls */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-900/10 dark:border-stone-100/10">
          <div className="flex gap-1.5 overflow-x-auto hide-scrollbar flex-grow py-0.5">
            {STATUS_CONFIG.map(tab => {
              const count = statusCounts[tab.id] || 0;
              const isSelected = activeStatus === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveStatus(tab.id)}
                  className={`shrink-0 px-2.5 py-1 rounded-md text-[11px] font-black transition-all border-2 border-stone-900 flex items-center gap-1 select-none ${
                    isSelected
                      ? 'bg-amber-400 text-ink-900 shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)] scale-[1.02]'
                      : 'bg-sand-100 dark:bg-sand-300 text-stone-700 hover:bg-sand-200'
                  }`}
                >
                  <span className="text-xs">{tab.icon}</span>
                  <span>{tab.label}</span>
                  <span className="font-mono text-[9px] opacity-80">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Sort Selector */}
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

      {/* ═══ CROSS-TAB SEARCH NOTIFICATION ═══ */}
      {crossTabMatches.length > 0 && (
        <div className="p-2.5 bg-sky-500/10 border-2 border-sky-500/40 rounded-lg flex items-center justify-between text-xs">
          <span className="text-sky-800 dark:text-sky-300 font-bold">
            Found {crossTabMatches.length} match in other tabs ({crossTabMatches[0].anime_title})
          </span>
          <button
            onClick={() => setActiveStatus('all')}
            className="btn-manga bg-sky-500 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-sm"
          >
            View in All ({crossTabMatches.length})
          </button>
        </div>
      )}

      {/* ═══ WATCHLIST ITEMS DISPLAY ═══ */}
      {filteredList.length === 0 && !searchQuery.trim() ? (
        /* Empty State */
        <div className="card-manga-panel p-8 text-center bg-sand-50 dark:bg-sand-200 rounded-lg border-2 border-stone-900 shadow-manga space-y-3">
          <Film className="w-10 h-10 text-stone-400 mx-auto" />
          <div>
            <p className="font-display font-bold text-base text-ink-900">
              {activeStatus === 'all' ? 'Your watchlist is currently empty' : `No anime in "${activeStatus.replace('_', ' ')}"`}
            </p>
            <p className="text-xs text-stone-500 font-sans mt-0.5">
              Search and add any anime or discover airing shows in Schedule.
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
      ) : filteredList.length > 0 ? (
        /* Render Selected View Mode */
        viewMode === 'compact' ? (
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
        )
      ) : null}

      {/* ═══ LIVE ANILIST GLOBAL SEARCH RESULTS (Direct 1-Tap Add) ═══ */}
      {searchQuery.trim().length >= 2 && (
        <div className="pt-2 space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5 text-xs font-mono font-black uppercase text-stone-600 dark:text-stone-400">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-current" />
              <span>AniList Global Database Results for "{searchQuery}"</span>
            </div>
            {globalLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />}
          </div>

          {globalResults.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {globalResults.map((anime) => {
                const title = getGlobalTitle(anime);
                const cover = anime.coverImage?.large || anime.coverImage?.medium || '';
                const total = anime.episodes || anime.totalEpisodes || null;
                const feedback = addingFeedbacks[anime.id];

                return (
                  <div
                    key={anime.id}
                    className="card-manga-panel p-2.5 bg-sand-50 dark:bg-sand-200 rounded-lg border-2 border-stone-900 shadow-[2px_2px_0px_0px_rgba(24,19,13,1)] flex gap-2.5 items-center justify-between"
                  >
                    {/* Cover & Title */}
                    <div 
                      className="flex items-center gap-2.5 min-w-0 flex-grow cursor-pointer"
                      onClick={() => onSelectAnime(anime.id)}
                    >
                      <img 
                        src={cover} 
                        alt={title} 
                        className="w-10 h-14 object-cover rounded border border-stone-900 shrink-0 bg-sand-200"
                        loading="lazy"
                      />
                      <div className="min-w-0 pr-1">
                        <h4 className="font-display font-black text-xs text-ink-900 line-clamp-1 hover:text-amber-600">
                          {title}
                        </h4>
                        <p className="text-[10px] text-stone-500 font-mono mt-0.5">
                          {total ? `${total} eps` : 'Ongoing'} · {anime.genres?.slice(0, 1).join('') || 'TV'}
                        </p>
                      </div>
                    </div>

                    {/* 1-Tap Add Action Buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      {feedback ? (
                        <span className="text-[10px] font-black uppercase text-emerald-600 flex items-center gap-0.5 px-2 py-1 bg-emerald-500/10 rounded border border-emerald-500">
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>Added!</span>
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={() => handleQuickAddGlobal(anime, 'watching')}
                            className="btn-manga bg-amber-400 hover:bg-amber-300 text-ink-900 text-[10px] font-black px-2 py-1 rounded flex items-center gap-0.5 shadow-sm"
                            title="Add to Watching (Ep 1)"
                          >
                            <Plus className="w-2.5 h-2.5 stroke-[3]" />
                            <span>Watching</span>
                          </button>

                          <button
                            onClick={() => handleQuickAddGlobal(anime, 'plan_to_watch')}
                            className="btn-manga bg-sand-100 dark:bg-sand-300 hover:bg-sand-200 text-stone-700 dark:text-stone-300 text-[10px] font-black px-1.5 py-1 rounded"
                            title="Add to Plan to Watch"
                          >
                            <span>Plan</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : !globalLoading && (
            <div className="text-center py-4 text-xs text-stone-500 font-mono">
              No additional anime found for "{searchQuery}". Tap "Add" to browse top shows.
            </div>
          )}
        </div>
      )}

      {/* Add Anime Modal */}
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
