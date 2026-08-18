import React, { useMemo } from 'react';
import { Flame, Clock, Film, CheckCircle2, BarChart2 } from 'lucide-react';
import { getWatchHistory } from '../../services/storage';

export default function StatsView({ watchlist }) {
  const history = useMemo(() => getWatchHistory(), [watchlist]);

  // Metrics calculation (memoized for performance)
  const totalWatchedEpisodes = useMemo(() =>
    watchlist.reduce((sum, item) => sum + (item.episodes_watched || 0), 0)
  , [watchlist]);

  const completedAnime = useMemo(() => watchlist.filter(item => item.status === 'completed').length, [watchlist]);

  // Time calculation (assume 24 mins per episode)
  const totalMinutes = totalWatchedEpisodes * 24;
  const days = (totalMinutes / 1440).toFixed(1);
  const hours = (totalMinutes / 60).toFixed(0);

  // Calculate watch streak from history (DST safe)
  const calculateStreak = () => {
    if (history.length === 0) return { current: 0, longest: 0 };
    const uniqueDays = new Set();
    history.forEach(item => {
      if (item.watched_at) {
        uniqueDays.add(new Date(item.watched_at).toISOString().split('T')[0]);
      }
    });

    const sorted = [...uniqueDays].sort().reverse();
    if (sorted.length === 0) return { current: 0, longest: 0 };

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    let current = 0;
    if (sorted[0] === today || sorted[0] === yesterday) {
      current = 1;
      for (let i = 1; i < sorted.length; i++) {
        const diffDays = Math.round((new Date(sorted[i - 1]) - new Date(sorted[i])) / 86400000);
        if (diffDays === 1) current++;
        else break;
      }
    }

    const asc = [...uniqueDays].sort();
    let longest = 1, run = 1;
    for (let i = 1; i < asc.length; i++) {
      const diffDays = Math.round((new Date(asc[i]) - new Date(asc[i - 1])) / 86400000);
      if (diffDays === 1) {
        run++;
        longest = Math.max(longest, run);
      } else {
        run = 1;
      }
    }

    return { current, longest: Math.max(longest, current) };
  };

  const streak = useMemo(() => calculateStreak(), [history]);

  // Genre distribution (memoized)
  const sortedGenres = useMemo(() => {
    const genreCounts = {};
    watchlist.forEach(item => {
      (item.genres || []).forEach(g => {
        genreCounts[g] = (genreCounts[g] || 0) + 1;
      });
    });
    return Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [watchlist]);

  const maxGenreCount = sortedGenres[0]?.[1] || 1;

  return (
    <div className="space-y-4 pb-20">

      {/* Header */}
      <div className="card-manga-panel p-4 bg-sand-50 dark:bg-sand-200">
        <h1 className="font-display font-black text-xl md:text-2xl text-ink-900 uppercase tracking-tight">
          Anime Analytics
        </h1>
        <p className="text-xs text-stone-500 font-sans mt-0.5">
          Your personal anime consumption breakdown and watch milestones
        </p>
      </div>

      {/* Top Highlight Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Episodes Card */}
        <div className="card-manga-panel p-3.5 bg-sand-50 dark:bg-sand-200 flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-bold uppercase">Episodes</span>
            <Film className="w-4 h-4 text-amber-500" />
          </div>
          <p className="font-mono font-black text-2xl text-ink-900 mt-2">
            {totalWatchedEpisodes}
          </p>
          <span className="text-[10px] text-stone-500 font-sans">Total watched</span>
        </div>

        {/* Time Spent Card */}
        <div className="card-manga-panel p-3.5 bg-sand-50 dark:bg-sand-200 flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-bold uppercase">Time</span>
            <Clock className="w-4 h-4 text-navy-700" />
          </div>
          <p className="font-mono font-black text-2xl text-ink-900 mt-2">
            {days}d
          </p>
          <span className="text-[10px] text-stone-500 font-sans">~{hours} hours total</span>
        </div>

        {/* Watch Streak Card */}
        <div className="card-manga-panel p-3.5 bg-sand-50 dark:bg-sand-200 flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-bold uppercase">Streak</span>
            <Flame className="w-4 h-4 text-red-500" />
          </div>
          <p className="font-mono font-black text-2xl text-red-500 mt-2">
            {streak.current} 🔥
          </p>
          <span className="text-[10px] text-stone-500 font-sans">Best: {streak.longest} days</span>
        </div>

        {/* Completed Anime Card */}
        <div className="card-manga-panel p-3.5 bg-sand-50 dark:bg-sand-200 flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-bold uppercase">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-status-completed" />
          </div>
          <p className="font-mono font-black text-2xl text-status-completed mt-2">
            {completedAnime}
          </p>
          <span className="text-[10px] text-stone-500 font-sans">Series finished</span>
        </div>
      </div>

      {/* Genre Distribution Breakdown */}
      <div className="card-manga-panel p-4 bg-sand-50 dark:bg-sand-200 space-y-3">
        <h2 className="font-display font-black text-base text-ink-900 uppercase tracking-tight flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-stone-600" />
          Top Favorite Genres
        </h2>

        {sortedGenres.length === 0 ? (
          <p className="text-xs text-stone-500 italic py-2">Add anime to your list to see your genre distribution.</p>
        ) : (
          <div className="space-y-2.5 pt-1">
            {sortedGenres.map(([genre, count]) => {
              const pct = Math.round((count / maxGenreCount) * 100);

              return (
                <div key={genre} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-ink-900">{genre}</span>
                    <span className="font-mono text-stone-500">{count} anime</span>
                  </div>
                  <div className="h-2.5 w-full bg-sand-200 dark:bg-sand-300 rounded-full overflow-hidden border border-stone-900/30">
                    <div 
                      className="h-full bg-amber-400 border-r border-stone-900 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
