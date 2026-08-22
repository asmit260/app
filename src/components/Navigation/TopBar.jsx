import React from 'react';
import { Sun, Moon, LogIn, User } from 'lucide-react';
import { sound } from '../../services/soundEffects';

export default function TopBar({ 
  activeTab, 
  onSelectTab,
  darkMode, 
  onToggleTheme,
  currentUser,
  onOpenLogin
}) {
  const titles = {
    schedule: 'Airing Schedule',
    mylist: 'My Watchlist',
    stats: 'Anime Analytics',
    profile: 'Profile & Settings'
  };

  const handleAvatarClick = () => {
    sound.playTab();
    if (onSelectTab) onSelectTab('profile');
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
            <button
              onClick={handleAvatarClick}
              className="w-8 h-8 rounded-full bg-amber-400 border-2 border-stone-900 flex items-center justify-center text-xs font-black text-ink-900 shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)] active:translate-y-0.5 transition-transform hover:scale-105"
              title={`View Profile (${currentUser.raw_user_meta_data?.display_name || currentUser.email || 'User'})`}
            >
              {(currentUser.raw_user_meta_data?.display_name || currentUser.email || 'U').charAt(0).toUpperCase()}
            </button>
          ) : (
            <button
              onClick={onOpenLogin}
              className="btn-manga bg-sand-50 dark:bg-sand-200 hover:bg-amber-400 text-ink-900 px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)] active:translate-y-0.5"
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

