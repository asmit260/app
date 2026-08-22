import React, { useState, useRef, useEffect } from 'react';
import { Clock, ChevronDown, Check, Plus, Trash2, Eye, Bell } from 'lucide-react';
import { sound } from '../../services/soundEffects';
import { burstConfetti } from '../../utils/confetti';

const STATUS_LABELS = {
  watching: { label: 'Watching', bg: 'bg-status-watching-bg text-status-watching border-status-watching/40' },
  completed: { label: 'Completed', bg: 'bg-status-completed-bg text-status-completed border-status-completed/40' },
  plan_to_watch: { label: 'Plan to Watch', bg: 'bg-status-plan-bg text-status-plan border-status-plan/40' },
  on_hold: { label: 'On Hold', bg: 'bg-status-hold-bg text-status-hold border-status-hold/40' },
  dropped: { label: 'Dropped', bg: 'bg-status-dropped-bg text-status-dropped border-status-dropped/40' }
};

const AnimeCard = React.memo(function AnimeCard({
  anime,
  watchlistEntry,
  onUpdateStatus,
  onRemoveItem,
  onSelectAnime,
  titleLanguage = 'english',
  airingInfo = null,
  whyWatch = null,
  isAlertActive = false,
  onOpenAlert = null
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const btnRef = useRef(null);
  const [dropdownDir, setDropdownDir] = useState('up'); // 'up' or 'down'

  const getTitle = () => {
    if (!anime) return 'Unknown Title';
    if (typeof anime.title === 'string') return anime.title;
    if (titleLanguage === 'romaji') return anime.title?.romaji || anime.title?.english || anime.title?.native;
    if (titleLanguage === 'native') return anime.title?.native || anime.title?.romaji || anime.title?.english;
    return anime.title?.english || anime.title?.romaji || anime.title?.native || 'Unknown Title';
  };

  const cover = anime.coverImage?.large || anime.coverImage?.medium || anime.coverImage || anime.anime_cover || anime.image || '';
  const score = anime.averageScore;
  const studio = anime.studios?.nodes?.[0]?.name || anime.studio || anime.format || 'TV';
  const genres = anime.genres || [];
  const currentStatus = watchlistEntry?.status;
  const currentEpWatched = Number(watchlistEntry?.episodes_watched) || 0;
  const totalEps = anime.totalEpisodes || anime.episodes || null;

  // Determine if anime is currently airing & calculate maximum aired episode
  const isAiring = !!airingInfo || anime.status === 'RELEASING';
  const maxAiredEp = airingInfo?.episode 
    ? (airingInfo.isAired ? airingInfo.episode : Math.max(1, airingInfo.episode - 1))
    : (anime.nextAiringEpisode?.episode ? Math.max(1, anime.nextAiringEpisode.episode - 1) : 1);

  const isCaughtUp = isAiring && currentStatus === 'watching' && currentEpWatched >= maxAiredEp && maxAiredEp > 0;

  // For airing anime, remove 'completed' option and replace with 'caught_up'
  const availableStatuses = isAiring ? {
    watching: { label: 'Watching', bg: 'bg-status-watching-bg text-status-watching border-status-watching/40' },
    caught_up: { label: `✨ Caught Up (Ep ${maxAiredEp})`, bg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40' },
    plan_to_watch: { label: 'Plan to Watch', bg: 'bg-status-plan-bg text-status-plan border-status-plan/40' },
    on_hold: { label: 'On Hold', bg: 'bg-status-hold-bg text-status-hold border-status-hold/40' },
    dropped: { label: 'Dropped', bg: 'bg-status-dropped-bg text-status-dropped border-status-dropped/40' }
  } : STATUS_LABELS;

  const statusConfig = currentStatus ? STATUS_LABELS[currentStatus] : null;

  const handleStatusSelect = (e, newStatus) => {
    e.stopPropagation();
    setShowDropdown(false);
    if (newStatus === 'remove') {
      onRemoveItem(anime.id);
    } else if (newStatus === 'caught_up') {
      onUpdateStatus(anime, 'watching', maxAiredEp);
      sound.playCelebration();
      burstConfetti();
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 800);
    } else {
      onUpdateStatus(anime, newStatus);
      sound.playSaveSuccess();
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 800);
    }
  };

  const handleToggleDropdown = (e) => {
    e.stopPropagation();
    if (!showDropdown && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      // If button is in the top half of viewport, open downward; else upward
      setDropdownDir(rect.top < window.innerHeight * 0.45 ? 'down' : 'up');
    }
    setShowDropdown(!showDropdown);
  };

  return (
    <article 
      className={`card-manga-panel group relative flex flex-col min-h-[385px] sm:min-h-[420px] h-full bg-sand-50 dark:bg-sand-200 transition-all duration-200 ${
        showDropdown ? 'z-40' : 'z-10'
      } ${airingInfo?.isAired ? 'opacity-75' : ''}`}
    >
      {/* Poster Image Area */}
      <div 
        className="block h-[180px] sm:h-[220px] w-full overflow-hidden relative border-b-2 border-stone-900 cursor-pointer bg-sand-200 dark:bg-sand-300"
        onClick={() => onSelectAnime(anime.id)}
      >
        {!imgLoaded && !imgError && (
          <div className="absolute inset-0 shimmer-skeleton z-0" />
        )}
        {!imgError && cover ? (
          <img 
            src={cover} 
            alt={getTitle()}
            className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            loading="lazy"
            decoding="async"
            onLoad={() => setImgLoaded(true)}
            onError={() => { setImgError(true); setImgLoaded(true); }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-sand-300 via-sand-200 to-amber-100 flex items-center justify-center p-3">
            <span className="font-display font-black text-sm text-stone-500 text-center line-clamp-3">{getTitle()}</span>
          </div>
        )}
        {/* Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />

        {/* Top Left Airing Alert Bell Button */}
        {airingInfo && onOpenAlert && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenAlert(anime, airingInfo);
            }}
            className={`absolute top-2 left-2 z-20 w-8 h-8 rounded-md border-2 border-stone-900 flex items-center justify-center transition-all active:scale-90 shadow-[2px_2px_0px_0px_rgba(24,19,13,1)] ${
              isAlertActive
                ? 'bg-amber-400 text-ink-900 ring-2 ring-amber-300'
                : 'bg-sand-50 dark:bg-stone-900 text-ink-900 dark:text-sand-50 hover:bg-amber-400 hover:text-ink-900'
            }`}
            title={isAlertActive ? 'Airing alert active — tap to manage' : 'Set Airing Notification / Alarm'}
          >
            <Bell className={`w-4 h-4 ${isAlertActive ? 'fill-current text-ink-900' : 'text-stone-900 dark:text-sand-50'}`} />
          </button>
        )}

        {/* Top Right Progress Indicator (if tracked) */}
        {watchlistEntry && (
          <div className="absolute top-2 right-2 z-10 pointer-events-none">
            <span className="px-2 py-0.5 text-[10px] font-mono font-black bg-stone-900/90 text-sand-50 border border-stone-900 rounded shadow-sm flex items-center gap-1">
              <Eye className="w-3 h-3 text-amber-400" />
              {currentEpWatched}/{totalEps || '?'}
            </span>
          </div>
        )}

        {/* Bottom Badges Overlay */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white font-mono text-[11px] pointer-events-none">
          <span className="bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-sm border border-white/20">
            {airingInfo ? `Ep ${airingInfo.episode}${totalEps ? ' / ' + totalEps : ''}` : `${totalEps ? totalEps + ' Ep' : 'TBA'}`}
          </span>
          {airingInfo?.isAired && (
            <span className="bg-emerald-500 text-white px-2 py-0.5 rounded-sm font-black text-[10px] uppercase border border-emerald-700 shadow-sm">
              ✓ Aired
            </span>
          )}
          {score && (
            <span className="bg-amber-400 text-ink-900 px-2 py-0.5 rounded-sm font-black border border-stone-900 shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]">
              ★ {score}%
            </span>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-3 flex-grow flex flex-col justify-between">
        <div className="flex flex-col gap-1">
          <h3 
            onClick={() => onSelectAnime(anime.id)}
            className="font-display font-bold text-sm text-ink-900 line-clamp-2 leading-snug cursor-pointer group-hover:text-navy-700 transition-colors"
          >
            {getTitle()}
          </h3>

          <span className="font-sans text-[11px] text-stone-500 truncate">
            {studio}
          </span>

          {whyWatch && (
            <p className="text-[10px] text-stone-600 line-clamp-2 mt-0.5 italic font-sans">
              "{whyWatch}"
            </p>
          )}

          {/* Genre Pills */}
          <div className="flex flex-wrap gap-1 mt-1.5 overflow-hidden max-h-[26px]">
            {genres.slice(0, 3).map((g) => (
              <span 
                key={g} 
                className="px-2 py-0.5 bg-sand-200 dark:bg-sand-300 text-stone-700 text-[9px] font-bold rounded border border-stone-900/30 shrink-0"
              >
                {g}
              </span>
            ))}
            {genres.length > 3 && (
              <span className="px-1.5 py-0.5 bg-sand-300 dark:bg-sand-400 text-stone-600 text-[9px] font-bold rounded border border-stone-900/20 shrink-0">
                +{genres.length - 3}
              </span>
            )}
          </div>

          {/* Airing schedule time & countdown */}
          {airingInfo && (
            <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-sand-300 dark:border-sand-400">
              <span className="flex items-center gap-1 font-mono text-[11px] font-bold text-navy-700">
                <Clock className="w-3.5 h-3.5" />
                {airingInfo.time}
              </span>
              <span className={`text-[10px] font-mono font-bold ${
                airingInfo.isAired ? 'text-status-completed' : 'text-amber-500'
              }`}>
                {airingInfo.countdown}
              </span>
            </div>
          )}
        </div>

        {/* Direct Interactive Status Action Button */}
        <div className="mt-3 pt-2 border-t border-sand-300 dark:border-sand-400 relative">
          <button
            ref={btnRef}
            onClick={handleToggleDropdown}
            className={`w-full py-1.5 px-2.5 rounded-md text-xs font-bold text-left border-2 border-stone-900 flex items-center justify-between transition-all hover:scale-[1.01] active:translate-y-0.5 shadow-[2px_2px_0px_0px_rgba(24,19,13,1)] ${
              justSaved
                ? 'bg-emerald-400 text-ink-900 border-emerald-600 scale-[1.03]'
                : isCaughtUp
                  ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-600'
                  : statusConfig 
                    ? statusConfig.bg 
                    : 'bg-sand-100 dark:bg-sand-300 text-ink-900 hover:bg-sand-200'
            }`}
          >
            <span className="truncate flex items-center gap-1 font-black">
              {justSaved ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Saved!</span>
                </>
              ) : isCaughtUp ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-600 dark:text-emerald-400" />
                  <span className="truncate text-emerald-700 dark:text-emerald-300">✓ Caught Up (Ep {currentEpWatched})</span>
                </>
              ) : currentStatus ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span className="truncate">
                    {currentStatus === 'watching' ? `Watching (Ep ${currentEpWatched || 1})` : (statusConfig?.label || currentStatus)}
                  </span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span className="truncate">Add to Watchlist</span>
                </>
              )}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          </button>

          {/* Status Dropdown Menu with 100% Solid Opaque Background */}
          {showDropdown && (
            <>
              {/* Invisible backdrop to capture outside clicks */}
              <div 
                className="fixed inset-0 z-40 bg-black/20" 
                onClick={(e) => { e.stopPropagation(); setShowDropdown(false); }} 
              />

              <div 
                className={`absolute left-0 right-0 z-50 bg-[#FDFAF5] dark:bg-[#1C1917] border-2 border-stone-900 rounded-md shadow-[4px_4px_0px_0px_rgba(24,19,13,1)] py-1 overflow-hidden animate-fade-in ${
                  dropdownDir === 'down' ? 'top-full mt-1' : 'bottom-full mb-1'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                {Object.entries(availableStatuses).map(([statusKey, cfg]) => (
                  <button
                    key={statusKey}
                    onClick={(e) => handleStatusSelect(e, statusKey)}
                    className={`w-full text-left px-3 py-2 text-xs font-bold flex items-center justify-between transition-colors ${
                      (statusKey === 'caught_up' && isCaughtUp) || (currentStatus === statusKey && statusKey !== 'caught_up')
                        ? 'bg-amber-400 text-ink-900 font-black' 
                        : 'text-ink-900 dark:text-sand-50 hover:bg-sand-200 dark:hover:bg-sand-300'
                    }`}
                  >
                    <span>{cfg.label}</span>
                    {((statusKey === 'caught_up' && isCaughtUp) || (currentStatus === statusKey && statusKey !== 'caught_up')) && (
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    )}
                  </button>
                ))}

                {currentStatus && (
                  <>
                    <hr className="border-stone-900/20 dark:border-stone-100/20 my-1" />
                    <button
                      onClick={(e) => handleStatusSelect(e, 'remove')}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove from list</span>
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>

      </div>
    </article>
  );
});

export default AnimeCard;
