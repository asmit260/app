import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Check, 
  Plus, 
  Minus, 
  Tv, 
  Zap, 
  Sparkles, 
  ShieldAlert, 
  FastForward, 
  Sliders
} from 'lucide-react';
import { sound } from '../../services/soundEffects';
import { burstConfetti } from '../../utils/confetti';
import { fetchAnimeFillerData, getNextCanonEpisode } from '../../services/fillerData';

const BATCH_SIZE = 50;

export default function QuickEpisodeModal({
  isOpen,
  onClose,
  anime,
  currentEp = 1,
  maxAiredEp = 1,
  onConfirm,
  titleLanguage = 'english'
}) {
  const [selectedEp, setSelectedEp] = useState(1);
  const [activeBatchIndex, setActiveBatchIndex] = useState(0);
  const [directInputVal, setDirectInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [fillerInfo, setFillerInfo] = useState({ episodes: [], hasFiller: false });
  const batchContainerRef = useRef(null);

  const isUnreleased = anime?.status === 'NOT_YET_RELEASED' || maxAiredEp === 0;
  const effectiveMax = typeof maxAiredEp === 'number' && maxAiredEp > 0
    ? maxAiredEp
    : Math.max(1, Number(anime?.totalEpisodes || anime?.total_episodes || anime?.episodes || currentEp || 1));

  const totalBatches = Math.ceil(effectiveMax / BATCH_SIZE);

  // Lock body scroll and initialize state
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (isUnreleased) {
        setSelectedEp(0);
        setDirectInputVal('0');
        setActiveBatchIndex(0);
      } else {
        const initial = Math.max(1, Math.min(Number(currentEp) || 1, effectiveMax));
        setSelectedEp(initial);
        setDirectInputVal(String(initial));
        const initialBatch = Math.floor((initial - 1) / BATCH_SIZE);
        setActiveBatchIndex(initialBatch);
      }

      // Fetch live filler metadata
      const idMal = anime?.idMal || anime?.mal_id || (anime?.source === 'myanimelist' ? anime.id : null);
      const titleStr = typeof anime?.title === 'string' ? anime.title : (anime?.title?.english || anime?.title?.romaji || anime?.anime_title || '');
      fetchAnimeFillerData(idMal, titleStr).then(res => {
        setFillerInfo(res || { episodes: [], hasFiller: false });
      });
    } else {
      document.body.style.overflow = '';
      setFillerInfo({ episodes: [], hasFiller: false });
      setIsTyping(false);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, currentEp, maxAiredEp, effectiveMax, isUnreleased, anime]);

  // Keep active batch in view when changed
  useEffect(() => {
    if (batchContainerRef.current) {
      const activeBtn = batchContainerRef.current.querySelector(`[data-batch="${activeBatchIndex}"]`);
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [activeBatchIndex]);

  if (!isOpen || !anime) return null;

  const getTitle = () => {
    if (!anime) return 'Anime';
    if (typeof anime.title === 'string') return anime.title;
    if (titleLanguage === 'romaji') return anime.title?.romaji || anime.title?.english || anime.title?.native;
    if (titleLanguage === 'native') return anime.title?.native || anime.title?.romaji || anime.title?.english;
    return anime.title?.english || anime.title?.romaji || anime.title?.native || 'Anime';
  };

  const cover = anime.coverImage?.large || anime.coverImage?.medium || anime.coverImage || anime.anime_cover || anime.image || '';

  const updateEpisode = (newEp) => {
    const clamped = Math.max(1, Math.min(effectiveMax, newEp));
    setSelectedEp(clamped);
    setDirectInputVal(String(clamped));
    const targetBatch = Math.floor((clamped - 1) / BATCH_SIZE);
    setActiveBatchIndex(targetBatch);
  };

  const handleStep = (delta) => {
    if (isUnreleased) return;
    const next = Math.max(1, Math.min(effectiveMax, selectedEp + delta));
    if (next !== selectedEp) {
      sound.playEpisodeStep();
      updateEpisode(next);
    }
  };

  const handleSelectPill = (epNum) => {
    if (isUnreleased) return;
    sound.playEpisodeStep();
    updateEpisode(epNum);
  };

  const handleSetLatest = () => {
    if (isUnreleased) return;
    sound.playEpisodeStep();
    updateEpisode(effectiveMax);
  };

  const handleDirectInputChange = (e) => {
    const raw = e.target.value;
    setDirectInputVal(raw);
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= effectiveMax) {
      setSelectedEp(parsed);
      setActiveBatchIndex(Math.floor((parsed - 1) / BATCH_SIZE));
    }
  };

  const handleDirectInputBlur = () => {
    setIsTyping(false);
    const parsed = parseInt(directInputVal, 10);
    if (isNaN(parsed) || parsed < 1) {
      updateEpisode(1);
    } else if (parsed > effectiveMax) {
      updateEpisode(effectiveMax);
    } else {
      updateEpisode(parsed);
    }
  };

  const handleDirectInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  };

  const handleSave = () => {
    sound.playSaveSuccess();
    if (selectedEp >= effectiveMax && effectiveMax > 1) {
      sound.playCelebration();
      burstConfetti();
    }
    onConfirm(selectedEp);
    onClose();
  };

  // Generate episode numbers for current batch
  const startEp = activeBatchIndex * BATCH_SIZE + 1;
  const endEp = Math.min(effectiveMax, (activeBatchIndex + 1) * BATCH_SIZE);
  const currentBatchPills = [];
  if (!isUnreleased) {
    for (let i = startEp; i <= endEp; i++) {
      currentBatchPills.push(i);
    }
  }

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      style={{ touchAction: 'none' }}
    >
      <div 
        className="card-manga-panel w-[94vw] max-w-[420px] sm:max-w-lg bg-sand-50 dark:bg-stone-900 border-2 border-stone-900 rounded-xl shadow-[5px_5px_0px_0px_rgba(24,19,13,1)] overflow-hidden flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
        style={{ touchAction: 'auto' }}
      >
        {/* Modal Header */}
        <div className="p-3.5 sm:p-4 border-b-2 border-stone-900 bg-sand-100 dark:bg-stone-800 flex items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {cover && (
              <img 
                src={cover} 
                alt={getTitle()} 
                className="w-10 h-13 object-cover rounded-md border-2 border-stone-900 shrink-0 bg-sand-200 shadow-sm"
              />
            )}
            <div className="min-w-0 flex-1">
              <h3 className="font-display font-black text-sm text-stone-900 dark:text-stone-100 line-clamp-1 leading-snug">
                {getTitle()}
              </h3>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] font-mono font-black text-amber-900 dark:text-amber-300 bg-amber-400/30 px-2 py-0.5 rounded border border-amber-500/40 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  <span>Latest Aired: Ep {effectiveMax}</span>
                </span>
              </div>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 rounded-md border-2 border-transparent hover:border-stone-900 hover:bg-sand-200 dark:hover:bg-stone-700 transition-all shrink-0"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto hide-scrollbar">
          
          {/* Question Title */}
          <div className="text-center space-y-0.5">
            <h4 className="font-display font-black text-base sm:text-lg text-stone-900 dark:text-stone-100 flex items-center justify-center gap-1.5">
              <Tv className="w-4 h-4 text-amber-500" />
              <span>{isUnreleased ? 'Upcoming Anime' : 'Which episode are you on?'}</span>
            </h4>
            <p className="text-xs text-stone-600 dark:text-stone-400 font-sans">
              {isUnreleased 
                ? 'This anime has not started airing yet. Add to Plan to Watch!' 
                : 'Type, slide, or tap your current episode below'}
            </p>
          </div>

          {isUnreleased ? (
            <div className="p-3 bg-amber-400/20 border-2 border-stone-900 rounded-lg text-center space-y-1">
              <p className="text-xs font-bold text-amber-900 dark:text-amber-300">
                0 Episodes Released
              </p>
              <p className="text-[10px] text-stone-600 dark:text-stone-400 font-mono">
                Progress tracking starts once Episode 1 airs.
              </p>
            </div>
          ) : (
            <>
              {/* Stepper & Direct Input Control Deck */}
              <div className="flex items-center justify-center gap-2 sm:gap-3 py-1">
                {/* -1 Button */}
                <button
                  onClick={() => handleStep(-1)}
                  disabled={selectedEp <= 1}
                  className="w-11 h-11 rounded-lg border-2 border-stone-900 bg-sand-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(24,19,13,1)] active:translate-y-0.5 disabled:opacity-30 disabled:pointer-events-none transition-all hover:bg-sand-200 dark:hover:bg-stone-700 shrink-0"
                  title="Decrease Episode (-1)"
                >
                  <Minus className="w-5 h-5 stroke-[3]" />
                </button>

                {/* Interactive Current Episode Display with Type-In Support */}
                <div className="min-w-[140px] sm:min-w-[160px] px-3.5 py-1.5 bg-amber-400 dark:bg-amber-500 border-2 border-stone-900 rounded-lg shadow-[2.5px_2.5px_0px_0px_rgba(24,19,13,1)] text-center relative group">
                  <span className="text-[9px] font-mono uppercase font-black tracking-wider block text-stone-950/75">
                    CURRENT EPISODE
                  </span>

                  <div className="flex items-center justify-center gap-1">
                    <input
                      type="number"
                      min="1"
                      max={effectiveMax}
                      value={directInputVal}
                      onChange={handleDirectInputChange}
                      onFocus={() => setIsTyping(true)}
                      onBlur={handleDirectInputBlur}
                      onKeyDown={handleDirectInputKeyDown}
                      className="w-20 text-center font-display font-black text-2xl text-stone-950 bg-transparent border-b-2 border-transparent focus:border-stone-950 focus:outline-none leading-tight"
                      title="Click or tap to type any episode number"
                    />
                    <span className="text-xs font-mono font-black text-stone-950/70">
                      / {effectiveMax}
                    </span>
                  </div>

                  {/* Filler/Canon Current Badge */}
                  {fillerInfo.hasFiller && (
                    <div className="mt-0.5">
                      {(() => {
                        const epMeta = fillerInfo.episodes.find(e => e.episode === selectedEp);
                        const type = epMeta?.type || 'canon';
                        if (type === 'filler') {
                          return (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-rose-600 text-white rounded text-[8px] font-mono font-black uppercase shadow-2xs">
                              🔴 Filler Episode
                            </span>
                          );
                        } else if (type === 'recap' || type === 'mixed') {
                          return (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-amber-700 text-white rounded text-[8px] font-mono font-black uppercase shadow-2xs">
                              🟡 Mixed / Recap
                            </span>
                          );
                        }
                        return (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-emerald-700 text-white rounded text-[8px] font-mono font-black uppercase shadow-2xs">
                            🟢 Manga Canon
                          </span>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* +1 Button */}
                <button
                  onClick={() => handleStep(1)}
                  disabled={selectedEp >= effectiveMax}
                  className="w-11 h-11 rounded-lg border-2 border-stone-900 bg-sand-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(24,19,13,1)] active:translate-y-0.5 disabled:opacity-30 disabled:pointer-events-none transition-all hover:bg-sand-200 dark:hover:bg-stone-700 shrink-0"
                  title="Increase Episode (+1)"
                >
                  <Plus className="w-5 h-5 stroke-[3]" />
                </button>
              </div>

              {/* Fast Jump Step Multipliers (for series with > 20 eps) */}
              {effectiveMax > 20 && (
                <div className="flex items-center justify-center gap-1.5">
                  {effectiveMax > 50 && (
                    <button
                      onClick={() => handleStep(-50)}
                      disabled={selectedEp <= 1}
                      className="px-2.5 py-1 text-[11px] font-mono font-black rounded-md border-2 border-stone-900 bg-sand-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:bg-amber-400 hover:text-stone-950 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-2xs active:translate-y-0.5"
                      title="Jump backward 50 episodes"
                    >
                      -50
                    </button>
                  )}
                  <button
                    onClick={() => handleStep(-10)}
                    disabled={selectedEp <= 1}
                    className="px-2.5 py-1 text-[11px] font-mono font-black rounded-md border-2 border-stone-900 bg-sand-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:bg-amber-400 hover:text-stone-950 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-2xs active:translate-y-0.5"
                    title="Jump backward 10 episodes"
                  >
                    -10
                  </button>
                  <button
                    onClick={() => handleStep(10)}
                    disabled={selectedEp >= effectiveMax}
                    className="px-2.5 py-1 text-[11px] font-mono font-black rounded-md border-2 border-stone-900 bg-sand-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:bg-amber-400 hover:text-stone-950 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-2xs active:translate-y-0.5"
                    title="Jump forward 10 episodes"
                  >
                    +10
                  </button>
                  {effectiveMax > 50 && (
                    <button
                      onClick={() => handleStep(50)}
                      disabled={selectedEp >= effectiveMax}
                      className="px-2.5 py-1 text-[11px] font-mono font-black rounded-md border-2 border-stone-900 bg-sand-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:bg-amber-400 hover:text-stone-950 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-2xs active:translate-y-0.5"
                      title="Jump forward 50 episodes"
                    >
                      +50
                    </button>
                  )}
                </div>
              )}

              {/* Fast Scrub Range Slider */}
              {effectiveMax > 12 && (
                <div className="p-2.5 bg-sand-100 dark:bg-stone-800 rounded-lg border-2 border-stone-900/30 space-y-1">
                  <div className="flex justify-between items-center text-[10px] font-mono font-bold text-stone-600 dark:text-stone-400">
                    <span>Ep 1</span>
                    <span className="text-amber-600 dark:text-amber-400 font-black flex items-center gap-1">
                      <Sliders className="w-3 h-3" />
                      <span>Drag to Scrub Instantly</span>
                    </span>
                    <span>Ep {effectiveMax}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max={effectiveMax}
                    value={selectedEp}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      updateEpisode(val);
                    }}
                    className="w-full accent-amber-500 cursor-pointer h-2 bg-sand-200 dark:bg-stone-700 rounded-lg appearance-none"
                  />
                </div>
              )}

              {/* Quick Select & Skip to Canon Shortcut Buttons */}
              <div className="flex flex-wrap gap-1.5 justify-center pt-0.5">
                <button
                  onClick={() => updateEpisode(1)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md border-2 border-stone-900 transition-all ${
                    selectedEp === 1 
                      ? 'bg-amber-400 text-stone-950 shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)] font-black' 
                      : 'bg-sand-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-sand-200'
                  }`}
                >
                  Start at Ep 1
                </button>

                {/* Skip to Next Canon Shortcut if current episode is a filler */}
                {fillerInfo.hasFiller && (() => {
                  const currentMeta = fillerInfo.episodes.find(e => e.episode === selectedEp);
                  if (currentMeta?.type === 'filler') {
                    const nextCanon = getNextCanonEpisode(selectedEp, fillerInfo.episodes, effectiveMax);
                    if (nextCanon > selectedEp) {
                      return (
                        <button
                          onClick={() => updateEpisode(nextCanon)}
                          className="px-2.5 py-1 text-xs font-black rounded-md border-2 border-stone-900 bg-emerald-400 hover:bg-emerald-300 text-stone-950 flex items-center gap-1 shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)] animate-bounce-subtle"
                          title="Skip filler episodes directly to next canon story episode"
                        >
                          <FastForward className="w-3.5 h-3.5" />
                          <span>Skip to Next Canon (Ep {nextCanon})</span>
                        </button>
                      );
                    }
                  }
                  return null;
                })()}

                <button
                  onClick={handleSetLatest}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md border-2 border-stone-900 flex items-center gap-1 transition-all ${
                    selectedEp === effectiveMax 
                      ? 'bg-emerald-400 text-stone-950 shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)] font-black' 
                      : 'bg-sand-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-sand-200'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 fill-stone-950 text-stone-950" />
                  <span>Latest (Ep {effectiveMax})</span>
                </button>
              </div>
            </>
          )}

          {/* Episode Batches & Quick Select Grid */}
          {!isUnreleased && effectiveMax > 1 && (
            <div className="space-y-2 pt-2 border-t-2 border-stone-900/10 dark:border-stone-100/10">
              {/* Batch Tabs Header (when total episodes > 50) */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono font-black uppercase tracking-wider text-stone-600 dark:text-stone-400">
                  {totalBatches > 1 ? `Batch: Eps ${startEp}–${endEp}` : 'Quick Jump:'}
                </span>

                {fillerInfo.hasFiller && (
                  <div className="flex items-center gap-2 text-[9px] font-mono font-bold text-stone-500">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Canon</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> Filler</span>
                  </div>
                )}
              </div>

              {/* Horizontal Scrollable Batch Range Pills for large shows like One Piece */}
              {totalBatches > 1 && (
                <div 
                  ref={batchContainerRef}
                  className="flex gap-1.5 overflow-x-auto hide-scrollbar py-0.5 -mx-1 px-1"
                >
                  {Array.from({ length: totalBatches }).map((_, bIdx) => {
                    const bStart = bIdx * BATCH_SIZE + 1;
                    const bEnd = Math.min(effectiveMax, (bIdx + 1) * BATCH_SIZE);
                    const isActive = bIdx === activeBatchIndex;
                    const containsSelected = selectedEp >= bStart && selectedEp <= bEnd;

                    return (
                      <button
                        key={bIdx}
                        data-batch={bIdx}
                        onClick={() => setActiveBatchIndex(bIdx)}
                        className={`shrink-0 px-2.5 py-1 rounded text-[11px] font-mono font-black border-2 border-stone-900 transition-all ${
                          isActive
                            ? 'bg-amber-400 text-stone-950 shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)] scale-105'
                            : containsSelected
                              ? 'bg-amber-400/30 text-amber-900 dark:text-amber-200 hover:bg-amber-400/50'
                              : 'bg-sand-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-sand-200'
                        }`}
                      >
                        {bStart}–{bEnd}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Episode Pills Grid */}
              <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-1.5 max-h-40 overflow-y-auto hide-scrollbar p-0.5">
                {currentBatchPills.map(ep => {
                  const isSelected = selectedEp === ep;
                  const isLatest = ep === effectiveMax;
                  const epMeta = fillerInfo.episodes.find(e => e.episode === ep);
                  const isFiller = epMeta?.type === 'filler';

                  return (
                    <button
                      key={ep}
                      onClick={() => handleSelectPill(ep)}
                      className={`py-1.5 text-xs font-bold rounded border-2 border-stone-900 transition-all active:scale-95 relative ${
                        isSelected 
                          ? 'bg-amber-400 text-stone-950 font-black shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)] scale-105 z-10' 
                          : isLatest
                            ? 'bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 font-bold hover:bg-emerald-500/35'
                            : isFiller
                              ? 'bg-rose-500/15 text-rose-800 dark:text-rose-300 hover:bg-rose-500/25 border-rose-500/60'
                              : 'bg-sand-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-sand-200 dark:hover:bg-stone-700'
                      }`}
                      title={isFiller ? `Ep ${ep} (Filler)` : `Ep ${ep} (Canon)`}
                    >
                      {ep}
                      {fillerInfo.hasFiller && (
                        <span className={`absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full ${isFiller ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t-2 border-stone-900 bg-sand-100 dark:bg-stone-800 flex items-center gap-2 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border-2 border-stone-900 bg-sand-200 dark:bg-stone-700 text-stone-800 dark:text-stone-100 font-bold text-xs hover:bg-sand-300 transition-all active:translate-y-0.5"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            className="flex-2 py-2.5 px-4 rounded-lg border-2 border-stone-900 bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(24,19,13,1)] transition-all active:translate-y-0.5"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Save Progress (Ep {selectedEp})</span>
          </button>
        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
