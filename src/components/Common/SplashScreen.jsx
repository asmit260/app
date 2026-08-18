import React, { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';
import { prefetchInitialData } from '../../services/anilist';
import { fetchLiveNews } from '../../services/news';

export default function SplashScreen({ onFinish }) {
  const [progress, setProgress] = useState(25);
  const [statusText, setStatusText] = useState('Initializing Scout Database...');
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let finished = false;

    const completeSplash = () => {
      if (finished || !isMounted) return;
      finished = true;
      setProgress(100);
      setStatusText("Ready! Shinzo wo Sasageyo!");

      setTimeout(() => {
        if (!isMounted) return;
        setIsFadingOut(true);
        setTimeout(() => {
          if (isMounted) onFinish();
        }, 250);
      }, 150);
    };

    // Step progression timers
    const t1 = setTimeout(() => {
      if (isMounted && !finished) {
        setProgress(60);
        setStatusText("Fetching Today's Airing Schedule...");
      }
    }, 200);

    const t2 = setTimeout(() => {
      if (isMounted && !finished) {
        setProgress(85);
        setStatusText("Loading Trending Anime News...");
      }
    }, 450);

    // Parallel prefetching with quick fallback
    Promise.allSettled([
      prefetchInitialData(),
      fetchLiveNews()
    ]).then(() => {
      if (isMounted && !finished) {
        setTimeout(completeSplash, 600); // Allow at least 600ms for smooth animation
      }
    }).catch(() => {
      if (isMounted && !finished) completeSplash();
    });

    // Hard ceiling timer (MAX 1100ms) - guarantees splash NEVER hangs
    const safetyTimer = setTimeout(() => {
      completeSplash();
    }, 1100);

    return () => {
      isMounted = false;
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(safetyTimer);
    };
  }, [onFinish]);

  return (
    <div 
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-sand-100 dark:bg-sand-100 transition-all duration-300 select-none ${
        isFadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Ambient background comic dots */}
      <div className="absolute inset-0 bg-manga-dots opacity-40 pointer-events-none" />

      {/* Decorative Glow Blobs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-amber-400/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-navy-700/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center max-w-xs w-full px-6 text-center">
        
        {/* Animated Avatar / Scout Emblem */}
        <div className="relative mb-6">
          {/* Rotating scouting aura ring */}
          <div className="absolute -inset-2.5 rounded-full border-2 border-dashed border-amber-400 animate-spin" style={{ animationDuration: '8s' }} />
          
          <div className="w-24 h-24 rounded-full bg-navy-900 border-[3.5px] border-stone-900 overflow-hidden shadow-manga-lg flex items-center justify-center relative">
            <img 
              src="/assets/images/levi-avatar.webp" 
              alt="Captain Levi" 
              className="w-full h-full object-cover"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>

          <div className="absolute -bottom-2 -right-2 bg-amber-400 text-ink-900 p-1.5 rounded-full border-2 border-stone-900 shadow-[2px_2px_0px_0px_rgba(24,19,13,1)]">
            <Zap className="w-4 h-4 fill-current" />
          </div>
        </div>

        {/* Brand Sticker Title */}
        <div className="btn-manga bg-amber-400 text-ink-900 px-6 py-2 text-2xl font-black uppercase tracking-tight -rotate-1 mb-2 shadow-manga-lg">
          AniTrack
        </div>

        <p className="font-display font-bold text-xs text-stone-600 dark:text-stone-400 tracking-wide mb-8">
          Anime Airing Timetables & Companion
        </p>

        {/* Dynamic Progress Bar */}
        <div className="w-full space-y-2">
          <div className="h-3 w-full bg-sand-200 dark:bg-sand-300 rounded-full border-2 border-stone-900 overflow-hidden p-0.5 shadow-sm">
            <div 
              className="h-full bg-amber-400 rounded-full border-r border-stone-900 transition-all duration-300 ease-out"
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
          Powered by AniList & MAL
        </p>
      </div>
    </div>
  );
}
