import React from 'react';
import { createPortal } from 'react-dom';
import { Download, Sparkles, X, ExternalLink, ShieldCheck, HelpCircle, FolderDown } from 'lucide-react';
import { dismissUpdate } from '../../services/updater';

export default function UpdateModal({ updateInfo, onClose }) {
  if (!updateInfo || !updateInfo.hasUpdate) return null;

  const handleDismiss = () => {
    dismissUpdate(updateInfo.version);
    onClose();
  };

  const openUrlInSystemBrowser = (url) => {
    if (!url) return;
    try {
      // Create a direct anchor element with target="_blank"
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (_) {
      try {
        window.open(url, '_system');
      } catch (__) {
        window.location.href = url;
      }
    }
  };

  const handleDirectDownload = () => {
    const url = updateInfo.downloadUrl || 'https://github.com/asmit260/app/releases/latest/download/app-debug.apk';
    openUrlInSystemBrowser(url);
    handleDismiss();
  };

  const handleOpenGitHubPage = () => {
    openUrlInSystemBrowser('https://github.com/asmit260/app/releases/latest');
    handleDismiss();
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}
      onClick={handleDismiss}
    >
      <div 
        className="card-manga-panel bg-sand-50 dark:bg-sand-100 max-w-sm w-full p-5 relative rounded-lg border-2 border-stone-900 shadow-manga-lg overflow-hidden space-y-3.5 max-h-[90vh] overflow-y-auto hide-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-sand-50/90 dark:bg-sand-200 border-2 border-stone-900 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(24,19,13,1)] active:translate-y-0.5"
          title="Dismiss"
        >
          <X className="w-4 h-4 text-ink-900" />
        </button>

        {/* Header with Badges */}
        <div className="space-y-1 pr-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-400 text-ink-900 border border-stone-900 shadow-sm">
            <Sparkles className="w-3 h-3 fill-current" />
            <span>New Update Available</span>
          </div>

          <h3 className="font-display font-black text-lg text-ink-900 leading-tight">
            {updateInfo.releaseName || `Version v${updateInfo.version}`}
          </h3>

          <div className="flex items-center gap-2 text-xs font-mono font-bold text-stone-600 dark:text-stone-400">
            <span className="line-through text-stone-400">v{updateInfo.currentVersion}</span>
            <span>→</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-black">v{updateInfo.version}</span>
            {updateInfo.publishedAt && <span>· {updateInfo.publishedAt}</span>}
          </div>
        </div>

        {/* Release Notes */}
        <div className="p-3 bg-sand-100 dark:bg-sand-200 rounded border-2 border-stone-900/40 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 font-mono">
            What's New:
          </p>
          <div className="text-xs text-stone-700 dark:text-stone-300 font-sans leading-relaxed whitespace-pre-line max-h-28 overflow-y-auto hide-scrollbar">
            {updateInfo.releaseNotes}
          </div>
        </div>

        {/* POCO / Xiaomi / Android Installer Tip Box */}
        <div className="p-2.5 bg-amber-400/10 border border-amber-500/40 rounded text-stone-700 dark:text-stone-300 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-400">
            <FolderDown className="w-3.5 h-3.5 shrink-0" />
            <span>POCO / Xiaomi Installation Guide</span>
          </div>
          <p className="text-[10px] text-stone-600 dark:text-stone-400 leading-normal">
            Once download reaches 100%, swipe down your notification bar to tap <b>"Download Complete"</b> or open <b>File Manager &gt; Downloads &gt; app-debug.apk</b> to install.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-1 space-y-2">
          <button
            onClick={handleDirectDownload}
            className="w-full btn-manga bg-amber-400 hover:bg-amber-300 text-ink-900 py-2.5 px-4 rounded font-black text-xs uppercase tracking-wide flex items-center justify-center gap-2 shadow-[2px_2px_0px_0px_rgba(24,19,13,1)] active:translate-y-0.5"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>Download APK Directly</span>
          </button>

          <div className="flex gap-2">
            <button
              onClick={handleOpenGitHubPage}
              className="flex-grow btn-manga bg-sand-100 dark:bg-sand-200 hover:bg-sand-200 text-stone-700 dark:text-stone-300 py-2 px-3 rounded font-bold text-xs flex items-center justify-center gap-1.5 border border-stone-900/40"
              title="Open GitHub Releases in Browser"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>GitHub Releases Page</span>
            </button>

            <button
              onClick={handleDismiss}
              className="btn-manga bg-sand-100 dark:bg-sand-200 hover:bg-sand-200 text-stone-700 dark:text-stone-300 px-3 py-2 rounded font-bold text-xs"
            >
              Later
            </button>
          </div>
        </div>

        {/* Security / Safe note */}
        <div className="flex items-center justify-center gap-1 text-[10px] text-stone-500 font-mono">
          <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
          <span>Official direct release from GitHub</span>
        </div>

      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
