import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Clock, Calendar as CalendarIcon, Globe, LayoutGrid, List, Search, Filter, Sparkles, Check } from 'lucide-react';
import { anilistQuery, WEEKLY_AIRING_SCHEDULE_QUERY } from '../../services/anilist';
import { getActiveAnimeAlerts } from '../../services/notifications';
import AnimeCard from '../Common/AnimeCard';
import AiringAlertModal from './AiringAlertModal';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'tracked' | 'upcoming'
  const [activeAlerts, setActiveAlerts] = useState({});
  const [selectedAlertAnime, setSelectedAlertAnime] = useState(null);
  const [selectedAlertInfo, setSelectedAlertInfo] = useState(null);

  const userTimezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', []);

  // Fast hash map for watchlist lookups
  const watchlistMap = useMemo(() => {
    const map = {};
    (watchlist || []).forEach(item => {
      map[item.anime_id || item.id] = item;
    });
    return map;
  }, [watchlist]);

  // Load active airing alerts
  const loadAlerts = useCallback(async () => {
    try {
      const alerts = await getActiveAnimeAlerts();
      setActiveAlerts(alerts);
    } catch (e) {
      console.error("Failed to load alerts:", e);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
    const handleAlertsChanged = () => loadAlerts();
    window.addEventListener('anitrack-alerts-changed', handleAlertsChanged);
    return () => window.removeEventListener('anitrack-alerts-changed', handleAlertsChanged);
  }, [loadAlerts]);

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

  const daysNav = [
    { label: 'Mon', idx: 0 },
    { label: 'Tue', idx: 1 },
    { label: 'Wed', idx: 2 },
    { label: 'Thu', idx: 3 },
    { label: 'Fri', idx: 4 },
    { label: 'Sat', idx: 5 },
    { label: 'Sun', idx: 6 },
  ];

  const formatAiringTime = (unixSeconds) => {
    const d = new Date(unixSeconds * 1000);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatCountdown = (unixSeconds) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = unixSeconds - now;
    if (diff <= 0) return 'Aired';
    const hours = Math.floor(diff / 3600);
    const mins = Math.floor((diff % 3600) / 60);
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${mins}m`;
  };

  const handleOpenAlertModal = (anime, airingInfo) => {
    setSelectedAlertAnime(anime);
    setSelectedAlertInfo(airingInfo);
  };

  // Filter schedules based on search and selected mode
  const filteredSchedules = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    return schedules
      .filter(item => {
        const media = item.media;
        const title = (media?.title?.english || media?.title?.romaji || media?.title?.native || '').toLowerCase();
        const matchesSearch = !searchQuery.trim() || title.includes(searchQuery.trim().toLowerCase());

        if (!matchesSearch) return false;

        if (filterMode === 'tracked') {
          return !!watchlistMap[media?.id];
        }
        if (filterMode === 'upcoming') {
          return item.airingAt > now;
        }
        return true;
      })
      .map(item => ({
        ...item,
        airingInfo: {
          episode: item.episode,
          time: formatAiringTime(item.airingAt),
          countdown: formatCountdown(item.airingAt),
          airingAt: item.airingAt,
          isAired: item.airingAt <= now
        }
      }));
  }, [schedules, searchQuery, filterMode, watchlistMap]);

  return (
    <div className="space-y-4 pb-20">

      {/* Header & Days Navigator Bar */}
      <div className="card-manga-panel p-4 bg-sand-50 dark:bg-sand-200 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-black text-xl md:text-2xl text-ink-900 uppercase tracking-tight">
              Airing Schedule
            </h1>
            <p className="text-xs text-stone-500 font-mono flex items-center gap-1 mt-0.5">
              <Globe className="w-3.5 h-3.5" />
              <span>{userTimezone}</span>
            </p>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-sand-200 dark:bg-sand-300 p-1 rounded-md border-2 border-stone-900 shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)]">
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

        {/* Search & Quick Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <div className="relative flex-grow">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search anime title..."
              className="w-full pl-9 pr-3 py-1.5 bg-sand-100 dark:bg-sand-300 border-2 border-stone-900 rounded-md font-sans text-xs text-ink-900 focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
          </div>

          <div className="flex gap-1.5 shrink-0 overflow-x-auto hide-scrollbar">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 text-xs font-bold rounded border-2 border-stone-900 transition-all ${
                filterMode === 'all'
                  ? 'bg-amber-400 text-ink-900 font-black shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)]'
                  : 'bg-sand-100 dark:bg-sand-300 text-stone-700 hover:bg-sand-200'
              }`}
            >
              All Shows ({schedules.length})
            </button>
            <button
              onClick={() => setFilterMode('tracked')}
              className={`px-2.5 py-1 text-xs font-bold rounded border-2 border-stone-900 transition-all flex items-center gap-1 ${
                filterMode === 'tracked'
                  ? 'bg-amber-400 text-ink-900 font-black shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)]'
                  : 'bg-sand-100 dark:bg-sand-300 text-stone-700 hover:bg-sand-200'
              }`}
            >
              <span>My Watchlist</span>
            </button>
            <button
              onClick={() => setFilterMode('upcoming')}
              className={`px-2.5 py-1 text-xs font-bold rounded border-2 border-stone-900 transition-all ${
                filterMode === 'upcoming'
                  ? 'bg-amber-400 text-ink-900 font-black shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)]'
                  : 'bg-sand-100 dark:bg-sand-300 text-stone-700 hover:bg-sand-200'
              }`}
            >
              Upcoming Only
            </button>
          </div>
        </div>

        {/* Days Pill Selector */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pt-3 mt-2 border-t-2 border-sand-300 dark:border-sand-400">
          {daysNav.map((day) => {
            const isToday = (todayIndex === 0 ? 6 : todayIndex - 1) === day.idx;
            const isSelected = selectedDay === day.idx;

            return (
              <button
                key={day.idx}
                onClick={() => setSelectedDay(day.idx)}
                className={`shrink-0 px-4 py-2 rounded-lg font-sans text-xs font-black transition-all border-2 border-stone-900 relative active:scale-95 select-none ${
                  isSelected
                    ? 'bg-amber-400 text-ink-900 shadow-[2.5px_2.5px_0px_0px_rgba(24,19,13,1)] scale-[1.03]'
                    : 'bg-sand-100 dark:bg-sand-300 text-stone-700 dark:text-stone-300 hover:bg-sand-200'
                }`}
              >
                <div className="flex flex-col items-center">
                  <span className="text-[11px] uppercase tracking-wider">{day.label}</span>
                </div>
                {isToday && (
                  <span className="absolute -top-2 -right-1.5 px-1.5 py-0.2 text-[8px] font-black uppercase bg-emerald-500 text-white border border-stone-900 rounded-sm shadow-sm leading-tight">
                    Today
                  </span>
                )}
              </button>
            );
          })}

          {/* Back to Today (when viewing a different day) */}
          {selectedDay !== (todayIndex === 0 ? 6 : todayIndex - 1) && (
            <button
              onClick={() => setSelectedDay(todayIndex === 0 ? 6 : todayIndex - 1)}
              className="btn-manga shrink-0 px-3.5 py-2 rounded-lg font-sans text-xs font-black bg-navy-700 text-sand-50 border-2 border-stone-900 shadow-[2px_2px_0px_0px_rgba(24,19,13,1)] hover:bg-navy-600 transition-all flex items-center gap-1"
            >
              ← Jump to Today
            </button>
          )}
        </div>
      </div>

      {/* Schedulers View */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
            <div key={i} className="card-manga-panel h-[385px] shimmer-skeleton rounded-md" />
          ))}
        </div>
      ) : filteredSchedules.length === 0 ? (
        <div className="card-manga-panel p-8 text-center bg-sand-50 dark:bg-sand-200">
          <CalendarIcon className="w-10 h-10 text-stone-400 mx-auto mb-2" />
          <p className="font-display font-bold text-base text-ink-900">
            {filterMode === 'tracked' ? 'No tracked anime airing on this day' : 'No matching episodes found'}
          </p>
          <p className="text-xs text-stone-500 font-sans mt-1">
            {filterMode === 'tracked' ? 'Switch to "All Shows" or check other weekdays.' : 'Try adjusting your search query.'}
          </p>
        </div>
      ) : (
        <div className={
          viewMode === 'grid'
            ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5"
            : "space-y-3"
        }>
          {filteredSchedules.map((item) => (
            <AnimeCard
              key={item.id}
              anime={item.media}
              watchlistEntry={watchlistMap[item.media.id]}
              onUpdateStatus={onUpdateWatchlist}
              onRemoveItem={onRemoveItem}
              onSelectAnime={onSelectAnime}
              titleLanguage={titleLanguage}
              airingInfo={item.airingInfo}
              isAlertActive={!!activeAlerts[item.media.id]}
              onOpenAlert={handleOpenAlertModal}
            />
          ))}
        </div>
      )}

      {/* Airing Alert Modal */}
      <AiringAlertModal
        isOpen={!!selectedAlertAnime}
        onClose={() => {
          setSelectedAlertAnime(null);
          setSelectedAlertInfo(null);
        }}
        anime={selectedAlertAnime}
        airingInfo={selectedAlertInfo}
        existingAlert={selectedAlertAnime ? activeAlerts[selectedAlertAnime.id] : null}
        onAlertUpdated={loadAlerts}
        titleLanguage={titleLanguage}
      />

    </div>
  );
}
