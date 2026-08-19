import React, { useState, useEffect, useCallback } from 'react';
import TopBar from './components/Navigation/TopBar';
import BottomNav from './components/Navigation/BottomNav';
import ScheduleView from './components/Schedule/ScheduleView';
import MyListView from './components/MyList/MyListView';
import StatsView from './components/Stats/StatsView';
import ProfileView from './components/Profile/ProfileView';
import AnimeDetailModal from './components/Detail/AnimeDetailModal';
import SplashScreen from './components/Common/SplashScreen';
import LoginModal from './components/Auth/LoginModal';

import { 
  getStoredWatchlist, 
  upsertWatchlistEntry, 
  removeWatchlistEntry, 
  getProfileSettings,
  getWatchHistory
} from './services/storage';
import { getUser, onAuthChange } from './services/auth';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState('schedule');
  const [watchlist, setWatchlist] = useState([]);
  const [history, setHistory] = useState([]);
  const [profile, setProfile] = useState({ username: 'Scout Trainee', titleLanguage: 'english', theme: 'light' });
  const [darkMode, setDarkMode] = useState(false);
  const [selectedAnimeId, setSelectedAnimeId] = useState(null);
  const [toast, setToast] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);

  // Load all data (watchlist, history, profile)
  const loadAllData = useCallback(async () => {
    try {
      const user = await getUser();
      setCurrentUser(user);
      
      const [list, hist, userProfile] = await Promise.all([
        getStoredWatchlist(),
        getWatchHistory(),
        getProfileSettings()
      ]);
      
      setWatchlist(list || []);
      setHistory(hist || []);
      if (userProfile) setProfile(userProfile);
      
      const isDark = userProfile?.theme === 'dark' || window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(isDark);
      if (isDark) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    } catch (err) {
      console.error("Failed to load app data:", err);
    }
  }, []);

  // Debounced reload to prevent triple-firing from cascading events
  const reloadTimerRef = React.useRef(null);
  const debouncedReload = useCallback(() => {
    if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    reloadTimerRef.current = setTimeout(() => {
      loadAllData();
      reloadTimerRef.current = null;
    }, 80);
  }, [loadAllData]);

  useEffect(() => {
    loadAllData();

    // Listen for auth state changes
    const authSub = onAuthChange((user) => {
      setCurrentUser(user);
      loadAllData();
    });

    // Listen for watchlist or db changes (debounced)
    window.addEventListener('anitrack-watchlist-changed', debouncedReload);
    window.addEventListener('anitrack-db-changed', debouncedReload);

    return () => {
      authSub?.data?.subscription?.unsubscribe?.();
      window.removeEventListener('anitrack-watchlist-changed', debouncedReload);
      window.removeEventListener('anitrack-db-changed', debouncedReload);
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    };
  }, [loadAllData, debouncedReload]);

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

  const handleAuthSuccess = async () => {
    await loadAllData();
    setShowLogin(false);
    showToast("Signed in successfully!");
  };

  // Build a full anime object from a watchlist item (for upsert calls that only have an ID)
  const buildAnimeFromWatchlistItem = (animeId, existingItem) => {
    if (!existingItem) return { id: animeId };
    return {
      id: existingItem.anime_id || existingItem.id || animeId,
      title: existingItem.anime_title,
      anime_title: existingItem.anime_title,
      coverImage: existingItem.anime_cover,
      anime_cover: existingItem.anime_cover,
      genres: existingItem.genres,
      duration: existingItem.duration,
      totalEpisodes: existingItem.total_episodes,
      episodes: existingItem.total_episodes,
      score: existingItem.score,
      episodes_watched: existingItem.episodes_watched,
    };
  };

  const handleUpdateWatchlist = async (anime, status) => {
    // If anime is a full object from AniList (has title object or coverImage), use it directly
    // If anime is a bare {id} (from MyListView), look up the existing watchlist entry to preserve metadata
    let fullAnime = anime;
    const animeId = anime.id || anime.anime_id;

    if (!anime.title && !anime.anime_title && !anime.coverImage) {
      // Bare ID — look up existing entry in current watchlist state
      const existingItem = watchlist.find(i => 
        (i.anime_id == animeId || i.id == animeId)
      );
      fullAnime = buildAnimeFromWatchlistItem(animeId, existingItem);
    }

    const updated = await upsertWatchlistEntry(fullAnime, status);
    if (updated) {
      await loadAllData();
      showToast(`Saved "${updated.anime_title}" to ${status.replace('_', ' ')}`);
    }
  };

  const handleIncrementEpisode = async (animeId) => {
    const item = watchlist.find(i => (i.anime_id == animeId || i.id == animeId));
    if (!item) return;
    const nextEp = (Number(item.episodes_watched) || 0) + 1;
    const isFinished = item.total_episodes && nextEp >= item.total_episodes;
    const status = isFinished ? 'completed' : item.status;

    const fullAnime = buildAnimeFromWatchlistItem(animeId, item);
    await upsertWatchlistEntry(fullAnime, status, nextEp);
    await loadAllData();
    showToast(`+1 Episode logged for "${item.anime_title}" (${nextEp})`);
  };

  const handleRemoveWatchlistItem = async (animeId) => {
    await removeWatchlistEntry(animeId);
    await loadAllData();
    showToast("Removed anime from watchlist");
  };

  const watchingCount = watchlist.filter(i => i.status === 'watching').length;

  return (
    <div className="min-h-screen bg-sand-100 dark:bg-sand-100 flex flex-col text-ink-900 transition-colors duration-200">
      
      {/* Top Application Bar */}
      <TopBar
        activeTab={activeTab}
        darkMode={darkMode}
        onToggleTheme={handleToggleTheme}
        currentUser={currentUser}
        onOpenLogin={() => setShowLogin(true)}
      />

      {/* Main Screen Content View */}
      <main className="flex-grow max-w-5xl w-full mx-auto p-3 sm:p-6">
        <div key={activeTab} className="animate-fade-in">
        {activeTab === 'schedule' && (
          <ScheduleView
            watchlist={watchlist}
            onUpdateWatchlist={handleUpdateWatchlist}
            onRemoveItem={handleRemoveWatchlistItem}
            onSelectAnime={(id) => setSelectedAnimeId(id)}
            titleLanguage={profile.titleLanguage}
          />
        )}

        {activeTab === 'mylist' && (
          <MyListView
            watchlist={watchlist}
            onUpdateStatus={(id, status, existingItem) => {
              // Build full anime from the watchlist item to preserve metadata
              const item = existingItem || watchlist.find(i => (i.anime_id == id || i.id == id));
              const fullAnime = buildAnimeFromWatchlistItem(id, item);
              handleUpdateWatchlist(fullAnime, status);
            }}
            onIncrementEpisode={handleIncrementEpisode}
            onRemoveItem={handleRemoveWatchlistItem}
            onSelectAnime={(id) => setSelectedAnimeId(id)}
            titleLanguage={profile.titleLanguage}
          />
        )}

        {activeTab === 'stats' && (
          <StatsView
            watchlist={watchlist}
            history={history}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            profile={profile}
            onUpdateProfile={(p) => setProfile(p)}
            darkMode={darkMode}
            onToggleTheme={handleToggleTheme}
            watchlist={watchlist}
            onReloadWatchlist={loadAllData}
            currentUser={currentUser}
          />
        )}
        </div>
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

      {/* Login Modal */}
      <LoginModal
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-16 inset-x-0 z-50 flex justify-center pointer-events-none px-4">
          <div className="btn-manga bg-stone-900 text-sand-50 dark:bg-sand-50 dark:text-stone-900 text-xs px-4 py-2 rounded-md shadow-manga animate-fade-in">
            {toast}
          </div>
        </div>
      )}

      {/* Animated Splash & Fast Pre-loader Screen */}
      {showSplash && (
        <SplashScreen onFinish={() => setShowSplash(false)} />
      )}

    </div>
  );
}
