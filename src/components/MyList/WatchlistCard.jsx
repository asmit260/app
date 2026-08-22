import React, { useState } from 'react';
import { Plus, Minus, Trash2, RotateCcw, Star, Film, Check, ChevronDown } from 'lucide-react';
import { sound } from '../../services/soundEffects';
import { burstConfetti } from '../../utils/confetti';

const STATUS_THEMES = {
  watching: { label: 'Watching', bg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/50' },
  completed: { label: 'Completed', bg: 'bg-lime-500/15 text-lime-700 dark:text-lime-400 border-lime-500/50' },
  plan_to_watch: { label: 'Plan', bg: 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/50' },
  on_hold: { label: 'On Hold', bg: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/50' },
  dropped: { label: 'Dropped', bg: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/50' }
};

export default function WatchlistCard({
  item,
  viewMode = 'compact', // 'compact' | 'dense' | 'grid'
  onSelectAnime,
  onUpdateStatus,
  onStepEpisode,
  onRemoveItem,
  onStartRewatch,
  onOpenEpisodePicker,
  titleLanguage = 'english'
}) {
  const [isBouncing, setIsBouncing] = useState(false);
  const [imgError, setImgError] = useState(false);

  const animeId = item.anime_id || item.id;
  const cover = item.anime_cover || item.anime_cover_image || item.coverImage || '';
  const totalEps = item.total_episodes || item.episodes || null;
  const watched = Number(item.episodes_watched) || 0;
  const score = item.score || 0;
  const rewatchCount = item.rewatch_count || 0;
  const status = item.status || 'watching';

  const progressPercent = totalEps ? Math.min(100, Math.round((watched / totalEps) * 100)) : (watched > 0 ? 100 : 0);
  const statusTheme = STATUS_THEMES[status] || STATUS_THEMES.watching;

  const handleStep = (e, delta) => {
    e.stopPropagation();
    const nextEp = Math.max(0, watched + delta);

    // Limit check: For airing anime, cap at latest aired episode; for finished anime, cap at totalEps
    const maxAired = item.nextAiringEpisode?.episode 
      ? Math.max(1, item.nextAiringEpisode.episode - 1) 
      : (item.airing_episode || (item.status === 'RELEASING' ? 1 : null));
    const effectiveLimit = maxAired || totalEps || null;

    if (effectiveLimit && nextEp > effectiveLimit && delta > 0) return;

    sound.playEpisodeStep();
    setIsBouncing(true);
    setTimeout(() => setIsBouncing(false), 300);

    const isNowFinished = totalEps && nextEp >= totalEps;
    if (isNowFinished && status !== 'completed') {
      sound.playCelebration();
      burstConfetti();
    }

    onStepEpisode(animeId, nextEp, isNowFinished ? 'completed' : status);
  };

  // ══════════════════════════════════════════════════════════════════
  // MODE 1: COMPACT MANGA CARD (Default & Recommended)
  // ══════════════════════════════════════════════════════════════════
  if (viewMode === 'compact') {
    return (
      <div 
        onClick={() => onSelectAnime(animeId)}
        className="card-manga-panel p-2.5 bg-sand-50 dark:bg-sand-200 cursor-pointer group flex gap-3 relative rounded-lg border-2 border-stone-900 shadow-[2.5px_2.5px_0px_0px_rgba(24,19,13,1)] transition-all duration-150 active:scale-[0.995]"
      >
        {/* Left: 3:4 Crisp Poster Cover */}
        <div className="relative w-[78px] sm:w-[92px] h-[108px] sm:h-[120px] shrink-0 rounded overflow-hidden border-2 border-stone-900 shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)] bg-sand-200 dark:bg-sand-300">
          {!imgError && cover ? (
            <img 
              src={cover} 
              alt={item.anime_title} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-sand-300 via-sand-200 to-amber-100 flex items-center justify-center p-2 text-stone-500">
              <span className="font-display font-black text-[10px] text-center line-clamp-3 leading-tight">{item.anime_title}</span>
            </div>
          )}

          {/* Score Badge */}
          {score > 0 && (
            <div className="absolute top-1 left-1 bg-stone-900/90 text-amber-400 text-[9px] font-mono font-black px-1.5 py-0.5 rounded flex items-center gap-0.5 border border-amber-400/40">
              <Star className="w-2.5 h-2.5 fill-amber-400 stroke-none" />
              <span>{score}</span>
            </div>
          )}

          {/* Rewatch Pill */}
          {rewatchCount > 0 && (
            <div className="absolute bottom-1 left-1 bg-amber-400 text-ink-900 text-[8px] font-black uppercase px-1 py-0.2 rounded border border-stone-900 flex items-center gap-0.5 shadow-sm">
              <RotateCcw className="w-2 h-2" />
              <span>x{rewatchCount}</span>
            </div>
          )}
        </div>

        {/* Right: Manga Info & Controls */}
        <div className="flex flex-col justify-between flex-grow min-w-0 py-0.5">
          {/* Top Row: Title & Status Selector */}
          <div>
            <div className="flex items-start justify-between gap-1.5">
              <h3 className="font-display font-black text-xs sm:text-sm text-ink-900 line-clamp-1 leading-snug group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                {item.anime_title}
              </h3>

              {/* Status Select Dropdown */}
              <div className="relative shrink-0">
                <select
                  value={status}
                  onChange={(e) => {
                    e.stopPropagation();
                    onUpdateStatus(animeId, e.target.value);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className={`text-[9px] font-black uppercase tracking-wider pl-1.5 pr-4 py-0.5 rounded border ${statusTheme.bg} cursor-pointer focus:outline-none appearance-none`}
                >
                  <option value="watching">Watching</option>
                  <option value="completed">Completed</option>
                  <option value="plan_to_watch">Plan</option>
                  <option value="on_hold">On Hold</option>
                  <option value="dropped">Dropped</option>
                </select>
                <ChevronDown className="w-2.5 h-2.5 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
              </div>
            </div>

            {/* Subtitle / Genre preview */}
            <p className="text-[10px] text-stone-500 font-sans mt-0.5 line-clamp-1">
              {item.genres?.slice(0, 2).join(' · ') || (totalEps ? `${totalEps} Episodes` : 'Anime Series')}
            </p>
          </div>

          {/* Progress Bar & Numeric Indicator */}
          <div className="space-y-1 my-1">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold text-stone-600 dark:text-stone-400">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpenEpisodePicker) onOpenEpisodePicker(item);
                }}
                className="flex items-center gap-1 hover:text-amber-600 transition-colors text-left"
                title="Tap to jump to specific episode"
              >
                <span>Progress:</span>
                <span className={`text-ink-900 dark:text-sand-50 font-black ${isBouncing ? 'animate-bounce-subtle text-amber-500' : ''}`}>
                  Ep {watched} / {totalEps || '?'}
                </span>
              </button>
              <span>{progressPercent}%</span>
            </div>

            {/* Visual Animated Progress Bar */}
            <div className="h-2 w-full bg-sand-200 dark:bg-sand-300 rounded-full border border-stone-900/30 overflow-hidden p-0.5">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%`, minWidth: watched > 0 ? '5px' : '0' }}
              />
            </div>
          </div>

          {/* Bottom Action Deck */}
          <div className="flex items-center justify-between pt-1 border-t border-stone-900/10 dark:border-stone-100/10">
            {/* Quick 1-Tap Episode Stepper Pill */}
            <div className="inline-flex items-center bg-sand-100 dark:bg-sand-300 rounded border-2 border-stone-900 shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)] overflow-hidden">
              <button
                onClick={(e) => handleStep(e, -1)}
                disabled={watched <= 0}
                className="px-2 py-0.5 hover:bg-sand-200 dark:hover:bg-sand-400 text-stone-700 disabled:opacity-30 transition-colors"
                title="Decrease episode (-1)"
              >
                <Minus className="w-3 h-3 stroke-[3]" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpenEpisodePicker) onOpenEpisodePicker(item);
                }}
                className="px-2 py-0.5 text-[11px] font-mono font-black text-ink-900 border-x border-stone-900/20 select-none hover:bg-amber-400/30 transition-colors"
                title="Tap to jump to specific episode"
              >
                Ep {watched}
              </button>

              <button
                onClick={(e) => handleStep(e, 1)}
                disabled={totalEps && watched >= totalEps}
                className="px-2.5 py-0.5 bg-amber-400 hover:bg-amber-300 text-ink-900 font-black text-[11px] flex items-center gap-0.5 transition-colors disabled:opacity-40"
                title="Log +1 Episode Watched"
              >
                <Plus className="w-3 h-3 stroke-[3]" />
                <span>1</span>
              </button>
            </div>

            {/* Quick Actions (Rewatch & Delete) */}
            <div className="flex items-center gap-1.5">
              {status === 'completed' && onStartRewatch && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartRewatch(item);
                  }}
                  className="p-1 rounded text-stone-500 hover:text-amber-500 hover:bg-amber-400/10 transition-colors"
                  title="Start Rewatch"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Remove "${item.anime_title}" from your watchlist?`)) {
                    onRemoveItem(animeId);
                  }
                }}
                className="p-1 rounded text-stone-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                title="Remove from list"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // MODE 2: ULTRA-DENSE LIST ROW (High Capacity View)
  // ══════════════════════════════════════════════════════════════════
  if (viewMode === 'dense') {
    return (
      <div 
        onClick={() => onSelectAnime(animeId)}
        className="card-manga-panel p-2 bg-sand-50 dark:bg-sand-200 cursor-pointer group flex items-center justify-between gap-2.5 rounded-md border-2 border-stone-900 shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)] transition-all active:scale-[0.995]"
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-grow">
          {/* Mini 36px Cover */}
          <img 
            src={cover} 
            alt={item.anime_title} 
            className="w-9 h-11 object-cover rounded shrink-0 border border-stone-900 bg-sand-200"
            loading="lazy"
          />

          <div className="min-w-0 flex-grow pr-2">
            <h4 className="font-display font-bold text-xs text-ink-900 line-clamp-1 group-hover:text-amber-600">
              {item.anime_title}
            </h4>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[8px] font-black uppercase px-1 py-0.2 rounded border ${statusTheme.bg}`}>
                {statusTheme.label}
              </span>
              <span className="font-mono text-[10px] text-stone-600 font-bold">
                {watched} / {totalEps || '?'} ep
              </span>
            </div>
          </div>
        </div>

        {/* Dense Action Pill */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={(e) => handleStep(e, 1)}
            disabled={totalEps && watched >= totalEps}
            className="btn-manga bg-amber-400 hover:bg-amber-300 text-ink-900 text-xs px-2 py-1 rounded font-mono font-black flex items-center gap-0.5 shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)] active:translate-y-0.5"
            title="Log +1 Episode"
          >
            <Plus className="w-3 h-3 stroke-[3]" />
            <span>1</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Remove "${item.anime_title}"?`)) onRemoveItem(animeId);
            }}
            className="p-1 text-stone-400 hover:text-rose-500"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // MODE 3: MANGA BOOKSHELF GRID (3-Column Poster Layout)
  // ══════════════════════════════════════════════════════════════════
  return (
    <div 
      onClick={() => onSelectAnime(animeId)}
      className="card-manga-panel bg-sand-50 dark:bg-sand-200 overflow-hidden cursor-pointer group flex flex-col justify-between rounded-md border-2 border-stone-900 shadow-[2px_2px_0px_0px_rgba(24,19,13,1)] transition-all active:scale-[0.98]"
    >
      <div className="relative aspect-[3/4] bg-sand-200 dark:bg-sand-300 overflow-hidden">
        {cover ? (
          <img 
            src={cover} 
            alt={item.anime_title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-400">
            <Film className="w-8 h-8" />
          </div>
        )}

        {/* Score Tag */}
        {score > 0 && (
          <div className="absolute top-1 left-1 bg-stone-900/90 text-amber-400 text-[9px] font-mono font-black px-1.5 py-0.5 rounded flex items-center gap-0.5 border border-amber-400/40">
            <Star className="w-2.5 h-2.5 fill-amber-400 stroke-none" />
            <span>{score}</span>
          </div>
        )}

        {/* Quick Stepper Overlay on Cover */}
        <button
          onClick={(e) => handleStep(e, 1)}
          disabled={totalEps && watched >= totalEps}
          className="absolute bottom-1.5 right-1.5 btn-manga bg-amber-400 hover:bg-amber-300 text-ink-900 text-[10px] font-black px-2 py-0.5 rounded shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)] flex items-center gap-0.5"
          title="Quick +1"
        >
          <Plus className="w-3 h-3 stroke-[3]" />
          <span>1</span>
        </button>
      </div>

      {/* Title & Progress Pill */}
      <div className="p-2 space-y-1">
        <h4 className="font-display font-black text-xs text-ink-900 line-clamp-1 leading-tight">
          {item.anime_title}
        </h4>

        <div className="flex items-center justify-between text-[9px] font-mono text-stone-500 font-bold">
          <span>{watched}/{totalEps || '?'} ep</span>
          <span className={`uppercase font-black ${statusTheme.bg} px-1 rounded`}>{status}</span>
        </div>

        <div className="h-1.5 w-full bg-sand-200 dark:bg-sand-300 rounded-full overflow-hidden">
          <div className="h-full bg-amber-400 rounded-full" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>
    </div>
  );
}
