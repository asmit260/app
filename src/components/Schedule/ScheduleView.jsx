import React, { useState, useEffect, useMemo } from 'react';
import { Clock, Calendar as CalendarIcon, Globe, LayoutGrid, List } from 'lucide-react';
import { anilistQuery, WEEKLY_AIRING_SCHEDULE_QUERY } from '../../services/anilist';
import AnimeCard from '../Common/AnimeCard';

export default function ScheduleView({ 
  watchlist, 
  onUpdateWatchlist, 
  onRemoveItem,
  onSelectAnime, 
  titleLanguage = 'english' 
}) {
  const todayIndex = new Date().getDay();
  const [selectedDay, setSelectedDay] = useState(todayIndex === 0 ? 6 : todayIndex - 1); // 0=Mon ... 6=Sun
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const userTimezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', []);

  // Fast hash map for watchlist lookups
  const watchlistMap = useMemo(() => {
    const map = {};
    watchlist.forEach(item => {
      map[item.anime_id || item.id] = item;
    });
    return map;
  }, [watchlist]);

  useEffect(() => {
    fetchDaySchedule(selectedDay);
  }, [selectedDay]);

  const fetchDaySchedule = async (dayMonIndex) => {
    setLoading(true);
    try {
      const now = new Date();
      const currentDay = now.getDay();
      const currentMonIndex = currentDay === 0 ? 6 : currentDay - 1;
      const diff = dayMonIndex - currentMonIndex;

      const targetStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff, 0, 0, 0, 0);
      const targetEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff, 23, 59, 59, 999);

      const variables = {
        airingAt_greater: Math.floor(targetStart.getTime() / 1000),
        airingAt_lesser: Math.floor(targetEnd.getTime() / 1000),
        page: 1
      };

      const res = await anilistQuery(WEEKLY_AIRING_SCHEDULE_QUERY, variables);
      if (res?.Page?.airingSchedules) {
        setSchedules(res.Page.airingSchedules);
      }
    } catch (err) {
      console.error("Failed to load schedule:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatAiringTime = (unix) => {
    const d = new Date(unix * 1000);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatCountdown = (unix) => {
    const diff = unix - Math.floor(Date.now() / 1000);
    if (diff <= 0) return 'Aired';
    const hours = Math.floor(diff / 3600);
    const mins = Math.floor((diff % 3600) / 60);
    if (hours > 24) return `in ${Math.floor(hours / 24)}d ${hours % 24}h`;
    return `in ${hours}h ${mins}m`;
  };

  const daysNav = [
    { label: 'Mon', full: 'Monday', idx: 0 },
    { label: 'Tue', full: 'Tuesday', idx: 1 },
    { label: 'Wed', full: 'Wednesday', idx: 2 },
    { label: 'Thu', full: 'Thursday', idx: 3 },
    { label: 'Fri', full: 'Friday', idx: 4 },
    { label: 'Sat', full: 'Saturday', idx: 5 },
    { label: 'Sun', full: 'Sunday', idx: 6 }
  ];

  return (
    <div className="space-y-4 pb-20">
      
      {/* Header Banner */}
      <div className="card-manga-panel p-4 bg-sand-50 dark:bg-sand-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-black text-xl md:text-2xl text-ink-900 uppercase tracking-tight">
              Airing Schedule
            </h1>
            <p className="text-xs text-stone-600 font-sans mt-0.5 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-stone-500" />
              Timezone: <span className="font-bold text-ink-900">{userTimezone.replace('_', ' ')}</span>
            </p>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1.5 bg-sand-200 dark:bg-sand-300 p-1 rounded-md border-2 border-stone-900 shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)]">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition-all ${
                viewMode === 'grid' 
                  ? 'bg-amber-400 text-ink-900 font-black shadow-sm' 
                  : 'text-stone-600 hover:text-ink-900'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition-all ${
                viewMode === 'list' 
                  ? 'bg-amber-400 text-ink-900 font-black shadow-sm' 
                  : 'text-stone-600 hover:text-ink-900'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Days Pill Selector */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pt-3 mt-3 border-t-2 border-sand-300 dark:border-sand-400">
          {daysNav.map((day) => {
            const isToday = (todayIndex === 0 ? 6 : todayIndex - 1) === day.idx;
            const isSelected = selectedDay === day.idx;

            return (
              <button
                key={day.idx}
                onClick={() => setSelectedDay(day.idx)}
                className={`shrink-0 px-3.5 py-1.5 rounded-md font-sans text-xs font-black transition-all border-2 border-stone-900 relative ${
                  isSelected
                    ? 'bg-amber-400 text-ink-900 shadow-[2.5px_2.5px_0px_0px_rgba(24,19,13,1)] scale-[1.03]'
                    : 'bg-sand-100 dark:bg-sand-300 text-stone-700 hover:bg-sand-200'
                }`}
              >
                {day.label}
                {isToday && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-status-watching border border-stone-900" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Schedulers View */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
            <div key={i} className="card-manga-panel h-[385px] shimmer-skeleton rounded-md" />
          ))}
        </div>
      ) : schedules.length === 0 ? (
        <div className="card-manga-panel p-8 text-center bg-sand-50 dark:bg-sand-200">
          <CalendarIcon className="w-10 h-10 text-stone-400 mx-auto mb-2" />
          <p className="font-display font-bold text-base text-ink-900">No scheduled episodes found</p>
          <p className="text-xs text-stone-500 font-sans mt-1">Check back later or browse other weekdays.</p>
        </div>
      ) : (
        <div className={
          viewMode === 'grid'
            ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5"
            : "space-y-3"
        }>
          {schedules.map((item) => {
            const media = item.media;
            const isAired = item.airingAt <= Math.floor(Date.now() / 1000);
            const airingInfo = {
              episode: item.episode,
              time: formatAiringTime(item.airingAt),
              countdown: formatCountdown(item.airingAt),
              isAired
            };

            return (
              <AnimeCard
                key={item.id}
                anime={media}
                watchlistEntry={watchlistMap[media.id]}
                onUpdateStatus={onUpdateWatchlist}
                onRemoveItem={onRemoveItem}
                onSelectAnime={onSelectAnime}
                titleLanguage={titleLanguage}
                airingInfo={airingInfo}
              />
            );
          })}
        </div>
      )}

    </div>
  );
}
