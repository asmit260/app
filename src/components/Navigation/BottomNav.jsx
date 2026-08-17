import React from 'react';
import { Calendar, Compass, Bookmark, BarChart3, User } from 'lucide-react';

export default function BottomNav({ activeTab, onSelectTab, watchingCount = 0 }) {
  const tabs = [
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'explore', label: 'Explore', icon: Compass },
    { id: 'mylist', label: 'My List', icon: Bookmark, badge: watchingCount },
    { id: 'stats', label: 'Stats', icon: BarChart3 },
    { id: 'profile', label: 'Profile', icon: User }
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-sand-50 dark:bg-sand-50/95 backdrop-blur-md border-t-[2.5px] border-stone-900 px-2 py-1.5 transition-colors duration-200 shadow-[0_-4px_16px_rgba(24,19,13,0.08)]">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg relative transition-all duration-150 active:scale-95 ${
                isActive 
                  ? 'text-ink-900 font-black' 
                  : 'text-stone-500 hover:text-stone-800 font-medium'
              }`}
            >
              {/* Active Tape Indicator */}
              {isActive && (
                <span className="absolute -top-1.5 inset-x-1.5 h-1 bg-amber-400 border border-stone-900 rounded-full shadow-[1px_1px_0px_0px_rgba(24,19,13,1)]" />
              )}

              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 stroke-[2.5]' : 'stroke-[1.8]'}`} />
                {tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 bg-status-watching text-sand-50 text-[10px] font-mono font-bold rounded-full flex items-center justify-center border border-stone-900">
                    {tab.badge}
                  </span>
                )}
              </div>

              <span className={`text-[11px] mt-0.5 tracking-tight ${isActive ? 'font-black text-ink-900' : 'text-stone-600'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
