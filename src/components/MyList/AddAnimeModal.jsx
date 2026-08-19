import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Check, Plus, Loader2, Star, Film, Eye, Sparkles } from 'lucide-react';
import { anilistQuery, SEARCH_ANIME_QUERY } from '../../services/anilist';

const STATUS_OPTIONS = [
  { id: 'watching', label: 'Watching', color: 'bg-status-watching text-sand-50 border-status-watching' },
  { id: 'completed', label: 'Completed', color: 'bg-status-completed text-sand-50 border-status-completed' },
  { id: 'plan_to_watch', label: 'Plan to Watch', color: 'bg-status-plan text-sand-50 border-status-plan' },
  { id: 'on_hold', label: 'On Hold', color: 'bg-status-hold text-sand-50 border-status-hold' },
  { id: 'dropped', label: 'Dropped', color: 'bg-status-dropped text-sand-50 border-status-dropped' }
];

export default function AddAnimeModal({ 
  isOpen, 
  onClose, 
  watchlist = [], 
  onUpdateStatus, 
  onSelectAnime,
  titleLanguage = 'english'
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savedFeedbacks, setSavedFeedbacks] = useState({});

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Load top popular trending anime as initial recommendations
      loadInitialRecommendations();
    } else {
      document.body.style.overflow = '';
      setSearchQuery('');
      setResults([]);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const loadInitialRecommendations = async () => {
    setLoading(true);
    try {
      const data = await anilistQuery(SEARCH_ANIME_QUERY, {
        search: null,
        page: 1,
        sort: ['POPULARITY_DESC']
      });
      if (data?.Page?.media) {
        setResults(data.Page.media.slice(0, 10));
      }
    } catch (err) {
      console.warn("Failed to load recommendations:", err);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      if (isOpen) loadInitialRecommendations();
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await anilistQuery(SEARCH_ANIME_QUERY, {
          search: searchQuery.trim(),
          page: 1,
          sort: ['SEARCH_MATCH']
        });
        if (data?.Page?.media) {
          setResults(data.Page.media);
        }
      } catch (err) {
        console.error("Anime search error:", err);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery, isOpen]);

  if (!isOpen) return null;

  const getTitle = (anime) => {
    if (!anime) return 'Unknown Title';
    if (typeof anime.title === 'string') return anime.title;
    if (titleLanguage === 'romaji') return anime.title?.romaji || anime.title?.english || anime.title?.native;
    if (titleLanguage === 'native') return anime.title?.native || anime.title?.romaji || anime.title?.english;
    return anime.title?.english || anime.title?.romaji || anime.title?.native || 'Unknown Title';
  };

  const handleSelectStatus = async (anime, status) => {
    const titleStr = getTitle(anime);
    const coverUrl = anime.coverImage?.large || anime.coverImage?.medium || '';

    const payload = {
      id: anime.id,
      title: titleStr,
      anime_title: titleStr,
      coverImage: coverUrl,
      anime_cover: coverUrl,
      genres: anime.genres || [],
      duration: anime.duration || 24,
      totalEpisodes: anime.episodes || anime.totalEpisodes || null,
      episodes: anime.episodes || anime.totalEpisodes || null,
      score: anime.averageScore ? Math.round(anime.averageScore / 10) : null
    };

    // Trigger status update
    await onUpdateStatus(payload, status);

    // Flash feedback
    setSavedFeedbacks(prev => ({ ...prev, [anime.id]: status }));
    setTimeout(() => {
      setSavedFeedbacks(prev => {
        const next = { ...prev };
        delete next[anime.id];
        return next;
      });
    }, 1500);
  };

  const watchlistMap = {};
  (watchlist || []).forEach(item => {
    watchlistMap[item.anime_id || item.id] = item;
  });

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-fade-in"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}
      onClick={onClose}
    >
      <div 
        className="card-manga-panel bg-sand-50 dark:bg-sand-100 max-w-2xl w-full p-4 sm:p-6 relative rounded-lg border-2 border-stone-900 shadow-manga-lg flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-stone-900">
          <div>
            <h2 className="font-display font-black text-lg sm:text-xl text-ink-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Add Anime to Watchlist
            </h2>
            <p className="text-xs text-stone-500 font-sans mt-0.5">
              Search any anime database and add with your tracking status
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-sand-200 dark:bg-sand-300 border-2 border-stone-900 flex items-center justify-center shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)] active:scale-95 transition-all"
            title="Close"
          >
            <X className="w-4 h-4 text-ink-900" />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="pt-3 pb-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-stone-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search anime by title (e.g. Solo Leveling, Bleach, Jujutsu Kaisen)..."
              autoFocus
              className="w-full pl-9 pr-8 py-2.5 bg-sand-100 dark:bg-sand-200 border-2 border-stone-900 rounded-md font-sans text-xs sm:text-sm text-ink-900 font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder:text-stone-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-3 text-stone-400 hover:text-ink-900"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Results List Area */}
        <div className="flex-grow overflow-y-auto hide-scrollbar space-y-2.5 py-2 pr-1">
          {loading && results.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
              <p className="text-xs font-bold text-stone-500 font-mono">Searching database...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <Film className="w-10 h-10 text-stone-400 mx-auto" />
              <p className="font-display font-bold text-sm text-ink-900">No anime found</p>
              <p className="text-xs text-stone-500 font-sans">Try searching with a different English or Romaji title</p>
            </div>
          ) : (
            results.map((anime) => {
              const currentEntry = watchlistMap[anime.id];
              const savedStatus = savedFeedbacks[anime.id];
              const cover = anime.coverImage?.large || anime.coverImage?.medium || '';
              const score = anime.averageScore;
              const totalEps = anime.episodes;

              return (
                <div
                  key={anime.id}
                  className="card-manga-panel p-2.5 sm:p-3 bg-sand-100 dark:bg-sand-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-2 border-stone-900/60 hover:border-stone-900 transition-all"
                >
                  {/* Anime Info */}
                  <div 
                    className="flex items-center gap-3 min-w-0 flex-grow cursor-pointer"
                    onClick={() => {
                      if (onSelectAnime) onSelectAnime(anime.id);
                    }}
                  >
                    <img
                      src={cover}
                      alt={getTitle(anime)}
                      className="w-12 h-16 object-cover rounded border-2 border-stone-900 shrink-0 bg-sand-300"
                      loading="lazy"
                    />
                    <div className="min-w-0 pr-2 space-y-0.5">
                      <h4 className="font-display font-bold text-xs sm:text-sm text-ink-900 line-clamp-1 leading-snug hover:text-navy-700">
                        {getTitle(anime)}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-stone-600 dark:text-stone-400 font-bold">
                        <span>{anime.format || 'TV'}</span>
                        <span>·</span>
                        <span>{totalEps ? `${totalEps} Eps` : 'Ongoing'}</span>
                        {score && (
                          <>
                            <span>·</span>
                            <span className="text-amber-600 dark:text-amber-400 font-black flex items-center gap-0.5">
                              ★ {score}%
                            </span>
                          </>
                        )}
                      </div>
                      {/* Genres */}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(anime.genres || []).slice(0, 2).map(g => (
                          <span key={g} className="px-1.5 py-0.2 text-[9px] font-bold bg-sand-200 dark:bg-sand-300 text-stone-700 rounded border border-stone-900/20">
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Status Selection Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap shrink-0">
                    {savedStatus ? (
                      <div className="btn-manga bg-emerald-400 text-ink-900 text-xs px-3 py-1.5 rounded font-black flex items-center gap-1 shadow-sm animate-fade-in">
                        <Check className="w-3.5 h-3.5" />
                        <span>Saved as {savedStatus.replace('_', ' ')}!</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 overflow-x-auto">
                        <select
                          value={currentEntry?.status || ''}
                          onChange={(e) => {
                            if (e.target.value) {
                              handleSelectStatus(anime, e.target.value);
                            }
                          }}
                          className={`text-xs font-black uppercase py-1.5 px-2.5 rounded border-2 border-stone-900 shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)] focus:outline-none transition-all ${
                            currentEntry 
                              ? 'bg-amber-400 text-ink-900' 
                              : 'bg-sand-50 dark:bg-sand-300 text-ink-900 hover:bg-sand-200'
                          }`}
                        >
                          <option value="" disabled={!currentEntry}>
                            {currentEntry ? `In List: ${currentEntry.status.replace('_', ' ')}` : '+ Add to List'}
                          </option>
                          <option value="watching">Watching</option>
                          <option value="completed">Completed</option>
                          <option value="plan_to_watch">Plan to Watch</option>
                          <option value="on_hold">On Hold</option>
                          <option value="dropped">Dropped</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t-2 border-sand-300 dark:border-sand-400 flex items-center justify-between text-xs text-stone-500 font-mono">
          <span>Powered by AniList Database</span>
          <button
            onClick={onClose}
            className="btn-manga bg-sand-200 hover:bg-sand-300 text-ink-900 px-3 py-1.5 rounded font-bold text-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
