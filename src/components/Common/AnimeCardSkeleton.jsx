import React from 'react';

export default function AnimeCardSkeleton({ count = 1 }) {
  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <>
      {items.map((key) => (
        <article
          key={key}
          className="card-manga-panel flex flex-col min-h-[385px] sm:min-h-[420px] h-full bg-sand-50 dark:bg-sand-200 overflow-hidden select-none border-2 border-stone-900 shadow-manga animate-skeleton-pulse"
        >
          {/* Poster Image Area */}
          <div className="relative h-[180px] sm:h-[220px] w-full bg-sand-200 dark:bg-sand-300 border-b-2 border-stone-900 overflow-hidden">
            <div className="shimmer-skeleton absolute inset-0" />
            
            {/* Top Left Notification Bell Placeholder */}
            <div className="absolute top-2 left-2 w-7 h-7 rounded-md border-2 border-stone-900 bg-sand-100 dark:bg-sand-400 shadow-xs opacity-75" />

            {/* Bottom Left Airing Countdown Badge Placeholder */}
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
              <div className="h-5 w-24 rounded-sm border border-stone-900 bg-sand-100 dark:bg-sand-400 shadow-xs" />
              <div className="h-5 w-12 rounded-sm border border-stone-900 bg-amber-400/80 shadow-xs" />
            </div>
          </div>

          {/* Content Area */}
          <div className="p-3 flex flex-col flex-grow justify-between space-y-3">
            <div className="space-y-2">
              {/* Studio & Format Tags */}
              <div className="flex items-center gap-1.5">
                <div className="h-3.5 w-16 rounded bg-sand-200 dark:bg-sand-300" />
                <div className="h-3.5 w-10 rounded bg-sand-200 dark:bg-sand-300" />
              </div>

              {/* Title Placeholder Lines */}
              <div className="space-y-1.5 pt-0.5">
                <div className="h-4 w-[90%] rounded bg-stone-300 dark:bg-stone-600 shimmer-skeleton" />
                <div className="h-4 w-[60%] rounded bg-stone-300 dark:bg-stone-600 shimmer-skeleton" />
              </div>

              {/* Genre / Tags */}
              <div className="flex items-center gap-1 pt-1">
                <div className="h-3 w-12 rounded bg-sand-200 dark:bg-sand-300" />
                <div className="h-3 w-14 rounded bg-sand-200 dark:bg-sand-300" />
              </div>
            </div>

            {/* Action Buttons Placeholder */}
            <div className="pt-2 border-t border-stone-900/10 dark:border-stone-900/40">
              <div className="h-8 w-full rounded-md border-2 border-stone-900 bg-sand-200 dark:bg-sand-300 shadow-xs flex items-center justify-center">
                <div className="h-3 w-24 rounded bg-stone-300 dark:bg-stone-500 opacity-60" />
              </div>
            </div>
          </div>
        </article>
      ))}
    </>
  );
}
