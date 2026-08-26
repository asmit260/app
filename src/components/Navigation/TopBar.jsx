import React, { useState } from 'react';
import { Sun, Moon, LogIn, User, RotateCw, Calendar, Compass, Newspaper, Bookmark, BarChart3 } from 'lucide-react';
import { sound } from '../../services/soundEffects';

export default function TopBar({ 
  activeTab, 
  onSelectTab,
  watchingCount = 0,
  darkMode, 
  onToggleTheme, 
  currentUser,
  profile = {},
  onOpenLogin,
  onRefresh
}) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const desktopTabs = [
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'explore', label: 'Explore', icon: Compass },
    { id: 'news', label: 'News', icon: Newspaper },
    { id: 'mylist', label: 'Watchlist', icon: Bookmark, badge: watchingCount },
    { id: 'stats', label: 'Analytics', icon: BarChart3 },
    { id: 'profile', label: 'Profile', icon: User }
  ];

  const handleTabClick = (tabId) => {
    sound.playTab();
    if (onSelectTab) onSelectTab(tabId);
  };

  const handleAvatarClick = () => {
    sound.playTab();
    if (onSelectTab) onSelectTab('profile');
  };

  const handleManualRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    sound.playTab();
    try {
      if (onRefresh) await onRefresh();
    } catch (_) {}
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <header className="sticky top-0 z-30 bg-sand-100/90 dark:bg-sand-100/90 backdrop-blur-md border-b-2 border-stone-900 px-4 pt-[max(env(safe-area-inset-top,0px),12px)] pb-3 transition-colors duration-200">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        
        {/* Brand Sticker */}
        <div className="flex items-center gap-3 shrink-0">
          <div 
            onClick={() => handleTabClick('schedule')}
            className="btn-manga bg-amber-400 text-stone-950 px-3.5 py-1 text-sm font-black uppercase tracking-tight -rotate-1 shadow-manga cursor-pointer select-none hover:scale-105 active:scale-95 transition-transform"
          >
            AniTrack
          </div>
        </div>

        {/* Desktop Navigation Links (Visible on Tablet & Desktop) */}
        <nav className="hidden md:flex items-center gap-1 bg-sand-50 dark:bg-sand-200 p-1 rounded-xl border-2 border-stone-900 shadow-2xs">
          {desktopTabs.map(t => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => handleTabClick(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all select-none relative ${
                  isActive 
                    ? 'bg-amber-400 text-stone-950 border border-stone-900 shadow-2xs' 
                    : 'text-stone-600 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white hover:bg-sand-200 dark:hover:bg-sand-300'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'stroke-[2.5]' : ''}`} />
                <span>{t.label}</span>
                {t.badge > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 text-[9px] font-mono font-black bg-status-watching text-white rounded-full border border-stone-900">
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Quick Reload / Sync Button */}
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-md border-2 border-stone-900 bg-sand-50 dark:bg-sand-300 text-ink-900 hover:bg-amber-400 hover:text-stone-950 active:translate-y-0.5 transition-all shadow-[2px_2px_0px_0px_rgba(24,19,13,1)] disabled:opacity-60"
            title="Refresh App & Watchlist Data"
          >
            <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-500' : ''}`} />
          </button>

          {/* Theme Switcher */}
          <button 
            onClick={onToggleTheme}
            className="p-2 rounded-md border-2 border-stone-900 bg-sand-50 dark:bg-sand-300 text-ink-900 hover:bg-amber-400 hover:text-stone-950 active:translate-y-0.5 transition-all shadow-[2px_2px_0px_0px_rgba(24,19,13,1)]"
            title="Toggle Dark/Light Mode"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-stone-700" />}
          </button>

          {/* Auth / Profile Avatar Button */}
          {currentUser ? (
            <button
              onClick={handleAvatarClick}
              className="w-8 h-8 rounded-full bg-amber-400 border-2 border-stone-900 flex items-center justify-center text-xs font-black text-stone-950 shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)] active:translate-y-0.5 transition-transform hover:scale-105 overflow-hidden"
              title={`View Profile (${profile?.username || currentUser.raw_user_meta_data?.display_name || currentUser.email || 'User'})`}
            >
              {profile?.avatar ? (
                <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span>{(profile?.username || currentUser.raw_user_meta_data?.display_name || currentUser.email || 'U').charAt(0).toUpperCase()}</span>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleAvatarClick}
                className="w-8 h-8 rounded-full bg-sand-200 dark:bg-stone-700 border-2 border-stone-900 flex items-center justify-center text-xs font-black text-stone-950 dark:text-stone-100 shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)] active:translate-y-0.5 transition-transform hover:scale-105 overflow-hidden"
                title="Profile & Settings"
              >
                {profile?.avatar ? (
                  <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-stone-700 dark:text-stone-300" />
                )}
              </button>
              <button
                onClick={onOpenLogin}
                className="hidden sm:inline-flex btn-manga bg-sand-50 dark:bg-sand-300 hover:bg-amber-400 hover:text-stone-950 text-ink-900 px-3 py-1.5 text-xs font-bold items-center gap-1.5 shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)] active:translate-y-0.5"
                title="Sign In / Sync"
              >
                <LogIn className="w-3.5 h-3.5 text-amber-500" />
                <span>Sign In</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}

