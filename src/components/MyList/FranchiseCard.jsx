import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Layers, Star, Plus, Minus, RotateCcw, Sparkles, Check, Film, Tv, Play } from 'lucide-react';
import WatchlistCard from './WatchlistCard';
import { sound } from '../../services/soundEffects';
import { burstConfetti } from '../../utils/confetti';
import { getSeasonSubtitle } from '../../utils/franchise';

const STATUS_THEMES = {
  watching: { label: 'Watching', bg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/50' },
  completed: { label: 'Completed', bg: 'bg-lime-500/15 text-lime-700 dark:text-lime-400 border-lime-500/50' },
  plan_to_watch: { label: 'Plan', bg: 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/50' },
  on_hold: { label: 'On Hold', bg: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/50' },
  dropped: { label: 'Dropped', bg: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/50' }
};

export default function FranchiseCard({
  franchise,
  viewMode = 'compact',
  onSelectAnime,
  onUpdateStatus,
  onStepEpisode,
  onRemoveItem,
  onStartRewatch,
  onOpenEpisodePicker,
  titleLanguage = 'english'
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  // If this franchise only has 1 single season/entry, render standard WatchlistCard
  if (!franchise.isMultiSeason) {
    const singleItem = franchise.items[0];
    return (
      <WatchlistCard
        key={singleItem.anime_id || singleItem.id}
        item={singleItem}
        viewMode={viewMode}
        onSelectAnime={onSelectAnime}
        onUpdateStatus={onUpdateStatus}
        onStepEpisode={onStepEpisode}
        onRemoveItem={onRemoveItem}
        onStartRewatch={onStartRewatch}
        onOpenEpisodePicker={onOpenEpisodePicker}
        titleLanguage={titleLanguage}
      />
    );
  }

  const { title, cover, items, totalWatched, totalEps, progressPercent, overallStatus, seasonCount } = franchise;
  const statusTheme = STATUS_THEMES[overallStatus] || STATUS_THEMES.watching;

  const toggleExpand = (e) => {
    if (e) e.stopPropagation();
    sound.playTab();
    setIsExpanded(!isExpanded);
  };

  // ══════════════════════════════════════════════════════════════════
  // GRID VIEW MODE: Poster Box with Multi-Season Drawer
  // ══════════════════════════════════════════════════════════════════
  if (viewMode === 'grid') {
    return (
      <div className="card-manga-panel col-span-3 sm:col-span-4 md:col-span-5 lg:col-span-6 bg-sand-50 dark:bg-sand-200 rounded-xl border-2 border-stone-900 shadow-[3.5px_3.5px_0px_0px_rgba(24,19,13,1)] overflow-hidden">
        <div 
          onClick={toggleExpand}
          className="p-3 bg-sand-100 dark:bg-sand-300 border-b-2 border-stone-900 cursor-pointer flex items-center justify-between gap-2 hover:bg-amber-400/10 transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="inline-flex items-center gap-1 bg-amber-400 text-stone-950 text-[10px] font-black uppercase px-2 py-0.5 rounded border border-stone-900 shadow-2xs shrink-0">
              <Layers className="w-3 h-3" />
              Series Hub ({seasonCount})
            </span>
            <h3 className="font-display font-black text-sm text-ink-900 truncate">
              {title}
            </h3>
            <span className="text-[10px] font-mono font-bold text-stone-500 shrink-0">
              {totalWatched}/{totalEps || '?'} ep ({progressPercent}%)
            </span>
          </div>

          <button
            onClick={toggleExpand}
            className="btn-manga bg-sand-50 dark:bg-sand-200 text-ink-900 text-xs px-2 py-1 flex items-center gap-1 font-bold shrink-0"
          >
            <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {isExpanded && (
          <div className="p-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5 sm:gap-4 animate-fade-in bg-sand-50/50 dark:bg-sand-200/50">
            {items.map((seasonItem) => (
              <WatchlistCard
                key={seasonItem.anime_id || seasonItem.id}
                item={seasonItem}
                overrideTitle={getSeasonSubtitle(seasonItem.anime_title, title)}
                viewMode="grid"
                onSelectAnime={onSelectAnime}
                onUpdateStatus={onUpdateStatus}
                onStepEpisode={onStepEpisode}
                onRemoveItem={onRemoveItem}
                onStartRewatch={onStartRewatch}
                onOpenEpisodePicker={onOpenEpisodePicker}
                titleLanguage={titleLanguage}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // COMPACT & DENSE VIEW MODES: Expandable Franchise Banner Hub
  // ══════════════════════════════════════════════════════════════════
  return (
    <div className="card-manga-panel col-span-1 md:col-span-2 bg-sand-50 dark:bg-sand-200 rounded-xl border-2 border-stone-900 shadow-[3.5px_3.5px_0px_0px_rgba(24,19,13,1)] overflow-hidden transition-all duration-200">
      
      {/* ═══ MASTER FRANCHISE HEADER BANNER ═══ */}
      <div 
        onClick={toggleExpand}
        className="p-3 sm:p-4 bg-sand-100 dark:bg-sand-300 border-b-2 border-stone-900 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-amber-400/10 transition-colors select-none"
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Franchise Master Poster Thumbnail */}
          <div className="relative w-12 h-16 sm:w-14 sm:h-20 shrink-0 rounded-md overflow-hidden border-2 border-stone-900 shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)] bg-sand-200">
            {cover ? (
              <img 
                src={cover} 
                alt={title} 
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-sand-300 flex items-center justify-center p-1 text-center font-display font-black text-[9px] text-stone-500">
                {title}
              </div>
            )}
            
            {/* Multi-Season Count Pill */}
            <div className="absolute bottom-0 inset-x-0 bg-stone-900/90 text-amber-400 text-[8px] font-mono font-black text-center py-0.2 border-t border-stone-900">
              {seasonCount} Seasons
            </div>
          </div>

          {/* Title & Aggregated Progress Info */}
          <div className="min-w-0 flex-grow space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 bg-amber-400 text-stone-950 text-[9px] font-black uppercase px-1.5 py-0.5 rounded border border-stone-900 shadow-2xs shrink-0">
                <Layers className="w-2.5 h-2.5" />
                Series Hub
              </span>
              <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${statusTheme.bg} shrink-0`}>
                {statusTheme.label}
              </span>
            </div>

            <h2 className="font-display font-black text-sm sm:text-base text-ink-900 truncate leading-tight">
              {title}
            </h2>

            {/* Franchise Progress Bar */}
            <div className="space-y-1 pt-0.5 max-w-sm">
              <div className="flex items-center justify-between text-[10px] font-mono text-stone-600 dark:text-stone-300 font-bold">
                <span>{totalWatched} of {totalEps || '?'} Total Episodes</span>
                <span className="text-amber-600 dark:text-amber-400 font-black">{progressPercent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-sand-200 dark:bg-sand-400 border border-stone-900 overflow-hidden">
                <div 
                  className="h-full bg-amber-400 transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Expand / Collapse Button */}
        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-stone-900/10">
          <span className="text-[11px] font-mono font-bold text-stone-500 sm:hidden">
            {seasonCount} Seasons / Parts
          </span>
          <button 
            onClick={toggleExpand}
            className="btn-manga bg-sand-50 dark:bg-sand-200 hover:bg-amber-400 hover:text-stone-950 text-ink-900 text-xs px-2.5 py-1 flex items-center gap-1.5 shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)] font-bold"
          >
            <span>{isExpanded ? 'Hide Seasons' : 'View Seasons'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* ═══ EXPANDABLE SEASONS / PARTS DRAWER ═══ */}
      {isExpanded && (
        <div className="p-2 sm:p-3 bg-sand-50/60 dark:bg-sand-200/60 space-y-2.5 animate-fade-in border-t border-stone-900/20">
          <div className={viewMode === 'dense' ? "space-y-2" : "grid grid-cols-1 md:grid-cols-2 gap-2.5"}>
            {items.map((seasonItem) => (
              <WatchlistCard
                key={seasonItem.anime_id || seasonItem.id}
                item={seasonItem}
                overrideTitle={getSeasonSubtitle(seasonItem.anime_title, title)}
                viewMode={viewMode === 'grid' ? 'compact' : viewMode}
                onSelectAnime={onSelectAnime}
                onUpdateStatus={onUpdateStatus}
                onStepEpisode={onStepEpisode}
                onRemoveItem={onRemoveItem}
                onStartRewatch={onStartRewatch}
                onOpenEpisodePicker={onOpenEpisodePicker}
                titleLanguage={titleLanguage}
              />
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
