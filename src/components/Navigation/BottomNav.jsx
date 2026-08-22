import React from 'react';
import { Calendar, Compass, Bookmark, BarChart3, User } from 'lucide-react';
import { sound } from '../../services/soundEffects';

export default function BottomNav({ activeTab, onSelectTab, watchingCount = 0 }) {
  const tabs = [
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'explore', label: 'Explore', icon: Compass },
    { id: 'mylist', label: 'Watchlist', icon: Bookmark, badge: watchingCount },
    { id: 'stats', label: 'Analytics', icon: BarChart3 },
    { id: 'profile', label: 'Profile', icon: User }
  ];

  const handleTabClick = (tabId) => {
    sound.playTab();
    onSelectTab(tabId);
  };

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 manga-dock px-3 pt-2 pb-[max(0.65rem,env(safe-area-inset-bottom))] transition-colors duration-200">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-3.5 rounded-xl relative transition-all duration-150 active:scale-90 select-none ${
                isActive 
                  ? 'text-ink-900 font-black' 
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300 font-medium'
              }`}
            >
              {/* Active Tape Indicator with Amber Glow */}
              {isActive && (
                <span className="absolute -top-2 inset-x-3 h-1 bg-amber-400 border border-stone-900 rounded-full shadow-[1px_1px_0px_0px_rgba(24,19,13,1)] animate-fade-in" />
              )}

              {/* Active Background Pill */}
              <div className={`p-1 rounded-lg transition-all ${isActive ? 'bg-amber-400/20 dark:bg-amber-400/30' : ''}`}>
                <div className="relative">
                  <Icon className={`w-5 h-5 transition-transform duration-150 ${isActive ? 'scale-110 stroke-[2.5] text-ink-900' : 'stroke-[1.8]'}`} />
                  {tab.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[17px] h-4 px-1 bg-status-watching text-white text-[9px] font-mono font-black rounded-full flex items-center justify-center border border-stone-900 shadow-sm animate-fade-in">
                      {tab.badge}
                    </span>
                  )}
                </div>
              </div>

              <span className={`text-[10px] sm:text-[11px] mt-0.5 tracking-tight transition-colors ${isActive ? 'font-black text-ink-900' : 'text-stone-500'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
