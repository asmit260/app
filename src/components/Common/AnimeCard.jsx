import React, { useState, useRef, useEffect } from 'react';
import { Clock, ChevronDown, Check, Plus, Trash2, Eye, Bell, Edit3, Star } from 'lucide-react';
import { sound } from '../../services/soundEffects';
import { burstConfetti } from '../../utils/confetti';
import QuickEpisodeModal from './QuickEpisodeModal';

const STATUS_LABELS = {
  watching: { label: 'Watching', bg: 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-stone-950 border-emerald-700' },
  completed: { label: 'Completed', bg: 'bg-lime-600 dark:bg-lime-500 text-white dark:text-stone-950 border-lime-700' },
  plan_to_watch: { label: 'Plan to Watch', bg: 'bg-sky-600 dark:bg-sky-400 text-white dark:text-stone-950 border-sky-700' },
  on_hold: { label: 'On Hold', bg: 'bg-amber-500 dark:bg-amber-400 text-stone-950 border-amber-600' },
  dropped: { label: 'Dropped', bg: 'bg-rose-600 dark:bg-rose-500 text-white border-rose-700' }
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
  const [showEpModal, setShowEpModal] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const btnRef = useRef(null);
  const [dropdownDir, setDropdownDir] = useState('up'); // 'up' or 'down'

  if (!anime) return null;

  const getTitle = () => {
    if (!anime) return 'Unknown Title';
    if (typeof anime.title === 'string') return anime.title;
    if (titleLanguage === 'romaji') return anime.title?.romaji || anime.title?.english || anime.title?.native || 'Unknown Title';
    if (titleLanguage === 'native') return anime.title?.native || anime.title?.romaji || anime.title?.english || 'Unknown Title';
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
    : (anime.nextAiringEpisode?.episode ? Math.max(1, anime.nextAiringEpisode.episode - 1) : (totalEps || (isAiring ? 12 : 24)));

  // For airing anime, remove 'completed' option; only allow 'watching', 'plan_to_watch', 'on_hold', 'dropped'
  const availableStatuses = isAiring ? {
    watching: STATUS_LABELS.watching,
    plan_to_watch: STATUS_LABELS.plan_to_watch,
    on_hold: STATUS_LABELS.on_hold,
    dropped: STATUS_LABELS.dropped
  } : STATUS_LABELS;

  const statusConfig = currentStatus ? STATUS_LABELS[currentStatus] : null;

  const handleStatusSelect = (e, newStatus) => {
    e.stopPropagation();
    setShowDropdown(false);
    if (newStatus === 'remove') {
      onRemoveItem(anime.id);
    } else if (newStatus === 'watching') {
      setShowEpModal(true);
    } else {
      onUpdateStatus(anime, newStatus);
      sound.playSaveSuccess();
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 800);
    }
  };

  const handleConfirmEpisodes = (epNumber) => {
    onUpdateStatus(anime, 'watching', epNumber);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 800);
  };

  const handleToggleDropdown = (e) => {
    e.stopPropagation();
    if (!showDropdown && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropdownDir(rect.top < window.innerHeight * 0.45 ? 'down' : 'up');
    }
    setShowDropdown(!showDropdown);
  };

  const handleMainButtonClick = (e) => {
    e.stopPropagation();
    if (currentStatus === 'watching') {
      // Direct 1-tap open episode picker to update progress
      setShowEpModal(true);
    } else {
      handleToggleDropdown(e);
    }
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

        {/* Top Left Airing Alert Bell Button (Only for upcoming un-aired episodes) */}
        {airingInfo && !airingInfo.isAired && onOpenAlert && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenAlert(anime, airingInfo);
            }}
            className={`absolute top-2 left-2 z-20 w-8 h-8 rounded-md border-2 border-stone-900 flex items-center justify-center transition-all active:scale-90 shadow-[2px_2px_0px_0px_rgba(24,19,13,1)] ${
              isAlertActive
                ? 'bg-amber-400 text-stone-950 ring-2 ring-amber-300'
                : 'bg-sand-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 hover:bg-amber-400 hover:text-stone-950'
            }`}
            title={isAlertActive ? 'Airing alert active — tap to manage' : 'Set Airing Notification / Alarm'}
          >
            <Bell className={`w-4 h-4 ${isAlertActive ? 'fill-current text-stone-950' : 'text-stone-900 dark:text-stone-100'}`} />
          </button>
        )}

        {/* Top Right Progress Indicator (if tracked) */}
        {watchlistEntry && (
          <div className="absolute top-2 right-2 z-20 bg-stone-950/85 backdrop-blur-xs text-amber-400 border border-stone-900 text-[10px] font-mono font-bold px-2 py-0.5 rounded shadow-sm">
            {currentStatus === 'completed' ? (
              <span className="flex items-center gap-1 text-lime-400">
                <Check className="w-3 h-3 stroke-[3]" />
                Done
              </span>
            ) : (
              <span>Ep {currentEpWatched}{totalEps ? `/${totalEps}` : ''}</span>
            )}
          </div>
        )}

        {/* Bottom Left Episode & Score Badge */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none z-10">
          <div className="flex items-center gap-1.5">
            {airingInfo ? (
              <span className="bg-stone-900/90 text-amber-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-amber-400/40">
                Ep {airingInfo.episode}
              </span>
            ) : totalEps ? (
              <span className="bg-stone-900/90 text-stone-200 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-stone-700">
                {totalEps} Ep{totalEps > 1 ? 's' : ''}
              </span>
            ) : (
              <span className="bg-stone-900/90 text-amber-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-amber-400/40">
                TV
              </span>
            )}
          </div>

          {score && (
            <span className="bg-amber-400 text-stone-950 text-[10px] font-mono font-black px-1.5 py-0.5 rounded border border-stone-900 shadow-2xs flex items-center gap-0.5">
              <Star className="w-2.5 h-2.5 fill-current stroke-none" />
              {score}%
            </span>
          )}
        </div>
      </div>

      {/* Card Body Info Area */}
      <div className="p-3.5 flex flex-col justify-between flex-grow space-y-2.5">
        
        {/* Title & Studio */}
        <div>
          <h3 
            className="font-display font-black text-sm sm:text-base text-ink-900 line-clamp-2 leading-tight group-hover:text-amber-500 transition-colors cursor-pointer"
            onClick={() => onSelectAnime(anime.id)}
            title={getTitle()}
          >
            {getTitle()}
          </h3>
          <p className="text-[11px] font-sans font-semibold text-stone-500 mt-0.5 line-clamp-1">
            {studio}
          </p>
        </div>

        {/* Genres Pill Row */}
        {genres.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {genres.slice(0, 2).map((genre) => (
              <span 
                key={genre}
                className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border border-stone-900/30 dark:border-stone-600 bg-sand-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300"
              >
                {genre}
              </span>
            ))}
          </div>
        )}

        {/* Airing Schedule Countdown Banner (High Contrast Dark & Light) */}
        {airingInfo && (
          <div className={`p-2 rounded-md border-2 border-stone-900 dark:border-stone-700 text-xs font-mono font-bold flex items-center justify-between shadow-[1px_1px_0px_0px_rgba(24,19,13,1)] ${
            airingInfo.isAired
              ? 'bg-sand-200 dark:bg-stone-800 text-stone-500 dark:text-stone-400 border-stone-400 dark:border-stone-700'
              : 'bg-sand-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100'
          }`}>
            <span className="flex items-center gap-1.5 text-stone-900 dark:text-stone-100">
              <Clock className={`w-3.5 h-3.5 ${airingInfo.isAired ? 'text-stone-400' : 'text-sky-600 dark:text-sky-400'}`} />
              <span className="font-bold text-stone-900 dark:text-stone-100">{airingInfo.airingTimeFormatted || 'Airing'}</span>
            </span>
            <span className={`text-[10px] font-mono ${airingInfo.isAired ? 'text-stone-500 dark:text-stone-400 font-normal' : 'text-amber-600 dark:text-amber-400 font-black'}`}>
              {airingInfo.countdown}
            </span>
          </div>
        )}

        {/* Action Button & Status Dropdown Container */}
        <div className="mt-auto pt-1 relative" ref={btnRef}>
          <div className={`flex rounded-md border-2 border-stone-900 shadow-[2px_2px_0px_0px_rgba(24,19,13,1)] overflow-hidden transition-all duration-200 ${
            justSaved
              ? 'bg-amber-400 text-stone-950 scale-[1.02]'
              : currentStatus
                ? `${statusConfig?.bg || 'bg-amber-400 text-stone-950'} font-bold`
                : 'bg-sand-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 hover:bg-amber-400 hover:text-stone-950'
          }`}>
            
            {/* Main Action Trigger Button */}
            <button
              onClick={handleMainButtonClick}
              className="flex-grow py-1.5 px-2 text-xs font-bold font-sans flex items-center justify-center gap-1.5 truncate select-none active:bg-black/10 transition-colors"
            >
              {justSaved ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3] text-stone-950" />
                  <span className="text-stone-950">Saved!</span>
                </>
              ) : currentStatus ? (
                <>
                  <span className="truncate">{statusConfig?.label}</span>
                  {currentStatus === 'watching' && (
                    <span className="font-mono text-[10px] bg-black/15 dark:bg-white/20 px-1 rounded flex items-center gap-0.5">
                      <Edit3 className="w-2.5 h-2.5" />
                      {currentEpWatched}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Add to Watchlist</span>
                </>
              )}
            </button>

            {/* Clean Dividing Line */}
            <div className="w-[1.5px] bg-stone-900/30 dark:bg-stone-600 shrink-0" />

            {/* Dropdown Menu Toggle Trigger Button */}
            <button
              onClick={handleToggleDropdown}
              className="px-2.5 flex items-center justify-center transition-colors hover:bg-black/10 active:bg-black/20 shrink-0"
              title="Change status or options"
            >
              <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Status Dropdown Menu with High-Contrast Dark & Light Mode */}
          {showDropdown && (
            <>
              {/* Invisible backdrop to capture outside clicks */}
              <div 
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]" 
                onClick={(e) => { e.stopPropagation(); setShowDropdown(false); }} 
              />

              <div 
                className={`absolute left-0 right-0 z-50 bg-[#FDFAF5] dark:bg-[#1E1A17] border-2 border-stone-900 dark:border-stone-600 rounded-lg shadow-manga-lg py-1.5 overflow-hidden animate-fade-in ${
                  dropdownDir === 'down' ? 'top-full mt-1.5' : 'bottom-full mb-1.5'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                {Object.entries(availableStatuses).map(([statusKey, cfg]) => {
                  const isSelected = currentStatus === statusKey;
                  return (
                    <button
                      key={statusKey}
                      onClick={(e) => handleStatusSelect(e, statusKey)}
                      className={`w-full text-left px-3 py-2 text-xs font-bold flex items-center justify-between transition-colors ${
                        isSelected 
                          ? 'bg-amber-400 text-stone-950 font-black' 
                          : 'text-stone-900 dark:text-stone-100 hover:bg-sand-200 dark:hover:bg-stone-800'
                      }`}
                    >
                      <span className={isSelected ? 'text-stone-950 font-black' : 'text-stone-900 dark:text-white font-bold'}>{cfg.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3] text-stone-950" />}
                    </button>
                  );
                })}

                {currentStatus && (
                  <>
                    <hr className="border-stone-900/20 dark:border-stone-700 my-1" />
                    <button
                      onClick={(e) => handleStatusSelect(e, 'remove')}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/15 flex items-center gap-1.5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                      <span className="text-rose-600 dark:text-rose-400">Remove from list</span>
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>

      </div>

      {/* Which Episode Are You On? Quick Modal */}
      <QuickEpisodeModal
        isOpen={showEpModal}
        onClose={() => setShowEpModal(false)}
        anime={anime}
        currentEp={currentEpWatched || 1}
        maxAiredEp={maxAiredEp}
        onConfirm={handleConfirmEpisodes}
        titleLanguage={titleLanguage}
      />

    </article>
  );
});

export default AnimeCard;
