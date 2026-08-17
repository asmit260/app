import React, { useState, useEffect } from 'react';
import { X, Play, Plus, Check, Star, Calendar, Clock, Film, ExternalLink, Bookmark } from 'lucide-react';
import { anilistQuery, ANIME_DETAIL_QUERY } from '../../services/anilist';

export default function AnimeDetailModal({ 
  animeId, 
  onClose, 
  watchlist, 
  onUpdateStatus, 
  onRemoveItem,
  titleLanguage = 'english'
}) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTrailer, setShowTrailer] = useState(false);

  useEffect(() => {
    if (animeId) {
      loadDetail(animeId);
    }
  }, [animeId]);

  const loadDetail = async (id) => {
    setLoading(true);
    try {
      const res = await anilistQuery(ANIME_DETAIL_QUERY, { id });
      if (res?.Media) {
        setDetail(res.Media);
      }
    } catch (e) {
      console.error("Failed to load anime detail:", e);
    } finally {
      setLoading(false);
    }
  };

  const currentEntry = watchlist.find(item => item.anime_id === animeId || item.id === animeId);

  const getTitle = () => {
    if (!detail?.title) return 'Anime Details';
    if (titleLanguage === 'romaji') return detail.title.romaji || detail.title.english || detail.title.native;
    if (titleLanguage === 'native') return detail.title.native || detail.title.romaji || detail.title.english;
    return detail.title.english || detail.title.romaji || detail.title.native;
  };

  if (!animeId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm animate-fade-in">
      
      {/* Modal Container */}
      <div 
        className="card-manga-panel bg-sand-50 dark:bg-sand-100 max-w-2xl w-full max-h-[90vh] overflow-y-auto hide-scrollbar rounded-lg relative flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-sand-50/90 dark:bg-sand-200 border-2 border-stone-900 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(24,19,13,1)] active:translate-y-0.5"
          title="Close Modal"
        >
          <X className="w-4 h-4 text-ink-900" />
        </button>

        {loading ? (
          <div className="p-8 text-center space-y-4">
            <div className="h-44 w-full shimmer-skeleton rounded" />
            <div className="h-6 w-3/4 shimmer-skeleton rounded mx-auto" />
            <div className="h-20 w-full shimmer-skeleton rounded" />
          </div>
        ) : detail ? (
          <div className="space-y-4">
            
            {/* Banner & Header Image */}
            <div className="relative h-44 sm:h-52 w-full bg-sand-300 overflow-hidden border-b-2 border-stone-900">
              <img
                src={detail.bannerImage || detail.coverImage?.extraLarge || detail.coverImage?.large}
                alt={getTitle()}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-900/80 via-stone-900/30 to-transparent" />

              {/* Cover & Title Overlay */}
              <div className="absolute bottom-3 left-4 right-4 flex gap-3 items-end">
                <img
                  src={detail.coverImage?.large}
                  alt="Poster"
                  className="w-20 h-28 object-cover rounded border-2 border-stone-900 shrink-0 shadow-[2px_2px_0px_0px_rgba(24,19,13,1)]"
                />
                <div className="text-white min-w-0 pb-1">
                  <h2 className="font-display font-black text-base sm:text-xl leading-tight line-clamp-2 drop-shadow-md">
                    {getTitle()}
                  </h2>
                  <p className="text-xs text-sand-200 font-sans mt-0.5 truncate">
                    {detail.studios?.nodes?.[0]?.name} · {detail.seasonYear || detail.format || 'Anime'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-4">
              
              {/* Watchlist Action Bar */}
              <div className="card-manga-panel p-3 bg-sand-100 dark:bg-sand-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-stone-600" />
                  <span className="text-xs font-bold text-ink-900">Watchlist Status:</span>
                  <select
                    value={currentEntry?.status || ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        onUpdateStatus(detail, e.target.value);
                      } else {
                        onRemoveItem(detail.id);
                      }
                    }}
                    className="px-2.5 py-1 text-xs font-black uppercase rounded border-2 border-stone-900 bg-sand-50 dark:bg-sand-300 text-ink-900 focus:outline-none"
                  >
                    <option value="">Not in list</option>
                    <option value="watching">Watching</option>
                    <option value="completed">Completed</option>
                    <option value="plan_to_watch">Plan to Watch</option>
                    <option value="on_hold">On Hold</option>
                    <option value="dropped">Dropped</option>
                  </select>
                </div>

                {detail.trailer?.site === 'youtube' && (
                  <button
                    onClick={() => setShowTrailer(!showTrailer)}
                    className="btn-manga bg-amber-400 hover:bg-amber-300 text-ink-900 text-xs px-3 py-1 flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{showTrailer ? 'Hide Trailer' : 'Watch Trailer'}</span>
                  </button>
                )}
              </div>

              {/* Embedded Trailer Player */}
              {showTrailer && detail.trailer?.id && (
                <div className="aspect-video w-full rounded border-2 border-stone-900 overflow-hidden shadow-manga">
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${detail.trailer.id}?autoplay=1`}
                    title="Anime Trailer"
                    className="w-full h-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                </div>
              )}

              {/* Stats badges */}
              <div className="flex flex-wrap gap-2 text-xs font-bold">
                {detail.averageScore && (
                  <span className="px-2.5 py-1 bg-amber-400 text-ink-900 border-2 border-stone-900 rounded shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)] font-mono">
                    ★ {detail.averageScore}% Score
                  </span>
                )}
                {detail.episodes && (
                  <span className="px-2.5 py-1 bg-sand-200 dark:bg-sand-300 text-ink-900 border-2 border-stone-900 rounded font-mono">
                    {detail.episodes} Episodes
                  </span>
                )}
                <span className="px-2.5 py-1 bg-sand-200 dark:bg-sand-300 text-ink-900 border-2 border-stone-900 rounded uppercase font-mono">
                  {detail.status}
                </span>
              </div>

              {/* Synopsis */}
              <div className="space-y-1">
                <h3 className="font-display font-bold text-sm text-ink-900 uppercase tracking-tight">
                  Synopsis
                </h3>
                <p className="font-sans text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed max-h-40 overflow-y-auto hide-scrollbar">
                  {detail.description?.replace(/<[^>]*>/g, '') || 'No synopsis available.'}
                </p>
              </div>

              {/* Genres & Tags */}
              <div className="space-y-1.5 pt-2 border-t border-sand-300 dark:border-sand-400">
                <span className="text-xs font-bold text-stone-600">Genres & Themes:</span>
                <div className="flex flex-wrap gap-1.5">
                  {(detail.genres || []).map((g) => (
                    <span key={g} className="px-2 py-0.5 text-[11px] font-bold bg-sand-200 dark:bg-sand-300 text-ink-900 border border-stone-900/40 rounded">
                      {g}
                    </span>
                  ))}
                  {(detail.tags || []).slice(0, 4).map((t) => (
                    <span key={t.name} className="px-2 py-0.5 text-[11px] bg-sand-100 dark:bg-sand-400/50 text-stone-600 rounded">
                      #{t.name}
                    </span>
                  ))}
                </div>
              </div>

            </div>
          </div>
        ) : (
          <p className="p-8 text-center text-xs text-stone-500">Failed to load anime info.</p>
        )}

      </div>
    </div>
  );
}
