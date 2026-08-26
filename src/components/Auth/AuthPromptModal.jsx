import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Cloud, AlertTriangle, ShieldCheck, LogIn, UserX, Check } from 'lucide-react';
import { sound } from '../../services/soundEffects';

export default function AuthPromptModal({
  isOpen,
  onClose,
  onSignIn,
  onContinueAsGuest,
  actionLabel = 'track anime in your watchlist'
}) {
  const [dontAskAgain, setDontAskAgain] = useState(true);

  if (!isOpen) return null;

  const handleGuestChoice = () => {
    sound.playTap();
    if (dontAskAgain) {
      try {
        localStorage.setItem('anitrack_guest_ack', 'true');
      } catch (_) {}
    }
    onContinueAsGuest();
  };

  const handleSignInChoice = () => {
    sound.playTap();
    if (dontAskAgain) {
      try {
        localStorage.setItem('anitrack_guest_ack', 'true');
      } catch (_) {}
    }
    onSignIn();
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9995] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}
      onClick={onClose}
    >
      <div 
        className="card-manga-panel bg-sand-50 dark:bg-sand-100 max-w-md w-full p-5 sm:p-6 rounded-xl border-2 border-stone-900 shadow-manga-lg overflow-hidden relative flex flex-col space-y-4 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-20 w-8 h-8 rounded-full bg-sand-50/90 dark:bg-sand-200 border-2 border-stone-900 flex items-center justify-center shadow-2xs hover:bg-sand-200 active:scale-95 transition-all"
        >
          <X className="w-4 h-4 text-ink-900" />
        </button>

        {/* Header Icon & Title */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-400 border-2 border-stone-900 flex items-center justify-center shadow-2xs shrink-0">
            <Cloud className="w-6 h-6 text-stone-950" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
              Cloud Backup & Sync
            </span>
            <h2 className="font-display font-black text-lg text-ink-900 uppercase tracking-tight">
              Sign In to Save Your Anime
            </h2>
          </div>
        </div>

        {/* Context message */}
        <p className="text-xs text-stone-700 dark:text-stone-300 font-medium">
          You are about to <span className="font-black text-ink-900 underline">{actionLabel}</span>. Sign in with your account to keep your data synced across all your devices.
        </p>

        {/* Data Loss Warning Box */}
        <div className="p-3.5 bg-rose-500/10 dark:bg-rose-950/30 rounded-lg border-2 border-rose-600/40 space-y-1.5">
          <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <h4 className="text-xs font-black uppercase tracking-tight">
              ⚠️ Warning: Guest Data Loss Risk
            </h4>
          </div>
          <p className="text-[11px] text-rose-700 dark:text-rose-300 leading-relaxed">
            In <strong>Guest mode</strong>, all your watchlist entries, progress, and scores are stored <strong>only in this local browser/device storage</strong>.
            If you clear cookies/cache, use private/incognito mode, or switch devices, <strong>you will lose your tracked anime and history permanently</strong>.
          </p>
        </div>

        {/* Action Choice Buttons */}
        <div className="space-y-2 pt-1">
          {/* Primary: Sign in */}
          <button
            onClick={handleSignInChoice}
            className="w-full btn-manga bg-navy-700 hover:bg-navy-600 text-white py-3 px-4 rounded-lg font-display font-black text-xs uppercase tracking-wider border-2 border-stone-900 shadow-manga flex items-center justify-center gap-2 active:scale-98 transition-all"
          >
            <LogIn className="w-4 h-4 text-amber-400" />
            <span>Sign In / Create Free Account (Recommended)</span>
          </button>

          {/* Secondary: Continue as Guest */}
          <button
            onClick={handleGuestChoice}
            className="w-full py-2.5 px-4 bg-sand-200 dark:bg-sand-300 hover:bg-sand-300 text-stone-800 dark:text-stone-100 rounded-lg font-bold text-xs border-2 border-stone-900/60 flex items-center justify-center gap-2 active:scale-98 transition-all"
          >
            <UserX className="w-4 h-4 text-stone-500" />
            <span>Continue as Guest (I Accept Risk of Data Loss)</span>
          </button>
        </div>

        {/* Don't ask again toggle */}
        <label className="flex items-center gap-2 pt-1 text-[11px] font-bold text-stone-600 dark:text-stone-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={dontAskAgain}
            onChange={(e) => setDontAskAgain(e.target.checked)}
            className="w-3.5 h-3.5 accent-amber-500 rounded cursor-pointer"
          />
          <span>Remember my guest preference on this device</span>
        </label>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
