import React, { useState } from 'react';
import { User, Sun, Moon, Globe, Download, Upload, Trash2, LogOut, AlertTriangle, Sparkles, RefreshCw, Loader2, Volume2, VolumeX, Check, ShieldAlert, ChevronRight, LogIn, Cloud } from 'lucide-react';
import { saveProfileSettings, exportWatchlistJSON, importWatchlistJSON, resetAllData } from '../../services/storage';
import { signOut } from '../../services/auth';
import { CURRENT_APP_VERSION } from '../../services/updater';
import { sound } from '../../services/soundEffects';

export default function ProfileView({ 
  profile, 
  onUpdateProfile, 
  darkMode, 
  onToggleTheme, 
  watchlist,
  onReloadWatchlist,
  currentUser,
  onCheckForUpdate,
  onOpenModeratorStudio,
  onOpenLogin
}) {
  const [username, setUsername] = useState(profile.username || 'Scout Trainee');
  const [titleLang, setTitleLang] = useState(profile.titleLanguage || 'english');
  const [soundEnabled, setSoundEnabled] = useState(sound.enabled);
  const [savedMessage, setSavedMessage] = useState('');
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateCheckMsg, setUpdateCheckMsg] = useState('');

  React.useEffect(() => {
    if (profile.username) setUsername(profile.username);
    if (profile.titleLanguage) setTitleLang(profile.titleLanguage);
  }, [profile]);

  // Auto-save whenever username or titleLang changes (debounced)
  React.useEffect(() => {
    if (username === profile.username && titleLang === profile.titleLanguage) return;
    const timer = setTimeout(async () => {
      const updated = {
        ...profile,
        username,
        titleLanguage: titleLang,
        theme: darkMode ? 'dark' : 'light'
      };
      onUpdateProfile(updated);
      await saveProfileSettings(updated);
      setSavedMessage('Saved');
      setTimeout(() => setSavedMessage(''), 1200);
    }, 600);
    return () => clearTimeout(timer);
  }, [username, titleLang]);

  const handleExport = async () => {
    await exportWatchlistJSON();
    setSavedMessage('Backup downloaded!');
    setTimeout(() => setSavedMessage(''), 2000);
  };

  const handleImportJson = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const res = await importWatchlistJSON(text);
      if (res && res.success && res.count > 0) {
        onReloadWatchlist();
        setSavedMessage(`Imported ${res.count} anime into watchlist!`);
      } else {
        setSavedMessage(res?.error || 'Import failed or file was empty.');
      }
    } catch (err) {
      setSavedMessage('Failed to read file: ' + err.message);
    } finally {
      e.target.value = '';
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

  const handleCheckUpdate = async () => {
    if (checkingUpdate) return;
    setCheckingUpdate(true);
    setUpdateCheckMsg('');
    try {
      if (onCheckForUpdate) {
        const res = await onCheckForUpdate();
        if (!res?.hasUpdate) {
          setUpdateCheckMsg('You are using the latest version (v' + (res?.version || CURRENT_APP_VERSION) + ')');
          setTimeout(() => setUpdateCheckMsg(''), 3000);
        }
      }
    } catch (_) {
      setUpdateCheckMsg('Could not reach update server.');
      setTimeout(() => setUpdateCheckMsg(''), 3000);
    } finally {
      setCheckingUpdate(false);
    }
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
            {currentUser?.email ? (
              <p className="text-xs text-stone-500 font-mono mt-0.5">
                {currentUser.email}
              </p>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-400 text-stone-950 text-[10px] font-black uppercase tracking-wider border border-stone-900 shadow-2xs mt-1">
                Guest Mode (Local)
              </span>
            )}
            <p className="text-xs text-stone-500 font-sans mt-1">
              {(watchlist || []).length} anime tracked · {(watchlist || []).filter(i => i.status === 'completed').length} completed
            </p>
          </div>
        </div>
      </div>

      {/* Guest Mode Warning & Cloud Sync Prompt */}
      {!currentUser && (
        <div className="card-manga-panel p-4 bg-amber-400/15 border-2 border-stone-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-400 border border-stone-900 shrink-0 mt-0.5">
              <Cloud className="w-4 h-4 text-stone-950" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-xs font-black uppercase text-ink-900 flex items-center gap-1.5">
                Guest Mode Active
                <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400 font-bold">(Data Loss Risk)</span>
              </h3>
              <p className="text-[11px] text-stone-700 dark:text-stone-300">
                Your anime is currently stored only in this local device's browser cache. Sign in to safely backup and sync your watchlist to the cloud.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenLogin}
            className="w-full sm:w-auto btn-manga bg-navy-700 hover:bg-navy-600 text-white text-xs font-black px-4 py-2 rounded-lg border-2 border-stone-900 shadow-2xs flex items-center justify-center gap-1.5 shrink-0"
          >
            <LogIn className="w-3.5 h-3.5 text-amber-400" />
            <span>Sign In / Sync</span>
          </button>
        </div>
      )}

      {/* Preferences Card */}
      <div className="card-manga-panel p-4 bg-sand-50 dark:bg-sand-200 space-y-4">
        <h2 className="font-display font-bold text-base text-ink-900 uppercase tracking-tight">
          Preferences
        </h2>

        {/* Display Name */}
        <div>
          <label className="block text-xs font-bold text-stone-600 dark:text-stone-400 mb-1">
            Display Name
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 bg-sand-100 dark:bg-sand-300 border-2 border-stone-900 rounded font-sans text-sm text-ink-900 font-bold focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
        </div>

        {/* Title Language */}
        <div>
          <label className="block text-xs font-bold text-stone-600 dark:text-stone-400 mb-1">
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
            className="btn-manga bg-sand-100 dark:bg-sand-300 hover:bg-amber-400 hover:text-stone-950 text-ink-900 px-3 py-1.5 text-xs flex items-center gap-1.5"
          >
            {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-stone-700" />}
            <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>

        {/* Sound Effects Toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-sand-300 dark:border-sand-400">
          <div>
            <p className="text-xs font-bold text-ink-900">Sound Effects & Haptics</p>
            <p className="text-[10px] text-stone-500 font-sans">Play micro-tones on taps, episode steps & celebrations</p>
          </div>
          <button
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              sound.setEnabled(next);
              if (next) sound.playSaveSuccess();
            }}
            className={`btn-manga px-3 py-1.5 text-xs flex items-center gap-1.5 ${
              soundEnabled 
                ? 'bg-amber-400 text-stone-950 font-black' 
                : 'bg-sand-100 dark:bg-sand-300 text-stone-500 dark:text-stone-300'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{soundEnabled ? 'Enabled' : 'Muted'}</span>
          </button>
        </div>

        {/* Auto-save confirmation */}
        {savedMessage && (
          <div className="text-xs font-bold text-status-watching text-center py-1 animate-fade-in flex items-center justify-center gap-1">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>{savedMessage}</span>
          </div>
        )}
      </div>

      {/* Moderator Studio Launch Card */}
      {onOpenModeratorStudio && (
        <div className="card-manga-panel p-4 bg-sand-50 dark:bg-sand-200 border-2 border-stone-900 shadow-manga space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="p-2 rounded-md bg-amber-400 border border-stone-900 shadow-2xs shrink-0">
                <ShieldAlert className="w-4 h-4 text-stone-950" />
              </span>
              <div className="min-w-0">
                <h3 className="font-display font-black text-sm text-ink-900 uppercase tracking-tight">
                  Moderator Studio
                </h3>
                <p className="text-[10px] text-stone-500 font-sans line-clamp-1">
                  Publish daily anime news, trailers, and announcements
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                sound.playTab();
                onOpenModeratorStudio();
              }}
              className="btn-manga bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-black px-3 py-1.5 rounded-md flex items-center gap-1 shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)] shrink-0 active:translate-y-0.5"
            >
              <span>Studio</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* App Version & Updates */}
      <div className="card-manga-panel p-4 bg-sand-50 dark:bg-sand-200 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-base text-ink-900 uppercase tracking-tight flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              App Version
            </h2>
            <p className="text-xs text-stone-500 font-mono mt-0.5">
              Installed: v{CURRENT_APP_VERSION}
            </p>
          </div>

          <button
            onClick={handleCheckUpdate}
            disabled={checkingUpdate}
            className="btn-manga bg-sand-100 dark:bg-sand-300 hover:bg-amber-400 hover:text-stone-950 text-ink-900 text-xs px-3 py-2 rounded flex items-center gap-1.5 font-bold disabled:opacity-50"
          >
            {checkingUpdate ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Checking...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Check for Updates</span>
              </>
            )}
          </button>
        </div>

        {updateCheckMsg && (
          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono pt-1 animate-fade-in">
            {updateCheckMsg}
          </p>
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
            className="flex-1 btn-manga bg-sand-100 dark:bg-sand-300 hover:bg-amber-400 hover:text-stone-950 text-ink-900 text-xs py-2 px-3 flex items-center justify-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Export JSON</span>
          </button>

          {/* Import JSON */}
          <label className="flex-1 btn-manga bg-sand-100 dark:bg-sand-300 hover:bg-amber-400 hover:text-stone-950 text-ink-900 text-xs py-2 px-3 flex items-center justify-center gap-1.5 cursor-pointer">
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
                  className="btn-manga bg-status-dropped text-white text-xs px-3 py-1 font-bold"
                >
                  Yes, Reset Everything
                </button>
                <button
                  onClick={() => setShowConfirmReset(false)}
                  className="text-xs text-stone-600 dark:text-stone-300 px-2 py-1 hover:underline"
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
            className="w-full btn-manga bg-status-dropped hover:bg-red-600 text-white py-2.5 rounded font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      )}

    </div>
  );
}
