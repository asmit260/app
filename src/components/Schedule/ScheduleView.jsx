import React, { useState, useEffect } from 'react';
import { Clock, Calendar as CalendarIcon, Download, Plus, Check, Play, ChevronRight, Globe } from 'lucide-react';
import { anilistQuery, WEEKLY_AIRING_SCHEDULE_QUERY } from '../../services/anilist';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ScheduleView({ 
  watchlist, 
  onUpdateWatchlist, 
  onSelectAnime, 
  titleLanguage = 'english' 
}) {
  const todayIndex = new Date().getDay();
  const [selectedDay, setSelectedDay] = useState(todayIndex === 0 ? 6 : todayIndex - 1); // 0=Mon ... 6=Sun
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userTimezone, setUserTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');

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

  const getTitle = (media) => {
    if (!media?.title) return 'Unknown Title';
    if (titleLanguage === 'romaji') return media.title.romaji || media.title.english || media.title.native;
    if (titleLanguage === 'native') return media.title.native || media.title.romaji || media.title.english;
    return media.title.english || media.title.romaji || media.title.native;
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

  const isAnimeInWatchlist = (animeId) => {
    return watchlist.some(item => item.anime_id === animeId || item.id === animeId);
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

          <div className="text-right">
            <span className="inline-block px-2.5 py-1 text-xs font-black uppercase bg-amber-400 text-ink-900 border-2 border-stone-900 shadow-[2px_2px_0px_0px_rgba(24,19,13,1)]">
              {daysNav[selectedDay].full}
            </span>
          </div>
        </div>

        {/* Days Pill Selector (Horizontal Scroll) */}
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

      {/* Schedulers List */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="card-manga-panel p-3 h-28 flex gap-3 shimmer-skeleton"></div>
          ))}
        </div>
      ) : schedules.length === 0 ? (
        <div className="card-manga-panel p-8 text-center bg-sand-50 dark:bg-sand-200">
          <CalendarIcon className="w-10 h-10 text-stone-400 mx-auto mb-2" />
          <p className="font-display font-bold text-base text-ink-900">No scheduled episodes found</p>
          <p className="text-xs text-stone-500 font-sans mt-1">Check back later or browse other days.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {schedules.map((item) => {
            const media = item.media;
            const title = getTitle(media);
            const inList = isAnimeInWatchlist(media.id);
            const isAired = item.airingAt <= Math.floor(Date.now() / 1000);

            return (
              <div 
                key={item.id}
                className="card-manga-panel p-3 flex gap-3 group relative cursor-pointer hover:border-amber-500 transition-colors"
                onClick={() => onSelectAnime(media.id)}
              >
                {/* Poster Cover */}
                <div className="w-16 h-22 shrink-0 rounded-sm overflow-hidden border-2 border-stone-900 relative bg-sand-200">
                  <img 
                    src={media.coverImage?.large || media.coverImage?.medium} 
                    alt={title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                  <div className="absolute top-1 left-1">
                    <span className="px-1 py-0.5 text-[9px] font-mono font-black bg-stone-900 text-sand-50 rounded-[2px]">
                      EP {item.episode}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="flex-grow flex flex-col justify-between min-w-0 pr-8">
                  <div>
                    <h3 className="font-display font-bold text-sm text-ink-900 leading-snug line-clamp-2 group-hover:text-navy-700 transition-colors">
                      {title}
                    </h3>
                    <p className="text-[11px] text-stone-500 font-sans mt-0.5 truncate">
                      {media.studios?.nodes?.[0]?.name || media.format || 'TV'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <span className="flex items-center gap-1 font-mono text-[11px] font-bold text-ink-900 bg-sand-200 dark:bg-sand-300 px-2 py-0.5 rounded border border-stone-900/40">
                      <Clock className="w-3 h-3 text-stone-600" />
                      {formatAiringTime(item.airingAt)}
                    </span>

                    <span className={`text-[10px] font-mono font-bold ${
                      isAired ? 'text-status-completed' : 'text-amber-500'
                    }`}>
                      {formatCountdown(item.airingAt)}
                    </span>
                  </div>
                </div>

                {/* Quick Add / In List Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!inList) {
                      onUpdateWatchlist(media, 'watching');
                    }
                  }}
                  className={`absolute top-3 right-3 w-8 h-8 rounded-md border-2 border-stone-900 flex items-center justify-center transition-all ${
                    inList 
                      ? 'bg-status-watching text-sand-50 shadow-none' 
                      : 'bg-sand-50 hover:bg-amber-400 text-ink-900 shadow-[2px_2px_0px_0px_rgba(24,19,13,1)] active:translate-y-0.5'
                  }`}
                  title={inList ? 'In Watchlist' : 'Add to Watching'}
                >
                  {inList ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </button>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
