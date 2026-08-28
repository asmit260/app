import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  FileCode2, 
  Globe, 
  ArrowRight, 
  Sparkles, 
  Trophy, 
  Eye, 
  Bookmark, 
  Layers 
} from 'lucide-react';
import { parseMalXml, fetchAniListUserList, batchImportWatchlist, enrichMalEntriesWithAniList } from '../../services/importers';
import { sound } from '../../services/soundEffects';
import { burstConfetti } from '../../utils/confetti';

export default function ImportMigrationModal({
  isOpen,
  onClose,
  onImportComplete
}) {
  const [activeTab, setActiveTab] = useState('mal'); // 'mal' | 'anilist'
  const [anilistUsername, setAnilistUsername] = useState('');
  
  // Status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [previewData, setPreviewData] = useState(null); // { source, count, items, stats }
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, title: '' });
  const [completedSuccess, setCompletedSuccess] = useState(false);

  if (!isOpen) return null;

  const resetState = () => {
    setError(null);
    setPreviewData(null);
    setImporting(false);
    setProgress({ current: 0, total: 0, title: '' });
    setCompletedSuccess(false);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    resetState();
    sound.playTab();
  };

  // Handle MAL XML File Upload
  const handleMalFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    sound.playTap();

    try {
      const text = await file.text();
      const rawItems = parseMalXml(text);

      // Auto-enrich with AniList metadata & covers immediately for beautiful preview
      const items = await enrichMalEntriesWithAniList(rawItems);

      const stats = {
        watching: items.filter(i => i.status === 'watching').length,
        completed: items.filter(i => i.status === 'completed').length,
        plan_to_watch: items.filter(i => i.status === 'plan_to_watch').length,
        on_hold: items.filter(i => i.status === 'on_hold').length,
        dropped: items.filter(i => i.status === 'dropped').length,
      };

      setPreviewData({
        source: 'MyAnimeList XML',
        fileName: file.name,
        count: items.length,
        items,
        stats
      });
      sound.playSaveSuccess();
    } catch (err) {
      console.error("MAL Parse Error:", err);
      setError(err.message || 'Failed to read MyAnimeList export file.');
      sound.playError();
    } finally {
      setLoading(false);
    }
  };

  // Handle AniList Username Fetch
  const handleFetchAniList = async (e) => {
    e.preventDefault();
    if (!anilistUsername.trim()) return;

    setLoading(true);
    setError(null);
    sound.playTap();

    try {
      const res = await fetchAniListUserList(anilistUsername);
      const items = res.entries || [];

      const stats = {
        watching: items.filter(i => i.status === 'watching').length,
        completed: items.filter(i => i.status === 'completed').length,
        plan_to_watch: items.filter(i => i.status === 'plan_to_watch').length,
        on_hold: items.filter(i => i.status === 'on_hold').length,
        dropped: items.filter(i => i.status === 'dropped').length,
      };

      setPreviewData({
        source: `AniList (@${res.user.name})`,
        avatar: res.user.avatar?.medium,
        count: items.length,
        items,
        stats
      });
      sound.playSaveSuccess();
    } catch (err) {
      console.error("AniList Fetch Error:", err);
      setError(err.message || 'Failed to fetch AniList library.');
      sound.playError();
    } finally {
      setLoading(false);
    }
  };

  // Execute Batch Import
  const handleConfirmImport = async () => {
    if (!previewData?.items?.length) return;

    setImporting(true);
    setError(null);

    try {
      const result = await batchImportWatchlist(previewData.items, (cur, tot, title) => {
        setProgress({ current: cur, total: tot, title });
      });

      setCompletedSuccess(true);
      sound.playCelebration();
      burstConfetti();

      if (onImportComplete) {
        onImportComplete(result.importedCount);
      }
    } catch (err) {
      console.error("Batch Import Error:", err);
      setError(err.message || 'An error occurred during import.');
      sound.playError();
    } finally {
      setImporting(false);
    }
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3.5 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="card-manga-panel w-full max-w-lg bg-sand-50 dark:bg-stone-900 border-2 border-stone-900 rounded-xl shadow-[5px_5px_0px_0px_rgba(24,19,13,1)] overflow-hidden flex flex-col max-h-[90vh] animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b-2 border-stone-900 bg-sand-100 dark:bg-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="font-display font-black text-base text-ink-900">
                Import Anime Library
              </h3>
              <p className="text-[11px] text-stone-500 font-sans">
                Migrate your history from MyAnimeList or AniList with 1-click
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded border-2 border-transparent hover:border-stone-900 hover:bg-sand-200 dark:hover:bg-stone-700 transition-all"
            title="Close"
          >
            <X className="w-4 h-4 text-ink-900" />
          </button>
        </div>

        {/* Tab Selection */}
        {!previewData && !completedSuccess && (
          <div className="flex border-b-2 border-stone-900 bg-sand-200/60 dark:bg-stone-800/60">
            <button
              onClick={() => handleTabChange('mal')}
              className={`flex-1 py-2.5 px-4 text-xs font-black flex items-center justify-center gap-2 transition-all ${
                activeTab === 'mal'
                  ? 'bg-sand-50 dark:bg-stone-900 text-ink-900 border-b-2 border-amber-500'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-sand-100 dark:hover:bg-stone-700'
              }`}
            >
              <FileCode2 className="w-4 h-4 text-blue-500" />
              <span>MyAnimeList (XML File)</span>
            </button>
            <button
              onClick={() => handleTabChange('anilist')}
              className={`flex-1 py-2.5 px-4 text-xs font-black flex items-center justify-center gap-2 transition-all ${
                activeTab === 'anilist'
                  ? 'bg-sand-50 dark:bg-stone-900 text-ink-900 border-b-2 border-amber-500'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-sand-100 dark:hover:bg-stone-700'
              }`}
            >
              <Globe className="w-4 h-4 text-sky-500" />
              <span>AniList (Username)</span>
            </button>
          </div>
        )}

        {/* Body Content */}
        <div className="p-5 space-y-4 overflow-y-auto hide-scrollbar">

          {/* ERROR ALERT */}
          {error && (
            <div className="p-3 bg-rose-500/15 border-2 border-rose-500 rounded-lg text-rose-700 dark:text-rose-400 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* COMPLETED SUCCESS SCREEN */}
          {completedSuccess ? (
            <div className="py-6 text-center space-y-3">
              <div className="w-14 h-14 bg-emerald-400 text-stone-950 rounded-full border-2 border-stone-900 mx-auto flex items-center justify-center shadow-manga animate-bounce-subtle">
                <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
              </div>
              <h4 className="font-display font-black text-lg text-ink-900">
                Migration Complete!
              </h4>
              <p className="text-xs text-stone-600 dark:text-stone-300 font-sans max-w-sm mx-auto">
                Successfully imported <strong>{previewData?.count || 0} anime entries</strong> into your AniTrack watchlist.
              </p>
              <button
                onClick={onClose}
                className="btn-manga bg-amber-400 text-stone-950 text-xs px-5 py-2 font-black shadow-manga mt-2"
              >
                Go to My Watchlist
              </button>
            </div>
          ) : importing ? (
            /* IMPORT PROGRESS BAR */
            <div className="py-8 space-y-4 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto" />
              <div className="space-y-1">
                <h4 className="font-display font-black text-sm text-ink-900">
                  Importing Library ({progress.current} / {progress.total})
                </h4>
                <p className="text-xs font-mono text-stone-500 truncate max-w-xs mx-auto">
                  {progress.title}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 bg-sand-200 dark:bg-stone-700 rounded-full border border-stone-900 overflow-hidden">
                <div 
                  className="h-full bg-amber-400 transition-all duration-150 rounded-full"
                  style={{ width: `${Math.round((progress.current / (progress.total || 1)) * 100)}%` }}
                />
              </div>
            </div>
          ) : previewData ? (
            /* PREVIEW SUMMARY SCREEN */
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-400/20 border-2 border-stone-900 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500">
                    Source: {previewData.source}
                  </span>
                  <h4 className="font-display font-black text-base text-ink-900">
                    {previewData.count} Anime Found
                  </h4>
                </div>
                <Sparkles className="w-6 h-6 text-amber-500" />
              </div>

              {/* Breakdown Pills */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
                <div className="p-2 bg-emerald-500/15 border border-emerald-500/40 rounded-lg">
                  <span className="block text-[10px] uppercase font-mono text-emerald-700 dark:text-emerald-300">Completed</span>
                  <span className="font-mono text-sm font-black text-ink-900">{previewData.stats.completed}</span>
                </div>
                <div className="p-2 bg-amber-500/15 border border-amber-500/40 rounded-lg">
                  <span className="block text-[10px] uppercase font-mono text-amber-700 dark:text-amber-300">Watching</span>
                  <span className="font-mono text-sm font-black text-ink-900">{previewData.stats.watching}</span>
                </div>
                <div className="p-2 bg-sky-500/15 border border-sky-500/40 rounded-lg">
                  <span className="block text-[10px] uppercase font-mono text-sky-700 dark:text-sky-300">Plan to Watch</span>
                  <span className="font-mono text-sm font-black text-ink-900">{previewData.stats.plan_to_watch}</span>
                </div>
              </div>

              <div className="p-3 bg-sand-100 dark:bg-stone-800 rounded-lg border border-stone-900/20 text-[11px] text-stone-600 dark:text-stone-300">
                💡 <strong>Notice:</strong> Existing items with matching IDs will be safely updated with your scores, rewatches, and episode progress without data duplication.
              </div>
            </div>
          ) : (
            /* TAB 1: MAL FILE UPLOAD */
            activeTab === 'mal' ? (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-stone-900/40 dark:border-stone-600 rounded-xl p-6 text-center space-y-2.5 hover:border-amber-500 transition-colors bg-sand-100/50 dark:bg-stone-800/50">
                  <FileCode2 className="w-10 h-10 text-blue-500 mx-auto" />
                  <div>
                    <p className="font-display font-bold text-sm text-ink-900">
                      Upload your MyAnimeList XML file
                    </p>
                    <p className="text-xs text-stone-500 font-sans mt-0.5">
                      Exported from: <em>myanimelist.net/panel.php?go=export</em>
                    </p>
                  </div>

                  <label className="btn-manga bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs px-4 py-2 font-black inline-flex items-center gap-1.5 cursor-pointer shadow-sm active:translate-y-0.5">
                    <UploadCloud className="w-4 h-4" />
                    <span>Select animelist.xml</span>
                    <input 
                      type="file" 
                      accept=".xml,text/xml" 
                      onChange={handleMalFileUpload} 
                      className="hidden" 
                    />
                  </label>
                </div>

                <div className="text-[11px] text-stone-500 space-y-1">
                  <p className="font-bold">How to export from MyAnimeList:</p>
                  <ol className="list-decimal list-inside space-y-0.5 text-stone-600 dark:text-stone-400">
                    <li>Go to MyAnimeList → Settings → <strong>Export</strong></li>
                    <li>Click <strong>Export My Anime List</strong> to download the gzip/xml</li>
                    <li>Upload the unzipped <code>animelist.xml</code> file above</li>
                  </ol>
                </div>
              </div>
            ) : (
              /* TAB 2: ANILIST USERNAME FETCH */
              <form onSubmit={handleFetchAniList} className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase font-mono text-ink-900">
                    AniList Username
                  </label>
                  <div className="relative">
                    <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                    <input
                      type="text"
                      value={anilistUsername}
                      onChange={(e) => setAnilistUsername(e.target.value)}
                      placeholder="e.g. your_anilist_name"
                      className="w-full pl-9 pr-3 py-2 bg-sand-100 dark:bg-stone-800 border-2 border-stone-900 rounded-lg text-xs font-sans text-ink-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <p className="text-[10px] text-stone-500 font-sans">
                    Public libraries are fetched instantly via AniList GraphQL with zero login credentials required.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || !anilistUsername.trim()}
                  className="btn-manga bg-sky-400 hover:bg-sky-300 text-stone-950 w-full py-2.5 text-xs font-black flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-manga"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Fetching from AniList...</span>
                    </>
                  ) : (
                    <>
                      <span>Fetch Library</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )
          )}

        </div>

        {/* Footer Actions */}
        {previewData && !importing && !completedSuccess && (
          <div className="p-3.5 border-t-2 border-stone-900 bg-sand-100 dark:bg-stone-800 flex items-center justify-between gap-2">
            <button
              onClick={resetState}
              className="py-2 px-3 rounded-lg border-2 border-stone-900 bg-sand-200 dark:bg-stone-700 text-xs font-bold text-ink-900 hover:bg-sand-300"
            >
              Back
            </button>
            <button
              onClick={handleConfirmImport}
              className="btn-manga bg-amber-400 hover:bg-amber-300 text-stone-950 py-2 px-4 text-xs font-black flex items-center gap-1.5 shadow-manga"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Import {previewData.count} Titles</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
