import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Check, Plus, Minus, Loader2, Star, Film, Eye, Sparkles, Zap, Clock, Bookmark } from 'lucide-react';
import { anilistQuery, SEARCH_ANIME_QUERY } from '../../services/anilist';
import { sound } from '../../services/soundEffects';
import { fireConfetti } from '../../utils/confetti';

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
  const [customEps, setCustomEps] = useState({});

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
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
    }, 320);

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

  const getAiredEpCount = (anime) => {
    if (anime.nextAiringEpisode?.episode) {
      return Math.max(1, anime.nextAiringEpisode.episode - 1);
    }
    if (anime.status === 'RELEASING') {
      return 1;
    }
    return anime.episodes || anime.totalEpisodes || 1;
  };

  const handleAddAnime = async (anime, status, eps = null) => {
    const titleStr = getTitle(anime);
    const coverUrl = anime.coverImage?.large || anime.coverImage?.medium || '';
    const total = anime.episodes || anime.totalEpisodes || null;

    let finalEp = eps;
    if (finalEp === null) {
      if (status === 'completed') finalEp = total || 1;
      else if (status === 'watching') finalEp = (anime.nextAiringEpisode?.episode ? anime.nextAiringEpisode.episode - 1 : 1);
      else finalEp = 0;
    }

    if (status === 'completed') {
      sound.playCelebration();
      fireConfetti();
    } else {
      sound.playSaveSuccess();
    }

    const payload = {
      id: anime.id,
      title: titleStr,
      anime_title: titleStr,
      coverImage: coverUrl,
      anime_cover: coverUrl,
      genres: anime.genres || [],
      duration: anime.duration || 24,
      totalEpisodes: total,
      episodes: total,
      episodes_watched: finalEp,
      score: anime.averageScore ? Math.round(anime.averageScore / 10) : null
    };

    await onUpdateStatus(payload, status, finalEp);

    // Feedback message
    const feedbackText = status === 'completed' 
      ? `Completed (${finalEp} eps)` 
      : status === 'watching' 
        ? `Watching (Ep ${finalEp})` 
        : status.replace('_', ' ');

    setSavedFeedbacks(prev => ({ ...prev, [anime.id]: feedbackText }));
    setTimeout(() => {
      setSavedFeedbacks(prev => {
        const next = { ...prev };
        delete next[anime.id];
        return next;
      });
    }, 2000);
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
        className="card-manga-panel bg-sand-50 dark:bg-sand-100 max-w-2xl w-full p-4 sm:p-5 relative rounded-xl border-2 border-stone-900 shadow-manga-lg flex flex-col max-h-[92vh] overflow-hidden"
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
              1-tap quick presets for ongoing and completed shows
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
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-stone-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title (e.g. Solo Leveling, Bleach, Jujutsu Kaisen)..."
              autoFocus
              className="w-full pl-10 pr-9 py-2.5 bg-sand-100 dark:bg-sand-200 border-2 border-stone-900 rounded-lg font-sans text-xs sm:text-sm text-ink-900 font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder:text-stone-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-stone-400 hover:text-ink-900"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Results List Area */}
        <div className="flex-grow overflow-y-auto hide-scrollbar space-y-3 py-2 pr-1">
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
              const savedFeedback = savedFeedbacks[anime.id];
              const cover = anime.coverImage?.large || anime.coverImage?.medium || '';
              const score = anime.averageScore;
              const totalEps = anime.episodes;
              const isAiring = anime.status === 'RELEASING' || !!anime.nextAiringEpisode;
              const latestAiredEp = getAiredEpCount(anime);
              const customEp = customEps[anime.id] ?? (currentEntry?.episodes_watched || (isAiring ? latestAiredEp : 1));

              return (
                <div
                  key={anime.id}
                  className="card-manga-panel p-3 bg-sand-100 dark:bg-sand-200 border-2 border-stone-900/70 hover:border-stone-900 transition-all rounded-lg space-y-2.5"
                >
                  {/* Anime Info Row */}
                  <div className="flex items-center justify-between gap-3">
                    <div 
                      className="flex items-center gap-3 min-w-0 flex-grow cursor-pointer"
                      onClick={() => {
                        if (onSelectAnime) onSelectAnime(anime.id);
                      }}
                    >
                      <img
                        src={cover}
                        alt={getTitle(anime)}
                        className="w-12 h-16 object-cover rounded border-2 border-stone-900 shrink-0 bg-sand-300 shadow-sm"
                        loading="lazy"
                      />
                      <div className="min-w-0 pr-2 space-y-0.5">
                        <h4 className="font-display font-bold text-xs sm:text-sm text-ink-900 line-clamp-1 leading-snug hover:text-navy-700">
                          {getTitle(anime)}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-stone-600 dark:text-stone-400 font-bold flex-wrap">
                          <span className="px-1.5 py-0.2 bg-sand-200 dark:bg-sand-300 rounded border border-stone-900/30">
                            {anime.format || 'TV'}
                          </span>
                          {isAiring ? (
                            <span className="text-amber-600 dark:text-amber-400 font-black flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              Airing (Ep {latestAiredEp}{totalEps ? `/${totalEps}` : ''})
                            </span>
                          ) : (
                            <span>{totalEps ? `${totalEps} Episodes` : 'Finished'}</span>
                          )}
                          {score && (
                            <span className="text-amber-600 dark:text-amber-400 font-black">
                              ★ {score}%
                            </span>
                          )}
                        </div>

                        {currentEntry && (
                          <div className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 pt-0.5">
                            <Check className="w-3 h-3" />
                            <span>In list: {currentEntry.status.replace('_', ' ')} (Ep {currentEntry.episodes_watched || 0})</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Saved Feedback Badge */}
                    {savedFeedback && (
                      <div className="btn-manga bg-emerald-400 text-ink-900 text-xs px-2.5 py-1 rounded font-black flex items-center gap-1 shrink-0 animate-fade-in">
                        <Check className="w-3.5 h-3.5" />
                        <span>{savedFeedback}</span>
                      </div>
                    )}
                  </div>

                  {/* Smart 1-Tap Action Presets */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1 border-t border-sand-300 dark:border-sand-400">
                    {/* Airing: Caught Up Button */}
                    {isAiring ? (
                      <button
                        onClick={() => handleAddAnime(anime, 'watching', latestAiredEp)}
                        className="btn-manga bg-amber-400 hover:bg-amber-300 text-ink-900 py-1.5 px-2 rounded text-[11px] font-black flex items-center justify-center gap-1 shadow-sm"
                        title={`Mark Watching and caught up to Ep ${latestAiredEp}`}
                      >
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        <span>Caught Up (Ep {latestAiredEp})</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAddAnime(anime, 'completed', totalEps || 1)}
                        className="btn-manga bg-emerald-400 hover:bg-emerald-300 text-ink-900 py-1.5 px-2 rounded text-[11px] font-black flex items-center justify-center gap-1 shadow-sm"
                        title="Mark Completed (All Episodes)"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Completed All</span>
                      </button>
                    )}

                    {/* Start at Ep 1 */}
                    <button
                      onClick={() => handleAddAnime(anime, 'watching', 1)}
                      className="btn-manga bg-sand-50 dark:bg-sand-300 hover:bg-sand-200 text-ink-900 py-1.5 px-2 rounded text-[11px] font-bold flex items-center justify-center gap-1"
                    >
                      <Film className="w-3.5 h-3.5" />
                      <span>Start at Ep 1</span>
                    </button>

                    {/* Plan to Watch */}
                    <button
                      onClick={() => handleAddAnime(anime, 'plan_to_watch', 0)}
                      className="btn-manga bg-sand-50 dark:bg-sand-300 hover:bg-sand-200 text-ink-900 py-1.5 px-2 rounded text-[11px] font-bold flex items-center justify-center gap-1"
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>Plan to Watch</span>
                    </button>

                    {/* Completed / Put on Hold */}
                    {isAiring ? (
                      <button
                        onClick={() => handleAddAnime(anime, 'on_hold', customEp)}
                        className="btn-manga bg-sand-50 dark:bg-sand-300 hover:bg-sand-200 text-stone-700 dark:text-stone-300 py-1.5 px-2 rounded text-[11px] font-bold flex items-center justify-center gap-1"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>On Hold</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAddAnime(anime, 'watching', customEp)}
                        className="btn-manga bg-sand-50 dark:bg-sand-300 hover:bg-sand-200 text-stone-700 dark:text-stone-300 py-1.5 px-2 rounded text-[11px] font-bold flex items-center justify-center gap-1"
                      >
                        <span>At Ep {customEp}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t-2 border-sand-300 dark:border-sand-400 flex items-center justify-between text-xs text-stone-500 font-mono">
          <span>Powered by AniList Global Engine</span>
          <button
            onClick={onClose}
            className="btn-manga bg-amber-400 hover:bg-amber-300 text-ink-900 px-4 py-1.5 rounded-md font-black text-xs uppercase shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
