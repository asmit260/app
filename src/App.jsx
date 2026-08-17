import React, { useState, useEffect } from 'react';
import TopBar from './components/Navigation/TopBar';
import BottomNav from './components/Navigation/BottomNav';
import ScheduleView from './components/Schedule/ScheduleView';
import ExploreView from './components/Explore/ExploreView';
import MyListView from './components/MyList/MyListView';
import StatsView from './components/Stats/StatsView';
import ProfileView from './components/Profile/ProfileView';
import AnimeDetailModal from './components/Detail/AnimeDetailModal';
import LeviChatDrawer from './components/Chatbot/LeviChatDrawer';

import { 
  getStoredWatchlist, 
  upsertWatchlistEntry, 
  removeWatchlistEntry, 
  getProfileSettings 
} from './services/storage';

export default function App() {
  const [activeTab, setActiveTab] = useState('schedule');
  const [watchlist, setWatchlist] = useState([]);
  const [profile, setProfile] = useState({ username: 'Scout Trainee', titleLanguage: 'english', theme: 'light' });
  const [darkMode, setDarkMode] = useState(false);
  const [selectedAnimeId, setSelectedAnimeId] = useState(null);
  const [isLeviOpen, setIsLeviOpen] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    // Load initial data
    const list = getStoredWatchlist();
    setWatchlist(list);

    const userProfile = getProfileSettings();
    setProfile(userProfile);

    // Initial theme
    const isDark = userProfile.theme === 'dark' || window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(isDark);
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');

    // Storage listeners
    const handleListChange = (e) => {
      if (e.detail) setWatchlist(e.detail);
    };
    window.addEventListener('anitrack-watchlist-changed', handleListChange);
    return () => window.removeEventListener('anitrack-watchlist-changed', handleListChange);
  }, []);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  const handleToggleTheme = () => {
    const nextDark = !darkMode;
    setDarkMode(nextDark);
    if (nextDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  const handleUpdateWatchlist = (anime, status) => {
    const updated = upsertWatchlistEntry(anime, status);
    setWatchlist(getStoredWatchlist());
    showToast(`Saved "${updated.anime_title}" to ${status.replace('_', ' ')}`);
  };

  const handleIncrementEpisode = (animeId) => {
    const item = watchlist.find(i => i.anime_id === animeId || i.id === animeId);
    if (!item) return;
    const nextEp = (item.episodes_watched || 0) + 1;
    const isFinished = item.total_episodes && nextEp >= item.total_episodes;
    const status = isFinished ? 'completed' : item.status;

    upsertWatchlistEntry({ id: animeId, title: item.anime_title }, status, nextEp);
    setWatchlist(getStoredWatchlist());
    showToast(`+1 Episode logged for "${item.anime_title}" (${nextEp})`);
  };

  const handleRemoveWatchlistItem = (animeId) => {
    removeWatchlistEntry(animeId);
    setWatchlist(getStoredWatchlist());
    showToast("Removed anime from watchlist");
  };

  const watchingCount = watchlist.filter(i => i.status === 'watching').length;

  return (
    <div className="min-h-screen bg-sand-100 dark:bg-sand-100 flex flex-col text-ink-900 transition-colors duration-200">
      
      {/* Top Application Bar */}
      <TopBar
        activeTab={activeTab}
        onOpenSearch={() => setActiveTab('explore')}
        onToggleLevi={() => setIsLeviOpen(!isLeviOpen)}
        darkMode={darkMode}
        onToggleTheme={handleToggleTheme}
        watchlistCount={watchingCount}
      />

      {/* Main Screen Content View */}
      <main className="flex-grow max-w-4xl w-full mx-auto p-4 sm:p-6">
        {activeTab === 'schedule' && (
          <ScheduleView
            watchlist={watchlist}
            onUpdateWatchlist={handleUpdateWatchlist}
            onSelectAnime={(id) => setSelectedAnimeId(id)}
            titleLanguage={profile.titleLanguage}
          />
        )}

        {activeTab === 'explore' && (
          <ExploreView
            onSelectAnime={(id) => setSelectedAnimeId(id)}
            titleLanguage={profile.titleLanguage}
          />
        )}

        {activeTab === 'mylist' && (
          <MyListView
            watchlist={watchlist}
            onUpdateStatus={(id, status) => handleUpdateWatchlist({ id }, status)}
            onIncrementEpisode={handleIncrementEpisode}
            onRemoveItem={handleRemoveWatchlistItem}
            onSelectAnime={(id) => setSelectedAnimeId(id)}
            titleLanguage={profile.titleLanguage}
          />
        )}

        {activeTab === 'stats' && (
          <StatsView
            watchlist={watchlist}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            profile={profile}
            onUpdateProfile={(p) => setProfile(p)}
            darkMode={darkMode}
            onToggleTheme={handleToggleTheme}
            watchlist={watchlist}
            onReloadWatchlist={() => setWatchlist(getStoredWatchlist())}
          />
        )}
      </main>

      {/* Bottom Tab Bar */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        watchingCount={watchingCount}
      />

      {/* Detail Modal Overlay */}
      {selectedAnimeId && (
        <AnimeDetailModal
          animeId={selectedAnimeId}
          onClose={() => setSelectedAnimeId(null)}
          watchlist={watchlist}
          onUpdateStatus={(anime, status) => handleUpdateWatchlist(anime, status)}
          onRemoveItem={(id) => handleRemoveWatchlistItem(id)}
          titleLanguage={profile.titleLanguage}
        />
      )}

      {/* Levi AI Chat Drawer */}
      <LeviChatDrawer
        isOpen={isLeviOpen}
        onClose={() => setIsLeviOpen(false)}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-16 inset-x-0 z-50 flex justify-center pointer-events-none px-4">
          <div className="btn-manga bg-stone-900 text-sand-50 dark:bg-sand-50 dark:text-stone-900 text-xs px-4 py-2 rounded-md shadow-manga animate-fade-in">
            {toast}
          </div>
        </div>
      )}

    </div>
  );
}
