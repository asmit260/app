import React, { useState } from 'react';
import { User, Sun, Moon, Globe, Download, Upload, Trash2, LogOut, AlertTriangle } from 'lucide-react';
import { saveProfileSettings, exportWatchlistJSON, importWatchlistJSON, resetAllData } from '../../services/storage';
import { signOut } from '../../services/auth';

export default function ProfileView({ 
  profile, 
  onUpdateProfile, 
  darkMode, 
  onToggleTheme, 
  watchlist,
  onReloadWatchlist,
  currentUser
}) {
  const [username, setUsername] = useState(profile.username || 'Scout Trainee');
  const [titleLang, setTitleLang] = useState(profile.titleLanguage || 'english');
  const [savedMessage, setSavedMessage] = useState('');
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  React.useEffect(() => {
    if (profile.username) setUsername(profile.username);
    if (profile.titleLanguage) setTitleLang(profile.titleLanguage);
  }, [profile]);

  // Auto-save whenever username or titleLang changes (debounced)
  React.useEffect(() => {
    const timer = setTimeout(async () => {
      const updated = {
        ...profile,
        username,
        titleLanguage: titleLang,
        theme: darkMode ? 'dark' : 'light'
      };
      onUpdateProfile(updated);
      await saveProfileSettings(updated);
      setSavedMessage('✓ Saved');
      setTimeout(() => setSavedMessage(''), 1200);
    }, 600);
    return () => clearTimeout(timer);
  }, [username, titleLang]);

  // Also save theme changes immediately
  React.useEffect(() => {
    const updated = {
      ...profile,
      username,
      titleLanguage: titleLang,
      theme: darkMode ? 'dark' : 'light'
    };
    saveProfileSettings(updated);
  }, [darkMode]);

  const handleExport = async () => {
    await exportWatchlistJSON();
    setSavedMessage('Backup downloaded!');
    setTimeout(() => setSavedMessage(''), 2000);
  };

  const handleImportJson = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const count = await importWatchlistJSON(file);
    if (count > 0) {
      onReloadWatchlist();
      setSavedMessage(`Imported ${count} anime into watchlist!`);
      setTimeout(() => setSavedMessage(''), 3000);
    } else {
      setSavedMessage('Import failed or file was empty.');
      setTimeout(() => setSavedMessage(''), 3000);
    }
  };

  const handleResetData = async () => {
    await resetAllData();
    onReloadWatchlist();
    setShowConfirmReset(false);
    setSavedMessage('All data reset to defaults.');
    setTimeout(() => setSavedMessage(''), 2000);
  };

  const handleSignOut = async () => {
    await signOut();
    onReloadWatchlist();
  };

  return (
    <div className="space-y-4 pb-20">

      {/* Profile Card */}
      <div className="card-manga-panel p-5 bg-sand-50 dark:bg-sand-200">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-navy-700 border-2 border-stone-900 flex items-center justify-center text-sand-50 font-display font-black text-2xl shadow-[2px_2px_0px_0px_rgba(24,19,13,1)]">
            {username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="font-display font-black text-xl text-ink-900">
              {username}
            </h1>
            {currentUser?.email && (
              <p className="text-xs text-stone-500 font-mono mt-0.5">
                {currentUser.email}
              </p>
            )}
            <p className="text-xs text-stone-500 font-sans mt-0.5">
              {(watchlist || []).length} anime tracked · {(watchlist || []).filter(i => i.status === 'completed').length} completed
            </p>
            <span className="inline-block px-2 py-0.5 mt-1 text-[10px] font-black uppercase bg-amber-400 text-ink-900 border border-stone-900 rounded">
              {currentUser ? 'Signed In' : 'Local Mode'}
            </span>
          </div>
        </div>
      </div>

      {savedMessage && (
        <div className="p-3 bg-status-watching-bg text-status-watching text-xs font-bold rounded border border-status-watching/30 animate-pulse">
          {savedMessage}
        </div>
      )}

      {/* Settings Options */}
      <div className="card-manga-panel p-4 bg-sand-50 dark:bg-sand-200 space-y-4">
        <h2 className="font-display font-bold text-base text-ink-900 uppercase tracking-tight">
          Preferences
        </h2>

        {/* Username Input */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-stone-700">Display Name</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 bg-sand-100 dark:bg-sand-300 border-2 border-stone-900 rounded font-sans text-sm text-ink-900 focus:outline-none"
          />
        </div>

        {/* Title Language Preference */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" />
            Anime Title Language
          </label>
          <select
            value={titleLang}
            onChange={(e) => setTitleLang(e.target.value)}
            className="w-full px-3 py-2 bg-sand-100 dark:bg-sand-300 border-2 border-stone-900 rounded font-sans text-sm text-ink-900 font-bold focus:outline-none"
          >
            <option value="english">English (e.g. Attack on Titan)</option>
            <option value="romaji">Romaji (e.g. Shingeki no Kyojin)</option>
            <option value="native">Native (e.g. 進撃の巨人)</option>
          </select>
        </div>

        {/* Theme Toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-sand-300 dark:border-sand-400">
          <div>
            <p className="text-xs font-bold text-ink-900">Dark Mode</p>
            <p className="text-[10px] text-stone-500 font-sans">Toggle between light parchment and dark themes</p>
          </div>
          <button
            onClick={onToggleTheme}
            className="btn-manga bg-sand-100 dark:bg-sand-300 hover:bg-amber-400 text-ink-900 px-3 py-1.5 text-xs flex items-center gap-1.5"
          >
            {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5" />}
            <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>

        {/* Save button is now optional since we auto-save. Shown as a visual anchor. */}
        {savedMessage && (
          <div className="text-xs font-bold text-status-watching text-center py-1 animate-fade-in">
            {savedMessage}
          </div>
        )}
      </div>

      {/* Backup & Data Management */}
      <div className="card-manga-panel p-4 bg-sand-50 dark:bg-sand-200 space-y-3">
        <h2 className="font-display font-bold text-base text-ink-900 uppercase tracking-tight">
          Data & Backup
        </h2>

        <div className="flex gap-2">
          {/* Export JSON */}
          <button
            onClick={handleExport}
            className="flex-1 btn-manga bg-sand-100 dark:bg-sand-300 hover:bg-amber-400 text-ink-900 text-xs py-2 px-3 flex items-center justify-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Export JSON</span>
          </button>

          {/* Import JSON */}
          <label className="flex-1 btn-manga bg-sand-100 dark:bg-sand-300 hover:bg-amber-400 text-ink-900 text-xs py-2 px-3 flex items-center justify-center gap-1.5 cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>Restore JSON</span>
            <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
          </label>
        </div>

        {/* Reset / Clear Data */}
        <div className="pt-2 border-t border-sand-300 dark:border-sand-400">
          {!showConfirmReset ? (
            <button
              onClick={() => setShowConfirmReset(true)}
              className="text-xs font-bold text-status-dropped hover:underline flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Reset All Local App Data
            </button>
          ) : (
            <div className="p-3 bg-status-dropped-bg border border-status-dropped/30 rounded space-y-2">
              <p className="text-xs font-bold text-status-dropped flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                Are you sure? This will delete all watchlist entries and statistics.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleResetData}
                  className="btn-manga bg-status-dropped text-sand-50 text-xs px-3 py-1 font-bold"
                >
                  Yes, Reset Everything
                </button>
                <button
                  onClick={() => setShowConfirmReset(false)}
                  className="text-xs text-stone-600 px-2 py-1 hover:underline"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sign Out */}
      {currentUser && (
        <div className="card-manga-panel p-4 bg-sand-50 dark:bg-sand-200">
          <button
            onClick={handleSignOut}
            className="w-full btn-manga bg-status-dropped hover:bg-red-600 text-sand-50 py-2.5 rounded font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      )}

    </div>
  );
}
