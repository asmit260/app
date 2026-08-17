import React from 'react';
import { Sun, Moon, Search, MessageSquare, Bell } from 'lucide-react';

export default function TopBar({ 
  activeTab, 
  onOpenSearch, 
  onToggleLevi, 
  darkMode, 
  onToggleTheme,
  watchlistCount = 0
}) {
  const titles = {
    schedule: 'Airing Schedule',
    explore: 'Search & Explore',
    mylist: 'My Watchlist',
    stats: 'Analytics & Stats',
    profile: 'Profile & Settings'
  };

  return (
    <header className="sticky top-0 z-30 bg-sand-100/90 dark:bg-sand-100/90 backdrop-blur-md border-b-2 border-stone-900 px-4 py-3 transition-colors duration-200">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        
        {/* Brand Sticker */}
        <div className="flex items-center gap-3">
          <div className="btn-manga bg-amber-400 text-ink-900 px-3 py-1 text-sm font-black uppercase tracking-tight -rotate-1">
            AniTrack
          </div>
          <span className="font-display font-bold text-base text-ink-900 hidden sm:inline">
            {titles[activeTab] || 'AniTrack'}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Quick Search */}
          <button 
            onClick={onOpenSearch}
            className="p-2 rounded-md border-2 border-stone-900 bg-sand-50 dark:bg-sand-200 text-ink-900 hover:bg-amber-400 active:translate-y-0.5 transition-all shadow-[2px_2px_0px_0px_rgba(24,19,13,1)]"
            title="Search Anime"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Theme Switcher */}
          <button 
            onClick={onToggleTheme}
            className="p-2 rounded-md border-2 border-stone-900 bg-sand-50 dark:bg-sand-200 text-ink-900 hover:bg-amber-400 active:translate-y-0.5 transition-all shadow-[2px_2px_0px_0px_rgba(24,19,13,1)]"
            title="Toggle Dark/Light Mode"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-stone-700" />}
          </button>

          {/* Levi AI Advisor Trigger */}
          <button 
            onClick={onToggleLevi}
            className="btn-manga bg-navy-700 hover:bg-navy-600 text-sand-50 px-2.5 py-1.5 text-xs font-bold flex items-center gap-1.5"
            title="Ask Captain Levi AI"
          >
            <img 
              src="/assets/images/levi-avatar.webp" 
              alt="Levi" 
              className="w-4 h-4 rounded-full object-cover"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <span className="hidden xs:inline">Levi AI</span>
          </button>
        </div>

      </div>
    </header>
  );
}
