import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, LogIn, LogOut } from 'lucide-react';
import { signOut } from '../../services/auth';

export default function TopBar({ 
  activeTab, 
  darkMode, 
  onToggleTheme,
  currentUser,
  onOpenLogin
}) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    if (showUserMenu) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showUserMenu]);

  const titles = {
    schedule: 'Airing Schedule',
    mylist: 'My Watchlist',
    explore: 'Explore & Discover',
    stats: 'Anime Analytics',
    profile: 'Profile & Settings'
  };

  const handleSignOut = async () => {
    setShowUserMenu(false);
    await signOut();
    window.dispatchEvent(new Event('anitrack-db-changed'));
  };

  return (
    <header className="sticky top-0 z-30 bg-sand-100/90 dark:bg-sand-100/90 backdrop-blur-md border-b-2 border-stone-900 px-4 pt-[max(env(safe-area-inset-top,0px),12px)] pb-3 transition-colors duration-200">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        
        {/* Brand Sticker */}
        <div className="flex items-center gap-3">
          <div className="btn-manga bg-amber-400 text-ink-900 px-3.5 py-1 text-sm font-black uppercase tracking-tight -rotate-1 shadow-manga">
            AniTrack
          </div>
          <span className="font-display font-bold text-base text-ink-900 hidden sm:inline">
            {titles[activeTab] || 'AniTrack'}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Theme Switcher */}
          <button 
            onClick={onToggleTheme}
            className="p-2 rounded-md border-2 border-stone-900 bg-sand-50 dark:bg-sand-200 text-ink-900 hover:bg-amber-400 active:translate-y-0.5 transition-all shadow-[2px_2px_0px_0px_rgba(24,19,13,1)]"
            title="Toggle Dark/Light Mode"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-stone-700" />}
          </button>

          {/* Auth Button */}
          {currentUser ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-8 h-8 rounded-full bg-amber-400 border-2 border-stone-900 flex items-center justify-center text-xs font-black text-ink-900 shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)] active:translate-y-0.5"
                title={`Logged in as ${currentUser.email || 'User'}`}
              >
                {(currentUser.raw_user_meta_data?.display_name || currentUser.email || 'U').charAt(0).toUpperCase()}
              </button>

              {/* Account Popover */}
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-sand-50 dark:bg-sand-100 border-2 border-stone-900 rounded-md shadow-manga-lg py-2 px-3 z-50 animate-fade-in">
                  <p className="text-xs font-black text-ink-900 truncate">
                    {currentUser.raw_user_meta_data?.display_name || 'User'}
                  </p>
                  <p className="text-[10px] text-stone-500 font-mono truncate mb-2">
                    {currentUser.email}
                  </p>
                  <hr className="border-sand-300 dark:border-sand-400 mb-2" />
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left text-xs font-bold text-status-dropped hover:bg-status-dropped-bg px-2 py-1.5 rounded flex items-center gap-1.5 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="btn-manga bg-sand-50 dark:bg-sand-200 hover:bg-amber-400 text-ink-900 px-3 py-1.5 text-xs font-bold flex items-center gap-1.5"
              title="Sign In"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
}

