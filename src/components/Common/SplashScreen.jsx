import React, { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';
import { prefetchInitialData } from '../../services/anilist';

export default function SplashScreen({ onFinish }) {
  const [progress, setProgress] = useState(40);
  const [statusText, setStatusText] = useState('Initializing Scout Database...');
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    let finished = false;

    const safeFinish = () => {
      if (finished) return;
      finished = true;
      setProgress(100);
      setIsFadingOut(true);
      setTimeout(() => {
        onFinish?.();
      }, 150);
    };

    // Step 1 progress bump
    const t1 = setTimeout(() => {
      if (!finished) {
        setProgress(85);
        setStatusText("Ready! Shinzo wo Sasageyo!");
      }
    }, 150);

    // Fast background schedule prefetching
    prefetchInitialData()
      .then(() => {
        setTimeout(safeFinish, 200);
      })
      .catch(() => {
        safeFinish();
      });

    // Guaranteed hard ceiling exit timer (max 500ms)
    const safetyTimer = setTimeout(safeFinish, 500);

    return () => {
      finished = true;
      clearTimeout(t1);
      clearTimeout(safetyTimer);
    };
  }, [onFinish]);

  return (
    <div 
      onClick={onFinish}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-sand-100 dark:bg-sand-100 transition-opacity duration-200 select-none cursor-pointer ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Ambient background comic dots */}
      <div className="absolute inset-0 bg-manga-dots opacity-40 pointer-events-none" />

      {/* Decorative Glow Blobs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-navy-700/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center max-w-xs w-full px-6 text-center">
        
        {/* Animated Brand Emblem */}
        <div className="relative mb-6">
          <div className="absolute -inset-2.5 rounded-full border-2 border-dashed border-amber-400 animate-spin" style={{ animationDuration: '8s' }} />
          
          <div className="w-20 h-20 rounded-full bg-navy-900 border-[3px] border-stone-900 overflow-hidden shadow-manga-lg flex items-center justify-center relative font-display font-black text-3xl text-amber-400">
            A
          </div>

          <div className="absolute -bottom-1.5 -right-1.5 bg-amber-400 text-ink-900 p-1.5 rounded-full border-2 border-stone-900 shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)]">
            <Zap className="w-3.5 h-3.5 fill-current" />
          </div>
        </div>

        {/* Brand Sticker Title */}
        <div className="btn-manga bg-amber-400 text-ink-900 px-6 py-2 text-2xl font-black uppercase tracking-tight -rotate-1 mb-2 shadow-manga-lg">
          AniTrack
        </div>

        <p className="font-display font-bold text-xs text-stone-600 dark:text-stone-400 tracking-wide mb-8">
          Airing Timetable & Watchlist
        </p>

        {/* Dynamic Progress Bar */}
        <div className="w-full space-y-2">
          <div className="h-3 w-full bg-sand-200 dark:bg-sand-300 rounded-full border-2 border-stone-900 overflow-hidden p-0.5 shadow-sm">
            <div 
              className="h-full bg-amber-400 rounded-full border-r border-stone-900 transition-all duration-200 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Status Message */}
          <div className="flex items-center justify-between text-[11px] font-mono font-bold text-stone-600 dark:text-stone-400 px-1">
            <span className="truncate max-w-[200px]">{statusText}</span>
            <span className="text-ink-900 dark:text-sand-50">{progress}%</span>
          </div>
        </div>

      </div>

      {/* Bottom Scout Regiment Creed */}
      <div className="absolute bottom-6 inset-x-0 text-center">
        <p className="font-mono text-[10px] uppercase font-bold text-stone-500 tracking-widest">
          Powered by AniList
        </p>
      </div>
    </div>
  );
}
