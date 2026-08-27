import React, { useState, useEffect, useCallback } from 'react';
import TopBar from './components/Navigation/TopBar';
import BottomNav from './components/Navigation/BottomNav';
import ScheduleView from './components/Schedule/ScheduleView';
import ExploreView from './components/Explore/ExploreView';
import NewsView from './components/News/NewsView';
import MyListView from './components/MyList/MyListView';
import StatsView from './components/Stats/StatsView';
import ProfileView from './components/Profile/ProfileView';
import AnimeDetailModal from './components/Detail/AnimeDetailModal';
import ModeratorNewsStudio from './components/Moderator/ModeratorNewsStudio';
import SplashScreen from './components/Common/SplashScreen';
import LoginModal from './components/Auth/LoginModal';
import AuthPromptModal from './components/Auth/AuthPromptModal';
import UpdateModal from './components/Common/UpdateModal';
import { checkForAppUpdate } from './services/updater';

import { 
  getStoredWatchlist, 
  upsertWatchlistEntry, 
  removeWatchlistEntry, 
  getProfileSettings,
  getWatchHistory,
  saveProfileSettings
} from './services/storage';
import { getUser, onAuthChange } from './services/auth';
import { fetchWatchlistAiringMap } from './services/anilist';
import { isAnimeOngoing, getMaxAiredEpisode } from './utils/animeRules';

class ViewErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("View Render Error:", error, errorInfo);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.tabKey !== this.props.tabKey && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="card-manga-panel p-6 bg-sand-50 dark:bg-sand-200 text-center space-y-3 my-4">
          <div className="inline-block bg-amber-400 text-stone-950 font-black text-xs px-3 py-1 uppercase rounded border border-stone-900 shadow-sm">
            View Error Notice
          </div>
          <h3 className="font-display font-black text-base text-ink-900">
            Couldn't load this screen
          </h3>
          <p className="text-xs text-stone-600 dark:text-stone-300 font-sans max-w-sm mx-auto">
            {this.state.error?.message || 'A temporary glitch occurred while displaying this section.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="btn-manga bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs px-4 py-2 font-black shadow-[2px_2px_0px_0px_rgba(24,19,13,1)]"
          >
            Reload This View
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState('schedule');
  const [watchlist, setWatchlist] = useState([]);
  const [history, setHistory] = useState([]);
  const [profile, setProfile] = useState({ username: 'Scout Trainee', titleLanguage: 'english', theme: 'light' });
  // Default to light theme unless explicitly saved as 'dark'
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem('anitrack_theme') === 'dark';
    } catch (_) {
      return false;
    }
  });
  const [selectedAnimeId, setSelectedAnimeId] = useState(null);
  const [toast, setToast] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [authPromptActionLabel, setAuthPromptActionLabel] = useState('track anime in your watchlist');
  const [pendingAuthAction, setPendingAuthAction] = useState(null);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [showModeratorStudio, setShowModeratorStudio] = useState(false);

  // Sync DOM with darkMode state on mount and change
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

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
      
      const rawList = list || [];
      setWatchlist(rawList);
      setHistory(hist || []);
      if (userProfile) setProfile(userProfile);

      // Enrich watchlist with live AniList airing metadata and clamp ongoing episodes
      const animeIds = rawList.map(i => parseInt(i.anime_id || i.id)).filter(Boolean);
      if (animeIds.length > 0) {
        fetchWatchlistAiringMap(animeIds).then(airingMap => {
          if (airingMap && Object.keys(airingMap).length > 0) {
            setWatchlist(prev => {
              let changed = false;
              const enriched = prev.map(item => {
                const id = parseInt(item.anime_id || item.id);
                const info = airingMap[id];
                if (!info) return item;

                const mediaStatus = info.status || item.media_status;
                const nextAiring = info.nextAiringEpisode || item.nextAiringEpisode;
                const total = info.episodes || item.total_episodes;
                const maxAired = nextAiring?.episode 
                  ? Math.max(1, nextAiring.episode - 1) 
                  : (mediaStatus === 'NOT_YET_RELEASED' ? 0 : null);

                let curWatched = Number(item.episodes_watched) || 0;
                let curStatus = item.status;

                // Strict clamp for ongoing anime
                const isOngoing = mediaStatus === 'RELEASING' || mediaStatus === 'NOT_YET_RELEASED' || mediaStatus === 'HIATUS' || !!nextAiring;
                if (isOngoing) {
                  if (curStatus === 'completed') curStatus = 'watching';
                  if (maxAired !== null && curWatched > maxAired) curWatched = maxAired;
                }

                if (
                  item.media_status !== mediaStatus ||
                  item.total_episodes !== total ||
                  item.episodes_watched !== curWatched ||
                  item.status !== curStatus ||
                  JSON.stringify(item.nextAiringEpisode) !== JSON.stringify(nextAiring)
                ) {
                  changed = true;
                  return {
                    ...item,
                    media_status: mediaStatus,
                    nextAiringEpisode: nextAiring,
                    total_episodes: total,
                    episodes_watched: curWatched,
                    status: curStatus
                  };
                }
                return item;
              });
              return changed ? enriched : prev;
            });
          }
        }).catch(() => {});
      }
      
      // Determine theme strictly from user preference (default: light)
      // Never force dark based on OS matchMedia
      const storedTheme = localStorage.getItem('anitrack_theme');
      if (storedTheme) {
        const isDark = storedTheme === 'dark';
        setDarkMode(isDark);
      } else if (userProfile?.theme) {
        const isDark = userProfile.theme === 'dark';
        setDarkMode(isDark);
        try { localStorage.setItem('anitrack_theme', userProfile.theme); } catch (_) {}
      }
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

  const handleToggleTheme = async () => {
    const nextDark = !darkMode;
    setDarkMode(nextDark);
    const themeName = nextDark ? 'dark' : 'light';
    try {
      localStorage.setItem('anitrack_theme', themeName);
    } catch (_) {}
    
    // Save to user profile settings
    try {
      const updatedProfile = {
        ...profile,
        theme: themeName
      };
      setProfile(updatedProfile);
      await saveProfileSettings(updatedProfile);
    } catch (_) {}
  };

  const checkAuthOrPrompt = (actionFn, actionLabel = 'save changes to your watchlist') => {
    let isGuestAck = false;
    try {
      isGuestAck = localStorage.getItem('anitrack_guest_ack') === 'true';
    } catch (_) {}

    // If logged in OR guest warning already acknowledged, proceed immediately!
    if (currentUser || isGuestAck) {
      actionFn();
      return;
    }

    // Otherwise, intercept and show warning modal with guest option
    setPendingAuthAction(() => actionFn);
    setAuthPromptActionLabel(actionLabel);
    setShowAuthPrompt(true);
  };

  const handleContinueAsGuest = () => {
    setShowAuthPrompt(false);
    if (pendingAuthAction) {
      const fn = pendingAuthAction;
      setPendingAuthAction(null);
      fn();
    }
  };

  const handlePromptSignIn = () => {
    setShowAuthPrompt(false);
    setShowLogin(true);
  };

  const handleAuthSuccess = async () => {
    await loadAllData();
    setShowLogin(false);
    showToast("Signed in successfully!");
    if (pendingAuthAction) {
      const fn = pendingAuthAction;
      setPendingAuthAction(null);
      fn();
    }
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

  const handleUpdateWatchlist = async (anime, status, eps = null) => {
    const titleText = anime?.title?.english || anime?.title?.romaji || anime?.anime_title || anime?.title || 'anime';
    checkAuthOrPrompt(async () => {
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

      const updated = await upsertWatchlistEntry(fullAnime, status, eps);
      if (updated) {
        await loadAllData();
        if (eps !== null) {
          showToast(`Caught up on "${updated.anime_title}" (Ep ${eps})`);
        } else {
          showToast(`Saved "${updated.anime_title}" to ${status.replace('_', ' ')}`);
        }
      }
    }, `track "${titleText}" in your watchlist`);
  };

  const handleIncrementEpisode = async (animeId) => {
    const item = watchlist.find(i => (i.anime_id == animeId || i.id == animeId));
    if (!item) return;

    checkAuthOrPrompt(async () => {
      const current = Number(item.episodes_watched) || 0;
      const isOngoing = isAnimeOngoing(item);
      
      // Check max episode limit for ongoing vs completed
      const maxLimit = isOngoing ? getMaxAiredEpisode(item, current) : (item.total_episodes || getMaxAiredEpisode(item, current));

      if (maxLimit && current >= maxLimit) {
        showToast(isOngoing ? `Already caught up to Episode ${current}!` : `All ${item.total_episodes} episodes completed!`);
        return;
      }

      const nextEp = current + 1;
      const isFinished = !isOngoing && item.total_episodes && nextEp >= item.total_episodes;
      const status = isFinished ? 'completed' : item.status;

      const fullAnime = buildAnimeFromWatchlistItem(animeId, item);
      await upsertWatchlistEntry(fullAnime, status, nextEp);
      await loadAllData();
      showToast(`+1 Episode logged for "${item.anime_title}" (${nextEp})`);
    }, `log episode progress for "${item.anime_title}"`);
  };

  const handleRemoveWatchlistItem = async (animeId) => {
    await removeWatchlistEntry(animeId);
    await loadAllData();
    showToast("Removed anime from watchlist");
  };

  const watchingCount = watchlist.filter(i => i.status === 'watching').length;

  // Check for app updates in background after startup (2s delay so launch is blazing fast)
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const update = await checkForAppUpdate(false);
        if (update?.hasUpdate) {
          setUpdateInfo(update);
        }
      } catch (_) {}
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleManualUpdateCheck = async () => {
    const update = await checkForAppUpdate(true);
    if (update?.hasUpdate) {
      setUpdateInfo(update);
      return { hasUpdate: true, version: update.version };
    }
    return { hasUpdate: false, version: update?.currentVersion || '1.0.0' };
  };

  return (
    <div className="min-h-screen bg-sand-100 dark:bg-sand-100 flex flex-col text-ink-900 transition-colors duration-200">
      
      {/* Top Application Bar */}
      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        watchingCount={watchingCount}
        darkMode={darkMode}
        onToggleTheme={handleToggleTheme}
        currentUser={currentUser}
        profile={profile}
        onOpenLogin={() => setShowLogin(true)}
        onRefresh={loadAllData}
      />

      {/* Main Screen Content View */}
      <main className="flex-grow max-w-5xl w-full mx-auto p-3 sm:p-6 pb-24 sm:pb-28">
        <ViewErrorBoundary tabKey={activeTab}>
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

          {activeTab === 'explore' && (
            <ExploreView
              watchlist={watchlist}
              onUpdateWatchlist={handleUpdateWatchlist}
              onRemoveItem={handleRemoveWatchlistItem}
              onSelectAnime={(id) => setSelectedAnimeId(id)}
              titleLanguage={profile.titleLanguage}
            />
          )}

          {activeTab === 'news' && (
            <NewsView
              onOpenModeratorStudio={() => setShowModeratorStudio(true)}
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
              onCheckForUpdate={handleManualUpdateCheck}
              onOpenModeratorStudio={() => setShowModeratorStudio(true)}
              onOpenLogin={() => setShowLogin(true)}
            />
          )}
          </div>
        </ViewErrorBoundary>
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

      {/* Moderator Studio Modal */}
      {showModeratorStudio && (
        <ModeratorNewsStudio
          isOpen={showModeratorStudio}
          onClose={() => setShowModeratorStudio(false)}
        />
      )}

      {/* Guest Warning & Cloud Auth Prompt Modal */}
      <AuthPromptModal
        isOpen={showAuthPrompt}
        onClose={() => setShowAuthPrompt(false)}
        onSignIn={handlePromptSignIn}
        onContinueAsGuest={handleContinueAsGuest}
        actionLabel={authPromptActionLabel}
      />

      {/* Login Modal */}
      <LoginModal
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* In-App Update Modal */}
      {updateInfo && (
        <UpdateModal
          updateInfo={updateInfo}
          onClose={() => setUpdateInfo(null)}
        />
      )}

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
