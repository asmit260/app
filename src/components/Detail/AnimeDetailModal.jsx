import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Play, Plus, Minus, Check, Star, Calendar, Clock, Film, ExternalLink, Bookmark, Bell, Eye, Sparkles, RotateCcw } from 'lucide-react';
import { anilistQuery, ANIME_DETAIL_QUERY } from '../../services/anilist';
import { getActiveAnimeAlerts } from '../../services/notifications';
import { updateWatchlistRating, upsertWatchlistEntry, startRewatch } from '../../services/storage';
import { sound } from '../../services/soundEffects';
import { fireConfetti } from '../../utils/confetti';
import AiringAlertModal from '../Schedule/AiringAlertModal';

const STATUS_LIST = [
  { id: 'watching', label: 'Watching', color: 'bg-status-watching text-white' },
  { id: 'completed', label: 'Completed', color: 'bg-status-completed text-white' },
  { id: 'plan_to_watch', label: 'Plan to Watch', color: 'bg-status-plan text-white' },
  { id: 'on_hold', label: 'On Hold', color: 'bg-status-hold text-white' },
  { id: 'dropped', label: 'Dropped', color: 'bg-status-dropped text-white' }
];

export default function AnimeDetailModal({ 
  animeId, 
  onClose, 
  watchlist = [], 
  onUpdateStatus, 
  onRemoveItem,
  titleLanguage = 'english'
}) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTrailer, setShowTrailer] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [activeAlerts, setActiveAlerts] = useState({});
  const [localScore, setLocalScore] = useState(null);
  const [localEps, setLocalEps] = useState(null);
  const [steppingAnim, setSteppingAnim] = useState(false);
  const [ratingAnimStar, setRatingAnimStar] = useState(null);

  useEffect(() => {
    let isCurrent = true;

    if (animeId) {
      document.body.style.overflow = 'hidden';
      setDetail(null);
      setLoading(true);
      setLocalScore(null);
      setLocalEps(null);
      setShowTrailer(false);
      setShowAlertModal(false);

      loadDetail(animeId, () => isCurrent);
      loadAlerts();
    } else {
      document.body.style.overflow = '';
      setDetail(null);
      setLoading(false);
    }

    return () => {
      isCurrent = false;
      document.body.style.overflow = '';
    };
  }, [animeId]);

  const loadAlerts = async () => {
    try {
      const alerts = await getActiveAnimeAlerts();
      setActiveAlerts(alerts);
    } catch (_) {}
  };

  const loadDetail = async (id, isCurrentCheck) => {
    setLoading(true);
    setDetail(null);
    try {
      const res = await anilistQuery(ANIME_DETAIL_QUERY, { id });
      if (isCurrentCheck ? isCurrentCheck() : true) {
        if (res?.Media) {
          setDetail(res.Media);
        }
      }
    } catch (e) {
      console.error("Failed to load anime detail:", e);
    } finally {
      if (isCurrentCheck ? isCurrentCheck() : true) {
        setLoading(false);
      }
    }
  };

  const currentEntry = (watchlist || []).find(item => (item.anime_id == animeId || item.id == animeId));
  const isAlertActive = !!activeAlerts[animeId];
  const effectiveScore = localScore !== null ? localScore : (currentEntry?.score || 0);
  const totalEps = detail?.episodes || currentEntry?.total_episodes || null;
  const effectiveEps = localEps !== null ? localEps : (currentEntry?.episodes_watched || 0);

  const getTitle = () => {
    if (!detail?.title) return 'Anime Details';
    if (titleLanguage === 'romaji') return detail.title.romaji || detail.title.english || detail.title.native;
    if (titleLanguage === 'native') return detail.title.native || detail.title.romaji || detail.title.english;
    return detail.title.english || detail.title.romaji || detail.title.native;
  };

  const handleRatingChange = async (rating) => {
    const newRating = effectiveScore === rating ? 0 : rating;
    setLocalScore(newRating);
    setRatingAnimStar(rating);
    sound.playStarRate(rating / 2);
    setTimeout(() => setRatingAnimStar(null), 400);
    await updateWatchlistRating(animeId, newRating);
  };

  const handleStepEpisode = async (delta) => {
    if (!detail) return;
    const current = effectiveEps;
    const next = Math.max(0, current + delta);

    // Limit check: For airing anime, cap at latest aired episode; for finished anime, cap at totalEps
    const maxAired = detail.nextAiringEpisode?.episode 
      ? Math.max(1, detail.nextAiringEpisode.episode - 1) 
      : (detail.status === 'RELEASING' ? 1 : totalEps);
    const effectiveLimit = (detail.status === 'RELEASING' && maxAired) ? maxAired : (totalEps || null);

    if (effectiveLimit && next > effectiveLimit && delta > 0) return;

    setLocalEps(next);
    setSteppingAnim(true);
    setTimeout(() => setSteppingAnim(false), 300);

    const isFinished = totalEps && next >= totalEps;
    if (isFinished) {
      sound.playCelebration();
      fireConfetti();
    } else {
      sound.playEpisodeStep();
    }

    const newStatus = isFinished ? 'completed' : (currentEntry?.status || 'watching');
    await upsertWatchlistEntry(detail, newStatus, next);
  };

  const handleStatusChange = async (stId) => {
    if (stId === 'completed') {
      sound.playCelebration();
      fireConfetti();
    } else {
      sound.playSaveSuccess();
    }
    await onUpdateStatus(detail, stId);
  };

  if (!animeId) return null;

  const progressPercent = totalEps ? Math.min(100, Math.round((effectiveEps / totalEps) * 100)) : 0;

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9990] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}
      onClick={onClose}
    >
      
      {/* Modal / Bottom Sheet Container */}
      <div 
        className="card-manga-panel bg-sand-50 dark:bg-sand-100 max-w-2xl w-full max-h-[92vh] overflow-y-auto hide-scrollbar rounded-t-2xl sm:rounded-lg relative flex flex-col animate-slide-up border-b-0 sm:border-b-2"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Handle Indicator */}
        <div className="sm:hidden flex justify-center pt-2 pb-1">
          <div className="w-12 h-1.5 bg-stone-400/60 rounded-full" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-30 w-8 h-8 rounded-full bg-sand-50/90 dark:bg-sand-200 border-2 border-stone-900 flex items-center justify-center shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)] active:scale-95 transition-all"
          title="Close Modal"
        >
          <X className="w-4 h-4 text-ink-900" />
        </button>

        {loading ? (
          <div className="space-y-4 pb-6 animate-skeleton-pulse select-none">
            {/* Banner Skeleton */}
            <div className="relative h-44 sm:h-52 w-full bg-sand-200 dark:bg-sand-300 shimmer-skeleton border-b-2 border-stone-900 overflow-hidden">
              <div className="absolute bottom-3 left-4 right-4 flex gap-3 items-end">
                {/* Cover Cutout Skeleton */}
                <div className="w-20 h-28 sm:w-24 sm:h-36 rounded-md bg-sand-300 dark:bg-sand-400 border-2 border-stone-900 shrink-0 shadow-manga shimmer-skeleton" />
                <div className="space-y-2 flex-grow pb-1">
                  <div className="h-5 w-3/4 rounded bg-stone-300 dark:bg-stone-600 shimmer-skeleton" />
                  <div className="h-3.5 w-1/2 rounded bg-stone-300 dark:bg-stone-600 shimmer-skeleton" />
                </div>
              </div>
            </div>

            {/* Content Body Skeletons */}
            <div className="px-4 sm:px-6 space-y-4">
              {/* Badges Skeleton */}
              <div className="flex gap-2">
                <div className="h-7 w-28 rounded bg-sand-200 dark:bg-sand-300 border-2 border-stone-900/30 shimmer-skeleton" />
                <div className="h-7 w-24 rounded bg-sand-200 dark:bg-sand-300 border-2 border-stone-900/30 shimmer-skeleton" />
                <div className="h-7 w-20 rounded bg-sand-200 dark:bg-sand-300 border-2 border-stone-900/30 shimmer-skeleton" />
              </div>

              {/* Status Action Bar Skeleton */}
              <div className="p-3 rounded-lg border-2 border-stone-900 bg-sand-100 dark:bg-sand-300 flex items-center justify-between">
                <div className="h-8 w-32 rounded bg-stone-300 dark:bg-stone-600 shimmer-skeleton" />
                <div className="h-8 w-24 rounded bg-amber-400/60 shimmer-skeleton" />
              </div>

              {/* Synopsis Skeleton */}
              <div className="space-y-2 pt-1">
                <div className="h-4 w-24 rounded bg-stone-300 dark:bg-stone-600" />
                <div className="space-y-1.5">
                  <div className="h-3 w-full rounded bg-sand-200 dark:bg-sand-300 shimmer-skeleton" />
                  <div className="h-3 w-[92%] rounded bg-sand-200 dark:bg-sand-300 shimmer-skeleton" />
                  <div className="h-3 w-[78%] rounded bg-sand-200 dark:bg-sand-300 shimmer-skeleton" />
                </div>
              </div>
            </div>
          </div>
        ) : detail ? (
          <div className="space-y-4 pb-6">
            
            {/* Banner & Header Image */}
            <div className="relative h-44 sm:h-52 w-full bg-sand-300 overflow-hidden border-b-2 border-stone-900">
              <img
                src={detail.bannerImage || detail.coverImage?.extraLarge || detail.coverImage?.large}
                alt={getTitle()}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-900/85 via-stone-900/40 to-transparent" />

              {/* Cover & Title Overlay */}
              <div className="absolute bottom-3 left-4 right-4 flex gap-3 items-end">
                <img
                  src={detail.coverImage?.large}
                  alt={getTitle()}
                  className="w-16 h-24 sm:w-20 sm:h-28 object-cover rounded border-2 border-sand-50 shadow-manga shrink-0 bg-sand-200"
                />
                <div className="min-w-0 pr-6 space-y-1">
                  <h2 className="font-display font-black text-base sm:text-xl text-sand-50 line-clamp-2 leading-tight drop-shadow-sm">
                    {getTitle()}
                  </h2>
                  <p className="text-[11px] text-amber-300 font-mono font-bold truncate">
                    {detail.studios?.nodes?.[0]?.name || detail.format || 'TV Series'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-4">
              
              {/* Watchlist Status Fast Compartment Selector */}
              <div className="card-manga-panel p-3 bg-sand-100 dark:bg-sand-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink-900 flex items-center gap-1.5">
                    <Bookmark className="w-3.5 h-3.5 text-amber-500" />
                    Tracking Status
                  </span>
                  
                  {/* Airing Alert Button & Trailer Button */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAlertModal(true)}
                      className={`btn-manga text-xs px-2.5 py-1 flex items-center gap-1.5 font-bold ${
                        isAlertActive 
                          ? 'bg-amber-400 text-stone-950 ring-2 ring-amber-300' 
                          : 'bg-sand-50 dark:bg-sand-300 hover:bg-amber-400 hover:text-stone-950 text-ink-900'
                      }`}
                      title="Set Airing Reminder / Alarm"
                    >
                      <Bell className={`w-3.5 h-3.5 ${isAlertActive ? 'fill-current' : ''}`} />
                      <span>{isAlertActive ? 'Alert On' : 'Set Alert'}</span>
                    </button>

                    {detail.trailer?.site === 'youtube' && (
                      <button
                        onClick={() => setShowTrailer(!showTrailer)}
                        className="btn-manga bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs px-2.5 py-1 flex items-center gap-1.5 font-bold"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{showTrailer ? 'Hide' : 'Trailer'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Status Pill Buttons Grid */}
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {(detail.status === 'RELEASING' ? STATUS_LIST.filter(s => s.id !== 'completed') : STATUS_LIST).map(st => {
                    const isSelected = currentEntry?.status === st.id;
                    return (
                      <button
                        key={st.id}
                        onClick={() => handleStatusChange(st.id)}
                        className={`py-1.5 px-2 rounded text-[11px] font-black border-2 border-stone-900 transition-all select-none active:scale-95 ${
                          isSelected
                            ? 'bg-amber-400 text-stone-950 shadow-[2px_2px_0px_0px_rgba(24,19,13,1)] scale-[1.02]'
                            : 'bg-sand-50 dark:bg-sand-300 text-stone-700 dark:text-stone-200 hover:bg-sand-200 dark:hover:bg-sand-400'
                        }`}
                      >
                        {st.label}
                      </button>
                    );
                  })}
                </div>

                {/* Rewatch Action Button (When Completed or Rewatching) */}
                {currentEntry && (currentEntry.status === 'completed' || (currentEntry.rewatch_count || 0) > 0) && (
                  <div className="pt-1 flex items-center justify-between border-t border-sand-300 dark:border-sand-400">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <RotateCcw className="w-3 h-3" />
                        <span>{currentEntry.rewatch_count > 0 ? `Rewatch #${currentEntry.rewatch_count + 1} Active` : 'Completed 1st Watch'}</span>
                      </span>
                    </div>
                    <button
                      onClick={async () => {
                        sound.playCelebration();
                        fireConfetti();
                        await startRewatch(detail);
                        setLocalEps(1);
                      }}
                      className="btn-manga bg-amber-400 hover:bg-amber-300 text-ink-900 text-[11px] px-3 py-1 rounded font-black flex items-center gap-1.5 shadow-sm active:scale-95"
                      title="Start a new rewatch pass without losing your completion history"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Start Rewatch</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Interactive Episode Stepper (When in Watchlist) */}
              {currentEntry && (
                <div className="card-manga-panel p-3.5 bg-sand-100 dark:bg-sand-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-ink-900 uppercase tracking-tight flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-amber-500" />
                        Episode Progress
                      </span>
                      <p className="text-[11px] text-stone-500 font-mono mt-0.5">
                        {effectiveEps} of {detail.status === 'RELEASING' ? `${(detail.nextAiringEpisode?.episode ? Math.max(1, detail.nextAiringEpisode.episode - 1) : 1)} aired` : (totalEps || '?')} episodes watched ({progressPercent}%)
                      </p>
                    </div>

                    {/* Stepper Buttons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleStepEpisode(-1)}
                        disabled={effectiveEps <= 0}
                        className="w-8 h-8 rounded-md bg-sand-50 dark:bg-sand-300 border-2 border-stone-900 flex items-center justify-center font-bold text-ink-900 shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)] active:translate-y-0.5 disabled:opacity-40"
                        title="Step Back (-1 Ep)"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className={`w-10 text-center font-mono font-black text-sm text-ink-900 ${steppingAnim ? 'animate-bounce-subtle text-amber-600 dark:text-amber-400' : ''}`}>
                        {effectiveEps}
                      </span>
                      <button
                        onClick={() => handleStepEpisode(1)}
                        disabled={
                          detail.status === 'RELEASING'
                            ? effectiveEps >= (detail.nextAiringEpisode?.episode ? Math.max(1, detail.nextAiringEpisode.episode - 1) : 1)
                            : Boolean(totalEps && effectiveEps >= totalEps)
                        }
                        className="btn-manga bg-amber-400 hover:bg-amber-300 text-ink-900 w-8 h-8 rounded-md font-bold text-sm shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)] active:translate-y-0.5 disabled:opacity-40"
                        title="Step Forward (+1 Ep)"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                    </div>
                  </div>

                  {/* Animated Progress Bar */}
                  <div className="w-full h-2.5 bg-sand-300 dark:bg-sand-400 rounded-full border border-stone-900 overflow-hidden">
                    <div 
                      className="h-full bg-amber-400 transition-all duration-300 ease-out rounded-full shadow-sm"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* 5-Star Rating Selector */}
              {currentEntry && (
                <div className="card-manga-panel p-3 bg-sand-100 dark:bg-sand-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-600">Your Score:</span>
                  <div className="flex items-center gap-1">
                    {[2, 4, 6, 8, 10].map(star => (
                      <button
                        key={star}
                        onClick={() => handleRatingChange(star)}
                        className={`p-1 transition-transform hover:scale-125 active:scale-90 select-none ${
                          ratingAnimStar === star ? 'animate-star-pulse' : ''
                        } ${
                          effectiveScore >= star
                            ? 'text-amber-500 star-glow'
                            : 'text-stone-300 hover:text-amber-300'
                        }`}
                        title={`Rate ${star / 2}/5 (${star}/10)`}
                      >
                        <Star className={`w-5 h-5 ${effectiveScore >= star ? 'fill-current' : ''}`} />
                      </button>
                    ))}
                    {effectiveScore > 0 && (
                      <span className="font-mono text-xs font-black text-amber-600 ml-1.5 animate-fade-in">
                        {effectiveScore}/10
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Next Airing Info Banner */}
              {detail.nextAiringEpisode && (
                <div className="p-3 bg-amber-100/80 dark:bg-amber-950/40 border-2 border-stone-900 rounded-md flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <div>
                      <p className="text-xs font-black text-ink-900">
                        Episode {detail.nextAiringEpisode.episode} Airing
                      </p>
                      <p className="text-[10px] text-stone-600 dark:text-stone-400 font-mono">
                        {new Date(detail.nextAiringEpisode.airingAt * 1000).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAlertModal(true)}
                    className="btn-manga bg-amber-400 text-ink-900 text-[10px] px-2.5 py-1 font-black"
                  >
                    Remind Me
                  </button>
                </div>
              )}

              {/* Embedded Trailer Player */}
              {showTrailer && detail.trailer?.id && (
                <div className="aspect-video w-full rounded border-2 border-stone-900 overflow-hidden shadow-manga animate-fade-in">
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
                  <span className="px-2.5 py-1 bg-amber-400 text-stone-950 border-2 border-stone-900 rounded shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)] font-mono flex items-center gap-1 font-black">
                    <Star className="w-3.5 h-3.5 fill-stone-950 stroke-none" />
                    <span>{detail.averageScore}% Community</span>
                  </span>
                )}
                {detail.status === 'RELEASING' ? (
                  <span className="px-2.5 py-1 bg-sand-200 dark:bg-sand-300 text-ink-900 border-2 border-stone-900 rounded font-mono">
                    {detail.nextAiringEpisode ? `Ep ${Math.max(1, detail.nextAiringEpisode.episode - 1)} Aired` : 'Airing'}
                    {detail.episodes ? ` of ${detail.episodes}` : ''}
                  </span>
                ) : detail.episodes ? (
                  <span className="px-2.5 py-1 bg-sand-200 dark:bg-sand-300 text-ink-900 border-2 border-stone-900 rounded font-mono">
                    {detail.episodes} Episodes
                  </span>
                ) : null}
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

              {/* Genres & Themes */}
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

              {/* ═══ WHERE TO STREAM (Streaming Platforms) ═══ */}
              <div className="space-y-2 pt-2.5 border-t border-sand-300 dark:border-sand-400">
                <div className="flex items-center justify-between">
                  <span className="font-display font-black text-xs uppercase tracking-tight text-ink-900 flex items-center gap-1.5">
                    <Film className="w-3.5 h-3.5 text-amber-500" />
                    <span>Where to Stream</span>
                  </span>
                  <span className="text-[10px] font-mono text-stone-500">Legal Streaming</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {/* Official AniList External Links */}
                  {(detail.externalLinks || [])
                    .filter(l => l.type === 'STREAMING' || ['Crunchyroll', 'Netflix', 'Hulu', 'YouTube', 'Bilibili', 'Disney Plus', 'Amazon Prime', 'HIDIVE'].some(s => l.site?.toLowerCase().includes(s.toLowerCase())))
                    .map((link) => (
                      <a
                        key={link.id || link.url}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border-2 border-stone-900 bg-sand-50 dark:bg-stone-800 text-ink-900 dark:text-sand-50 font-bold text-xs shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)] hover:bg-amber-400 hover:text-stone-950 active:translate-y-0.5 transition-all"
                        style={link.color ? { borderLeftColor: link.color, borderLeftWidth: '4px' } : {}}
                      >
                        {link.icon ? (
                          <img src={link.icon} alt={link.site} className="w-3.5 h-3.5 rounded-xs" onError={(e) => { e.target.style.display = 'none'; }} />
                        ) : (
                          <Film className="w-3 h-3 text-amber-500" />
                        )}
                        <span>{link.site}</span>
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </a>
                    ))}

                  {/* Smart Search Quick-Launch Links */}
                  <a
                    href={`https://www.crunchyroll.com/search?q=${encodeURIComponent(getTitle())}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border-2 border-stone-900 bg-[#F47521]/15 text-[#F47521] dark:text-[#FFA666] font-bold text-xs shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)] hover:bg-[#F47521] hover:text-white active:translate-y-0.5 transition-all"
                    title="Search on Crunchyroll"
                  >
                    <span className="w-2 h-2 rounded-full bg-[#F47521]" />
                    <span>Crunchyroll</span>
                    <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                  </a>

                  <a
                    href={`https://www.netflix.com/search?q=${encodeURIComponent(getTitle())}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border-2 border-stone-900 bg-[#E50914]/15 text-[#E50914] dark:text-[#FF6666] font-bold text-xs shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)] hover:bg-[#E50914] hover:text-white active:translate-y-0.5 transition-all"
                    title="Search on Netflix"
                  >
                    <span className="w-2 h-2 rounded-full bg-[#E50914]" />
                    <span>Netflix</span>
                    <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                  </a>

                  <a
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(getTitle() + ' full episode 1')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border-2 border-stone-900 bg-sand-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold text-xs shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)] hover:bg-amber-400 hover:text-stone-950 active:translate-y-0.5 transition-all"
                    title="Search on YouTube (Muse Asia / Ani-One)"
                  >
                    <Play className="w-2.5 h-2.5 fill-current text-rose-500" />
                    <span>YouTube</span>
                    <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                  </a>
                </div>
              </div>

            </div>
          </div>
        ) : (
          <p className="p-8 text-center text-xs text-stone-500">Failed to load anime info.</p>
        )}

      </div>

      {/* Airing Alert Modal */}
      {detail && (
        <AiringAlertModal
          isOpen={showAlertModal}
          onClose={() => setShowAlertModal(false)}
          anime={detail}
          airingInfo={detail.nextAiringEpisode ? {
            airingAt: detail.nextAiringEpisode.airingAt,
            episode: detail.nextAiringEpisode.episode,
            time: new Date(detail.nextAiringEpisode.airingAt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          } : {
            airingAt: Math.floor(Date.now() / 1000) + 3600,
            episode: 1,
            time: 'Next Episode'
          }}
          existingAlert={activeAlerts[detail.id]}
          onAlertUpdated={loadAlerts}
          titleLanguage={titleLanguage}
        />
      )}
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
