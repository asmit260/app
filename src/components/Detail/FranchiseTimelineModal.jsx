import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Layers, 
  Calendar, 
  Play, 
  Check, 
  Clock, 
  Film, 
  Tv, 
  Sparkles, 
  ArrowDown, 
  Plus, 
  ExternalLink,
  Compass,
  Award
} from 'lucide-react';
import { sound } from '../../services/soundEffects';
import { buildDynamicFranchiseGraph, sortFranchiseTimeline } from '../../services/franchiseWatchOrder';

export default function FranchiseTimelineModal({
  isOpen,
  onClose,
  currentAnime,
  watchlist = [],
  onSelectAnime,
  onUpdateWatchlist,
  titleLanguage = 'english'
}) {
  const [orderMode, setOrderMode] = useState('recommended'); // 'recommended' | 'release' | 'story'

  // Build live multi-hop graph from AniList GraphQL relation nodes
  const rawGraph = useMemo(() => {
    return buildDynamicFranchiseGraph(currentAnime);
  }, [currentAnime]);

  // Sort timeline dynamically using topological & chronological algorithms
  const timelineItems = useMemo(() => {
    return sortFranchiseTimeline(rawGraph, orderMode);
  }, [rawGraph, orderMode]);

  // Calculate live completion progress based on user's watchlist
  const completionStats = useMemo(() => {
    if (timelineItems.length === 0) return { completed: 0, total: 0, percent: 0 };
    let completedCount = 0;
    timelineItems.forEach(item => {
      const match = watchlist.find(w => parseInt(w.anime_id || w.id) === item.id);
      if (match && match.status === 'completed') {
        completedCount++;
      }
    });
    const total = timelineItems.length;
    return {
      completed: completedCount,
      total,
      percent: Math.round((completedCount / total) * 100)
    };
  }, [timelineItems, watchlist]);

  if (!isOpen || !currentAnime) return null;

  const getTitle = (item) => {
    if (!item?.title) return 'Anime';
    if (typeof item.title === 'string') return item.title;
    if (titleLanguage === 'romaji') return item.title.romaji || item.title.english || item.title.native;
    if (titleLanguage === 'native') return item.title.native || item.title.romaji || item.title.english;
    return item.title.english || item.title.romaji || item.title.native || 'Anime';
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="card-manga-panel w-full max-w-xl bg-sand-50 dark:bg-stone-900 border-2 border-stone-900 rounded-xl shadow-[5px_5px_0px_0px_rgba(24,19,13,1)] overflow-hidden flex flex-col max-h-[90vh] animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b-2 border-stone-900 bg-sand-100 dark:bg-stone-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-amber-400 border border-stone-900 text-stone-950 shadow-2xs shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display font-black text-base text-ink-900 truncate">
                Franchise Watch Order & Timeline
              </h3>
              <p className="text-[11px] text-stone-500 font-sans truncate">
                {getTitle(currentAnime)} • {timelineItems.length} Connected Entries
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded border-2 border-transparent hover:border-stone-900 hover:bg-sand-200 dark:hover:bg-stone-700 transition-all shrink-0"
            title="Close"
          >
            <X className="w-4 h-4 text-ink-900" />
          </button>
        </div>

        {/* Franchise Progress Banner */}
        <div className="px-4 py-2.5 bg-amber-400/15 border-b-2 border-stone-900/30 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Award className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-xs font-bold text-stone-800 dark:text-stone-200 truncate">
              Franchise Progress: <span className="font-mono font-black">{completionStats.completed} / {completionStats.total}</span> Finished
            </span>
          </div>
          <div className="w-24 sm:w-32 h-2.5 bg-sand-200 dark:bg-stone-700 rounded-full border border-stone-900/40 overflow-hidden p-0.5 shrink-0">
            <div 
              className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${completionStats.percent}%` }}
            />
          </div>
        </div>

        {/* Order Mode Switcher */}
        <div className="flex border-b-2 border-stone-900 bg-sand-200/60 dark:bg-stone-800/60 shrink-0">
          <button
            onClick={() => { setOrderMode('recommended'); sound.playTab(); }}
            className={`flex-1 py-2 px-2 text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
              orderMode === 'recommended'
                ? 'bg-sand-50 dark:bg-stone-900 text-ink-900 border-b-2 border-amber-500'
                : 'text-stone-600 dark:text-stone-400 hover:bg-sand-100 dark:hover:bg-stone-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Recommended Order</span>
          </button>

          <button
            onClick={() => { setOrderMode('release'); sound.playTab(); }}
            className={`flex-1 py-2 px-2 text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
              orderMode === 'release'
                ? 'bg-sand-50 dark:bg-stone-900 text-ink-900 border-b-2 border-amber-500'
                : 'text-stone-600 dark:text-stone-400 hover:bg-sand-100 dark:hover:bg-stone-700'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            <span>Release Date</span>
          </button>

          <button
            onClick={() => { setOrderMode('story'); sound.playTab(); }}
            className={`flex-1 py-2 px-2 text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
              orderMode === 'story'
                ? 'bg-sand-50 dark:bg-stone-900 text-ink-900 border-b-2 border-amber-500'
                : 'text-stone-600 dark:text-stone-400 hover:bg-sand-100 dark:hover:bg-stone-700'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-purple-500" />
            <span>Story Flow</span>
          </button>
        </div>

        {/* Timeline Items List */}
        <div className="p-4 sm:p-5 overflow-y-auto hide-scrollbar space-y-3.5">
          {timelineItems.length === 0 ? (
            <p className="text-xs text-stone-500 text-center py-8">
              No connected prequel/sequel relations found for this series.
            </p>
          ) : (
            <div className="relative pl-7 sm:pl-8 space-y-4 before:absolute before:left-3.5 sm:before:left-4 before:top-3 before:bottom-3 before:w-[2px] before:bg-stone-900/20 dark:before:bg-stone-700">
              {timelineItems.map((item) => {
                const tracked = watchlist.find(w => parseInt(w.anime_id || w.id) === item.id);
                const meta = item.meta || { badgeLabel: item.format, color: 'bg-stone-200 text-stone-700 border-stone-400' };

                return (
                  <div
                    key={item.id}
                    className={`relative p-3 sm:p-3.5 rounded-lg border-2 border-stone-900 transition-all ${
                      item.isCurrent
                        ? 'bg-amber-400/25 shadow-[3px_3px_0px_0px_rgba(24,19,13,1)] ring-2 ring-amber-400/60'
                        : 'bg-sand-100 dark:bg-stone-800 hover:bg-sand-200 dark:hover:bg-stone-700 shadow-2xs'
                    }`}
                  >
                    {/* Node Step Dot on Timeline */}
                    <div className={`absolute -left-[35px] sm:-left-[39px] top-3.5 w-6 h-6 rounded-full border-2 border-stone-900 flex items-center justify-center text-[10px] font-black font-mono shadow-2xs ${
                      item.isCurrent 
                        ? 'bg-amber-400 text-stone-950 scale-110' 
                        : tracked?.status === 'completed' 
                          ? 'bg-emerald-400 text-stone-950' 
                          : 'bg-sand-50 dark:bg-stone-900 text-stone-600 dark:text-stone-300'
                    }`}>
                      {item.step}
                    </div>

                    <div className="flex gap-3 items-start justify-between">
                      <div className="flex gap-2.5 items-start min-w-0 flex-1">
                        {item.coverImage && (
                          <img
                            src={item.coverImage?.large || item.coverImage?.medium || item.coverImage || ''}
                            alt={getTitle(item)}
                            className="w-11 h-15 object-cover rounded border-2 border-stone-900 shrink-0 bg-sand-200 shadow-2xs"
                          />
                        )}

                        <div className="min-w-0 space-y-1 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase font-mono bg-stone-900 text-amber-400">
                              Step {item.step}
                            </span>

                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase font-mono border ${meta.color}`}>
                              {meta.badgeLabel}
                            </span>

                            {item.isCurrent && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase font-mono bg-amber-400 text-stone-950 border border-stone-900">
                                Viewing Now
                              </span>
                            )}

                            {item.startDate?.year && (
                              <span className="text-[10px] font-mono text-stone-500">
                                {item.startDate.year} • {item.format} {item.episodes ? `(${item.episodes} eps)` : ''}
                              </span>
                            )}
                          </div>

                          <h4 
                            onClick={() => {
                              if (item.id) {
                                onSelectAnime(item.id);
                                onClose();
                              }
                            }}
                            className={`font-display font-black text-xs sm:text-sm text-ink-900 line-clamp-1 leading-snug ${item.id ? 'hover:text-amber-600 cursor-pointer' : ''}`}
                            title={getTitle(item)}
                          >
                            {getTitle(item)}
                          </h4>
                        </div>
                      </div>

                      {/* Watchlist Quick Action */}
                      <div className="shrink-0 pt-0.5">
                        {tracked ? (
                          <span className={`px-2 py-1 rounded text-[10px] font-black uppercase font-mono border border-stone-900 flex items-center gap-1 shadow-2xs ${
                            tracked.status === 'completed' 
                              ? 'bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 border-emerald-500/60' 
                              : tracked.status === 'watching' 
                                ? 'bg-amber-500/25 text-amber-800 dark:text-amber-300 border-amber-500/60' 
                                : 'bg-sky-500/25 text-sky-800 dark:text-sky-300 border-sky-500/60'
                          }`}>
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>{tracked.status.replace('_', ' ')}</span>
                          </span>
                        ) : item.id ? (
                          <button
                            onClick={() => {
                              onUpdateWatchlist(item, 'plan_to_watch');
                              sound.playSaveSuccess();
                            }}
                            className="btn-manga bg-sand-50 dark:bg-stone-700 hover:bg-amber-400 hover:text-stone-950 text-ink-900 text-[10px] px-2.5 py-1 font-bold flex items-center gap-1 shadow-2xs"
                            title="Add to Plan to Watch"
                          >
                            <Plus className="w-3 h-3 stroke-[3]" />
                            <span>Plan</span>
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t-2 border-stone-900 bg-sand-100 dark:bg-stone-800 flex justify-between items-center shrink-0">
          <span className="text-[10px] font-mono text-stone-500">
            Traversed dynamically from AniList Relation Graph
          </span>
          <button
            onClick={onClose}
            className="btn-manga bg-amber-400 hover:bg-amber-300 text-stone-950 px-4 py-1.5 text-xs font-black shadow-2xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
