import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Plus, Minus, Tv, Zap, Sparkles } from 'lucide-react';
import { sound } from '../../services/soundEffects';
import { burstConfetti } from '../../utils/confetti';

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

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Initialize with current watched episode (or 1 if 0) capped at maxAiredEp
      const initial = Math.max(1, Math.min(Number(currentEp) || 1, maxAiredEp || 1));
      setSelectedEp(initial);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, currentEp, maxAiredEp]);

  if (!isOpen || !anime) return null;

  const getTitle = () => {
    if (!anime) return 'Anime';
    if (typeof anime.title === 'string') return anime.title;
    if (titleLanguage === 'romaji') return anime.title?.romaji || anime.title?.english || anime.title?.native;
    if (titleLanguage === 'native') return anime.title?.native || anime.title?.romaji || anime.title?.english;
    return anime.title?.english || anime.title?.romaji || anime.title?.native || 'Anime';
  };

  const cover = anime.coverImage?.large || anime.coverImage?.medium || anime.coverImage || anime.anime_cover || anime.image || '';
  const effectiveMax = Math.max(1, maxAiredEp || 1);

  const handleStep = (delta) => {
    const next = Math.max(1, Math.min(effectiveMax, selectedEp + delta));
    if (next !== selectedEp) {
      sound.playEpisodeStep();
      setSelectedEp(next);
    }
  };

  const handleSelectPill = (epNum) => {
    sound.playEpisodeStep();
    setSelectedEp(epNum);
  };

  const handleSetLatest = () => {
    sound.playEpisodeStep();
    setSelectedEp(effectiveMax);
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

  // Generate episode numbers for quick-select grid
  const epPills = [];
  const pillLimit = Math.min(effectiveMax, 36);
  for (let i = 1; i <= pillLimit; i++) {
    epPills.push(i);
  }

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3.5 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      style={{ touchAction: 'none' }}
    >
      <div 
        className="card-manga-panel w-[92vw] max-w-[390px] sm:max-w-md bg-sand-50 dark:bg-stone-900 border-2 border-stone-900 rounded-xl shadow-[5px_5px_0px_0px_rgba(24,19,13,1)] overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
        style={{ touchAction: 'auto' }}
      >
        {/* Modal Header */}
        <div className="p-3.5 sm:p-4 border-b-2 border-stone-900 bg-sand-100 dark:bg-stone-800 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            {cover && (
              <img 
                src={cover} 
                alt={getTitle()} 
                className="w-10 h-13 object-cover rounded-md border-2 border-stone-900 shrink-0 bg-sand-200 shadow-sm"
              />
            )}
            <div className="min-w-0 flex-1">
              <h3 className="font-display font-black text-sm text-ink-900 dark:text-sand-50 line-clamp-1 leading-snug">
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
            className="p-1.5 text-stone-500 hover:text-ink-900 dark:hover:text-sand-50 rounded-md border-2 border-transparent hover:border-stone-900 hover:bg-sand-200 dark:hover:bg-stone-700 transition-all shrink-0"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto hide-scrollbar">
          
          {/* Question Title */}
          <div className="text-center space-y-1">
            <h4 className="font-display font-black text-base sm:text-lg text-ink-900 dark:text-sand-50 flex items-center justify-center gap-1.5">
              <Tv className="w-4 h-4 text-amber-500" />
              <span>Which episode are you on?</span>
            </h4>
            <p className="text-xs text-stone-600 dark:text-stone-400 font-sans">
              Choose your current progress below
            </p>
          </div>

          {/* Stepper Control */}
          <div className="flex items-center justify-center gap-3 py-1">
            <button
              onClick={() => handleStep(-1)}
              disabled={selectedEp <= 1}
              className="w-11 h-11 rounded-lg border-2 border-stone-900 bg-sand-100 dark:bg-stone-800 text-ink-900 dark:text-sand-50 font-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(24,19,13,1)] active:translate-y-0.5 disabled:opacity-30 disabled:pointer-events-none transition-all hover:bg-sand-200 dark:hover:bg-stone-700"
              title="Decrease Episode (-1)"
            >
              <Minus className="w-5 h-5 stroke-[3]" />
            </button>

            <div className="min-w-[130px] px-4 py-2 bg-amber-400 dark:bg-amber-500 border-2 border-stone-900 rounded-lg shadow-[2.5px_2.5px_0px_0px_rgba(24,19,13,1)] text-center">
              <span className="text-[9px] font-mono uppercase font-black tracking-wider block text-stone-950/70">
                CURRENT EPISODE
              </span>
              <span className="font-display font-black text-2xl text-stone-950 leading-tight">
                {selectedEp} <span className="text-xs font-mono font-bold opacity-75">/ {effectiveMax}</span>
              </span>
            </div>

            <button
              onClick={() => handleStep(1)}
              disabled={selectedEp >= effectiveMax}
              className="w-11 h-11 rounded-lg border-2 border-stone-900 bg-sand-100 dark:bg-stone-800 text-ink-900 dark:text-sand-50 font-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(24,19,13,1)] active:translate-y-0.5 disabled:opacity-30 disabled:pointer-events-none transition-all hover:bg-sand-200 dark:hover:bg-stone-700"
              title="Increase Episode (+1)"
            >
              <Plus className="w-5 h-5 stroke-[3]" />
            </button>
          </div>

          {/* Quick Select Shortcut Buttons */}
          <div className="flex gap-2 justify-center pt-1">
            <button
              onClick={() => handleSelectPill(1)}
              className={`px-3 py-1.5 text-xs font-bold rounded-md border-2 border-stone-900 transition-all ${
                selectedEp === 1 
                  ? 'bg-amber-400 text-stone-950 shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)] font-black' 
                  : 'bg-sand-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-sand-200'
              }`}
            >
              Start at Ep 1
            </button>

            <button
              onClick={handleSetLatest}
              className={`px-3 py-1.5 text-xs font-bold rounded-md border-2 border-stone-900 flex items-center gap-1.5 transition-all ${
                selectedEp === effectiveMax 
                  ? 'bg-emerald-400 text-stone-950 shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)] font-black' 
                  : 'bg-sand-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-sand-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5 fill-stone-950 text-stone-950" />
              <span>Latest (Ep {effectiveMax})</span>
            </button>
          </div>

          {/* Episode Pills Grid */}
          {epPills.length > 1 && (
            <div className="space-y-1.5 pt-2.5 border-t border-stone-900/10 dark:border-stone-100/10">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 block">
                Quick Jump:
              </span>
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 max-h-36 overflow-y-auto hide-scrollbar p-0.5">
                {epPills.map(ep => {
                  const isSelected = selectedEp === ep;
                  const isLatest = ep === effectiveMax;

                  return (
                    <button
                      key={ep}
                      onClick={() => handleSelectPill(ep)}
                      className={`py-1.5 text-xs font-bold rounded border-2 border-stone-900 transition-all active:scale-95 ${
                        isSelected 
                          ? 'bg-amber-400 text-stone-950 font-black shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)] scale-105' 
                          : isLatest
                            ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold hover:bg-emerald-500/30'
                            : 'bg-sand-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-sand-200 dark:hover:bg-stone-700'
                      }`}
                    >
                      {ep}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t-2 border-stone-900 bg-sand-100 dark:bg-stone-800 flex items-center gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border-2 border-stone-900 bg-sand-200 dark:bg-stone-700 text-stone-800 dark:text-sand-50 font-bold text-xs hover:bg-sand-300 transition-all active:translate-y-0.5"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            className="flex-2 py-2 px-4 rounded-lg border-2 border-stone-900 bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(24,19,13,1)] transition-all active:translate-y-0.5"
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

