import React, { useState, useEffect } from 'react';
import { 
  User, Sun, Moon, Globe, Download, Upload, Trash2, LogOut, 
  Sparkles, RefreshCw, Loader2, Volume2, VolumeX, Check, 
  ShieldAlert, ChevronRight, LogIn, Cloud, Camera, Edit3, 
  Film, Tv, Trophy, ShieldCheck, Heart, Info, AlertCircle
} from 'lucide-react';
import { saveProfileSettings, exportWatchlistJSON, importWatchlistJSON, resetAllData } from '../../services/storage';
import { signOut } from '../../services/auth';
import { CURRENT_APP_VERSION } from '../../services/updater';
import { sound } from '../../services/soundEffects';
import AvatarCropModal from './AvatarCropModal';
import ConfirmModal from '../Common/ConfirmModal';

export default function ProfileView({ 
  profile = {}, 
  onUpdateProfile, 
  darkMode, 
  onToggleTheme, 
  watchlist = [],
  onReloadWatchlist,
  currentUser,
  onCheckForUpdate,
  onOpenModeratorStudio,
  onOpenLogin
}) {
  const [username, setUsername] = useState(profile.username || 'Anime Scout');
  const [bio, setBio] = useState(profile.bio || 'Dedicated anime watcher & seasonal tracker');
  const [avatar, setAvatar] = useState(profile.avatar || '');
  const [titleLang, setTitleLang] = useState(profile.titleLanguage || 'english');
  const [soundEnabled, setSoundEnabled] = useState(sound.enabled);
  const [savedMessage, setSavedMessage] = useState('');
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState({ isOpen: false });
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateCheckMsg, setUpdateCheckMsg] = useState('');

  useEffect(() => {
    if (profile.username) setUsername(profile.username);
    if (profile.bio !== undefined) setBio(profile.bio);
    if (profile.avatar !== undefined) setAvatar(profile.avatar);
    if (profile.titleLanguage) setTitleLang(profile.titleLanguage);
  }, [profile]);

  // Auto-save debounced settings changes
  const saveChanges = async (newProfile) => {
    const updated = {
      ...profile,
      username: newProfile.username !== undefined ? newProfile.username : username,
      bio: newProfile.bio !== undefined ? newProfile.bio : bio,
      avatar: newProfile.avatar !== undefined ? newProfile.avatar : avatar,
      titleLanguage: newProfile.titleLanguage !== undefined ? newProfile.titleLanguage : titleLang,
      theme: darkMode ? 'dark' : 'light'
    };
    if (onUpdateProfile) onUpdateProfile(updated);
    await saveProfileSettings(updated);
    setSavedMessage('Profile Saved!');
    sound.playSaveSuccess();
    setTimeout(() => setSavedMessage(''), 1500);
  };

  const handleSaveAvatar = (newAvatarUrl) => {
    setAvatar(newAvatarUrl);
    saveChanges({ avatar: newAvatarUrl });
  };

  const handleRemoveAvatar = () => {
    setAvatar('');
    saveChanges({ avatar: '' });
  };

  const handleSaveIdentity = () => {
    saveChanges({ username, bio });
    setIsEditingProfile(false);
  };

  const handleSelectTitleLang = (lang) => {
    setTitleLang(lang);
    saveChanges({ titleLanguage: lang });
    sound.playTap();
  };

  const handleToggleAudio = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sound.setEnabled(next);
    if (next) sound.playSaveSuccess();
  };

  const handleExport = async () => {
    await exportWatchlistJSON();
    sound.playSaveSuccess();
    setSavedMessage('Backup downloaded!');
    setTimeout(() => setSavedMessage(''), 2000);
  };

  const handleImportJson = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const res = await importWatchlistJSON(text);
      if (res && res.success && res.count > 0) {
        onReloadWatchlist();
        sound.playSaveSuccess();
        setSavedMessage(`Imported ${res.count} anime successfully!`);
      } else {
        setSavedMessage(res?.error || 'Import failed or file was empty.');
        sound.playError();
      }
    } catch (err) {
      setSavedMessage('Failed to read file: ' + err.message);
      sound.playError();
    } finally {
      e.target.value = '';
      setTimeout(() => setSavedMessage(''), 3000);
    }
  };

  const handlePromptResetData = () => {
    sound.playTap();
    setConfirmModalConfig({
      isOpen: true,
      title: 'Reset All Local App Data?',
      message: 'This will permanently wipe all local watchlist entries, episode logs, and custom preferences on this device.',
      confirmLabel: 'Yes, Reset Everything',
      cancelLabel: 'Cancel',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModalConfig({ isOpen: false });
        await resetAllData();
        onReloadWatchlist();
        sound.playSaveSuccess();
        setSavedMessage('All data reset to initial defaults.');
        setTimeout(() => setSavedMessage(''), 2000);
      },
      onCancel: () => setConfirmModalConfig({ isOpen: false })
    });
  };

  const handlePromptSignOut = () => {
    sound.playTap();
    setConfirmModalConfig({
      isOpen: true,
      title: 'Sign Out of AniTrack?',
      message: 'Your cloud data will remain safely stored. You will switch back to local guest mode.',
      confirmLabel: 'Sign Out',
      cancelLabel: 'Stay Signed In',
      variant: 'warning',
      onConfirm: async () => {
        setConfirmModalConfig({ isOpen: false });
        await signOut();
        onReloadWatchlist();
        sound.playSaveSuccess();
      },
      onCancel: () => setConfirmModalConfig({ isOpen: false })
    });
  };

  const handleCheckUpdate = async () => {
    if (checkingUpdate) return;
    setCheckingUpdate(true);
    setUpdateCheckMsg('');
    sound.playTap();
    try {
      if (onCheckForUpdate) {
        const res = await onCheckForUpdate();
        if (!res?.hasUpdate) {
          setUpdateCheckMsg('You are using the latest version (v' + (res?.version || CURRENT_APP_VERSION) + ')');
          setTimeout(() => setUpdateCheckMsg(''), 3500);
        }
      }
    } catch (_) {
      setUpdateCheckMsg('Could not connect to update service.');
      setTimeout(() => setUpdateCheckMsg(''), 3000);
    } finally {
      setCheckingUpdate(false);
    }
  };

  // Stats calculation
  const totalTracked = (watchlist || []).length;
  const totalCompleted = (watchlist || []).filter(i => i.status === 'completed').length;
  const totalWatching = (watchlist || []).filter(i => i.status === 'watching').length;

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-24 animate-fade-in">

      {/* ═══ 1. HERO MANGA PROFILE CARD ═══ */}
      <div className="card-manga-panel p-0 overflow-hidden bg-sand-50 dark:bg-sand-200 border-3 border-stone-900 shadow-manga-lg">
        
        {/* Banner Texture Header */}
        <div className="h-24 sm:h-28 w-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 border-b-2 border-stone-900 relative px-4 py-3 flex items-start justify-between">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-stone-950 text-amber-400 text-[10px] font-mono font-black uppercase rounded-md border border-stone-900 shadow-2xs">
            <Sparkles className="w-3 h-3" />
            <span>AniTrack Passport</span>
          </div>

          <button
            onClick={() => setIsEditingProfile(!isEditingProfile)}
            className="btn-manga bg-sand-50 text-stone-950 text-xs font-black px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-amber-100 shadow-2xs"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditingProfile ? 'Done' : 'Edit Profile'}</span>
          </button>
        </div>

        {/* Profile Content Body */}
        <div className="px-5 pb-5 pt-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            
            {/* Circular Avatar floating cleanly over the banner border */}
            <div className="relative -mt-10 sm:-mt-12 self-center sm:self-auto shrink-0 group cursor-pointer" onClick={() => setShowAvatarModal(true)}>
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-3 border-stone-900 bg-navy-700 text-sand-50 flex items-center justify-center font-display font-black text-2xl sm:text-3xl shadow-[3px_3px_0px_0px_rgba(24,19,13,1)] overflow-hidden relative transition-transform group-hover:scale-105">
                {avatar ? (
                  <img 
                    src={avatar} 
                    alt={username} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <span>{username.charAt(0).toUpperCase()}</span>
                )}

                {/* Hover Camera Overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity backdrop-blur-xs">
                  <Camera className="w-5 h-5 text-amber-400" />
                  <span className="text-[8px] font-mono font-bold uppercase mt-0.5">Change</span>
                </div>
              </div>

              {/* Edit Camera Badge Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAvatarModal(true);
                }}
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-amber-400 text-stone-950 border-2 border-stone-900 flex items-center justify-center shadow-2xs hover:scale-110 active:scale-95 transition-all"
                title="Change Avatar"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Display Name, Cloud Sync & Bio (Cleanly positioned with NO overlap) */}
            <div className="flex-1 min-w-0 pt-2 sm:pt-3 text-center sm:text-left space-y-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="font-display font-black text-xl sm:text-2xl text-ink-900 leading-tight">
                  {username}
                </h1>
                {currentUser?.email ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    Cloud Sync Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-400/30 text-amber-900 dark:text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold">
                    <Info className="w-3 h-3 text-amber-600" />
                    Local Guest Mode
                  </span>
                )}
              </div>

              {currentUser?.email && (
                <p className="text-xs font-mono text-stone-500 font-semibold truncate">
                  {currentUser.email}
                </p>
              )}

              {bio && bio.trim() && (
                <p className="text-xs text-stone-700 dark:text-stone-300 font-sans italic max-w-xl pt-0.5">
                  "{bio.trim()}"
                </p>
              )}
            </div>

          </div>

          {/* Quick Stat Chips */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-5 pt-4 border-t-2 border-stone-900/10 dark:border-stone-100/10">
            <div className="py-2.5 px-3 rounded-lg bg-sand-100 dark:bg-stone-800 border-2 border-stone-900 text-center shadow-2xs">
              <span className="text-[10px] font-mono uppercase font-black tracking-wider text-stone-500 dark:text-stone-400 block">
                Tracked
              </span>
              <span className="font-display font-black text-lg sm:text-xl text-stone-900 dark:text-stone-100">
                {totalTracked}
              </span>
            </div>

            <div className="py-2.5 px-3 rounded-lg bg-sand-100 dark:bg-stone-800 border-2 border-stone-900 text-center shadow-2xs">
              <span className="text-[10px] font-mono uppercase font-black tracking-wider text-emerald-600 dark:text-emerald-400 block">
                Watching
              </span>
              <span className="font-display font-black text-lg sm:text-xl text-emerald-600 dark:text-emerald-400">
                {totalWatching}
              </span>
            </div>

            <div className="py-2.5 px-3 rounded-lg bg-sand-100 dark:bg-stone-800 border-2 border-stone-900 text-center shadow-2xs">
              <span className="text-[10px] font-mono uppercase font-black tracking-wider text-amber-600 dark:text-amber-400 block">
                Completed
              </span>
              <span className="font-display font-black text-lg sm:text-xl text-amber-600 dark:text-amber-400">
                {totalCompleted}
              </span>
            </div>
          </div>

          {/* Inline Edit Form Drawer */}
          {isEditingProfile && (
            <div className="mt-5 p-4 rounded-xl border-2 border-stone-900 bg-sand-100 dark:bg-stone-800 space-y-4 animate-fade-in shadow-2xs">
              <div className="flex items-center justify-between border-b border-stone-900/20 pb-2">
                <h3 className="font-display font-black text-sm text-ink-900 uppercase">
                  Edit Identity
                </h3>
                <button
                  onClick={() => setShowAvatarModal(true)}
                  className="btn-manga bg-amber-400 text-stone-950 text-xs font-bold px-2.5 py-1 flex items-center gap-1"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Change Avatar</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Your Scout Name"
                  className="w-full px-3 py-2 bg-sand-50 dark:bg-stone-900 border-2 border-stone-900 rounded-lg font-sans text-sm text-ink-900 font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Profile Bio / Status Quote
                </label>
                <input
                  type="text"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="e.g. Currently watching Attack on Titan..."
                  maxLength={100}
                  className="w-full px-3 py-2 bg-sand-50 dark:bg-stone-900 border-2 border-stone-900 rounded-lg font-sans text-sm text-ink-900 font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsEditingProfile(false)}
                  className="px-3 py-1.5 rounded-lg border-2 border-stone-900 bg-sand-200 dark:bg-stone-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveIdentity}
                  className="btn-manga bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-black px-4 py-1.5 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Save Profile</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ 2. GUEST SYNC PROMPT ═══ */}
      {!currentUser && (
        <div className="card-manga-panel p-4 bg-amber-400/20 border-2 border-stone-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-400 border border-stone-900 shrink-0 mt-0.5 text-stone-950">
              <Cloud className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-xs font-black uppercase text-ink-900 flex items-center gap-1.5">
                <span>Guest Mode Active</span>
                <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400 font-bold">(Data Loss Risk)</span>
              </h3>
              <p className="text-[11px] text-stone-700 dark:text-stone-300">
                Your anime is stored locally. Sign in to safely backup and synchronize your watchlist across all devices.
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

      {/* ═══ 3. PREFERENCES ═══ */}
      <div className="card-manga-panel p-4 sm:p-5 bg-sand-50 dark:bg-sand-200 border-2 border-stone-900 space-y-4">
        <h2 className="font-display font-black text-sm sm:text-base text-ink-900 uppercase tracking-tight flex items-center gap-2 border-b-2 border-stone-900 pb-2">
          <Globe className="w-4 h-4 text-amber-500" />
          <span>App Preferences</span>
        </h2>

        {/* Anime Title Language Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
            Anime Title Language
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { id: 'english', label: 'English', example: 'Attack on Titan' },
              { id: 'romaji', label: 'Romaji', example: 'Shingeki no Kyojin' },
              { id: 'native', label: 'Native (日本語)', example: '進撃の巨人' }
            ].map(opt => {
              const isSelected = titleLang === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => handleSelectTitleLang(opt.id)}
                  className={`p-3 rounded-lg border-2 border-stone-900 text-left transition-all active:scale-95 ${
                    isSelected 
                      ? 'bg-amber-400 text-stone-950 font-black shadow-[2px_2px_0px_0px_rgba(24,19,13,1)]' 
                      : 'bg-sand-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:bg-sand-200 dark:hover:bg-stone-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">{opt.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3] text-stone-950" />}
                  </div>
                  <span className={`text-[10px] block mt-1 line-clamp-1 ${isSelected ? 'text-stone-900/80 font-semibold' : 'text-stone-500 dark:text-stone-400'}`}>
                    e.g. {opt.example}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Theme & Audio Switches */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-stone-900/10 dark:border-stone-100/10">
          
          {/* Dark / Light Mode Switch */}
          <div className="p-3 rounded-lg bg-sand-100 dark:bg-stone-800 border-2 border-stone-900 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-ink-900">Appearance</p>
              <p className="text-[10px] text-stone-500">
                {darkMode ? 'Midnight Ink Theme' : 'Light Manga Parchment'}
              </p>
            </div>
            <button
              onClick={onToggleTheme}
              className="btn-manga bg-sand-50 dark:bg-stone-700 hover:bg-amber-400 hover:text-stone-950 text-ink-900 px-3 py-1.5 text-xs flex items-center gap-1.5"
            >
              {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-stone-700" />}
              <span>{darkMode ? 'Light' : 'Dark'}</span>
            </button>
          </div>

          {/* Sound Effects & Haptics Switch */}
          <div className="p-3 rounded-lg bg-sand-100 dark:bg-stone-800 border-2 border-stone-900 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-ink-900">Sound Effects</p>
              <p className="text-[10px] text-stone-500">
                Tactile audio for taps & milestones
              </p>
            </div>
            <button
              onClick={handleToggleAudio}
              className={`btn-manga px-3 py-1.5 text-xs flex items-center gap-1.5 ${
                soundEnabled 
                  ? 'bg-amber-400 text-stone-950 font-black' 
                  : 'bg-sand-50 dark:bg-stone-700 text-stone-500 dark:text-stone-300'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span>{soundEnabled ? 'Enabled' : 'Muted'}</span>
            </button>
          </div>

        </div>

        {/* Auto-save confirmation */}
        {savedMessage && (
          <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 text-center py-1 animate-fade-in flex items-center justify-center gap-1.5 font-mono">
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{savedMessage}</span>
          </div>
        )}
      </div>

      {/* ═══ 4. MODERATOR STUDIO LAUNCHER ═══ */}
      {onOpenModeratorStudio && (
        <div className="card-manga-panel p-4 bg-sand-50 dark:bg-sand-200 border-2 border-stone-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="p-2 rounded-lg bg-amber-400 border border-stone-900 text-stone-950 shadow-2xs shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <h3 className="font-display font-black text-sm text-ink-900 uppercase">
                Moderator Studio
              </h3>
              <p className="text-[10px] text-stone-500 font-sans truncate">
                Publish daily anime news, trailers, and announcements
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playTab();
              onOpenModeratorStudio();
            }}
            className="btn-manga bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-black px-3.5 py-2 rounded-lg flex items-center gap-1 shrink-0"
          >
            <span>Open Studio</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ═══ 5. BACKUP & DATA MANAGEMENT ═══ */}
      <div className="card-manga-panel p-4 sm:p-5 bg-sand-50 dark:bg-sand-200 border-2 border-stone-900 space-y-3.5">
        <h2 className="font-display font-black text-sm sm:text-base text-ink-900 uppercase tracking-tight flex items-center gap-2 border-b-2 border-stone-900 pb-2">
          <Download className="w-4 h-4 text-amber-500" />
          <span>Data & Backup</span>
        </h2>

        <p className="text-xs text-stone-600 dark:text-stone-400 font-sans">
          Export your watchlist to JSON for backup or transfer between devices.
        </p>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={handleExport}
            className="flex-1 btn-manga bg-sand-100 dark:bg-stone-800 hover:bg-amber-400 hover:text-stone-950 text-ink-900 text-xs py-2.5 px-3 flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4 text-amber-500" />
            <span>Export JSON Backup</span>
          </button>

          <label className="flex-1 btn-manga bg-sand-100 dark:bg-stone-800 hover:bg-amber-400 hover:text-stone-950 text-ink-900 text-xs py-2.5 px-3 flex items-center justify-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4 text-emerald-500" />
            <span>Restore JSON Backup</span>
            <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
          </label>
        </div>

        {/* Reset App Data Action */}
        <div className="pt-2 border-t border-stone-900/10 dark:border-stone-100/10 flex justify-end">
          <button
            onClick={handlePromptResetData}
            className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset All Local App Data</span>
          </button>
        </div>
      </div>

      {/* ═══ 6. APP DIAGNOSTICS & UPDATER ═══ */}
      <div className="card-manga-panel p-4 bg-sand-50 dark:bg-sand-200 border-2 border-stone-900 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-display font-black text-sm text-ink-900 uppercase flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>AniTrack Version</span>
          </h3>
          <p className="text-xs text-stone-500 font-mono mt-0.5">
            v{CURRENT_APP_VERSION} · Powered by AniList
          </p>
          {updateCheckMsg && (
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-1 animate-fade-in">
              {updateCheckMsg}
            </p>
          )}
        </div>

        <button
          onClick={handleCheckUpdate}
          disabled={checkingUpdate}
          className="btn-manga bg-sand-100 dark:bg-stone-800 hover:bg-amber-400 hover:text-stone-950 text-ink-900 text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 font-bold disabled:opacity-50 shrink-0"
        >
          {checkingUpdate ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Checking...</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Check Update</span>
            </>
          )}
        </button>
      </div>

      {/* ═══ 7. SIGN OUT (When logged in) ═══ */}
      {currentUser && (
        <div className="pt-2">
          <button
            onClick={handlePromptSignOut}
            className="w-full btn-manga bg-rose-600 hover:bg-rose-500 text-white py-3 rounded-xl font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2 shadow-manga"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out ({currentUser.email || 'Account'})</span>
          </button>
        </div>
      )}

      {/* Avatar Circle Crop & Presets Modal */}
      <AvatarCropModal
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        currentAvatar={avatar}
        onSaveAvatar={handleSaveAvatar}
        onRemoveAvatar={handleRemoveAvatar}
      />

      {/* Confirm Action Modal */}
      <ConfirmModal
        isOpen={confirmModalConfig.isOpen}
        title={confirmModalConfig.title}
        message={confirmModalConfig.message}
        confirmLabel={confirmModalConfig.confirmLabel}
        cancelLabel={confirmModalConfig.cancelLabel}
        variant={confirmModalConfig.variant}
        onConfirm={confirmModalConfig.onConfirm}
        onCancel={confirmModalConfig.onCancel}
      />

    </div>
  );
}
