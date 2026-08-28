import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Download, 
  Sparkles, 
  Grid3X3, 
  Layers, 
  Search, 
  Plus, 
  Trash2, 
  Palette, 
  Check, 
  Share2, 
  Star,
  RefreshCw,
  Eye
} from 'lucide-react';
import { sound } from '../../services/soundEffects';
import { burstConfetti } from '../../utils/confetti';
import { anilistQuery, SEARCH_ANIME_QUERY } from '../../services/anilist';

const THEMES = [
  { id: 'classic', label: 'Classic Manga', bg: '#F4EFE6', border: '#18130D', text: '#18130D', accent: '#F59E0B' },
  { id: 'dark', label: 'Dark Obsidian', bg: '#18130D', border: '#D4974A', text: '#FDFAF5', accent: '#D4974A' },
  { id: 'sakura', label: 'Sakura Petal', bg: '#FFF1F2', border: '#881337', text: '#881337', accent: '#FB7185' },
  { id: 'cyberpunk', label: 'Cyberpunk Neon', bg: '#0A0E17', border: '#06B6D4', text: '#F0FDF4', accent: '#A855F7' }
];

export default function Grid3x3Modal({
  isOpen,
  onClose,
  watchlist = [],
  username = 'Anime Fan',
  titleLanguage = 'english'
}) {
  const [activeMode, setActiveMode] = useState('grid3x3'); // 'grid3x3' | 'tierlist'
  const [gridTitle, setGridTitle] = useState('My Top 9 Favorite Anime');
  const [selectedTheme, setSelectedTheme] = useState('classic');
  const [gridSlots, setGridSlots] = useState(Array(9).fill(null));
  
  // Tier list state
  const [tiers, setTiers] = useState({
    S: [],
    A: [],
    B: [],
    C: [],
    D: []
  });

  // Slot selector picker state
  const [activeSlotIndex, setActiveSlotIndex] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const canvasRef = useRef(null);

  // Initialize 3x3 grid with user's top scored anime if empty
  useEffect(() => {
    if (isOpen && gridSlots.every(s => s === null) && watchlist.length > 0) {
      const topAnime = [...watchlist]
        .sort((a, b) => (b.score || 0) - (a.score || 0) || (b.episodes_watched || 0) - (a.episodes_watched || 0))
        .slice(0, 9);
      
      const newSlots = Array(9).fill(null);
      topAnime.forEach((item, idx) => {
        newSlots[idx] = {
          id: item.anime_id || item.id,
          title: item.anime_title || item.title?.english || 'Anime',
          cover: item.anime_cover || item.coverImage?.large || '',
          score: item.score || 0
        };
      });
      setGridSlots(newSlots);

      // Initialize Tier List buckets
      setTiers({
        S: topAnime.slice(0, 2).map(mapTierItem),
        A: topAnime.slice(2, 5).map(mapTierItem),
        B: topAnime.slice(5, 8).map(mapTierItem),
        C: [],
        D: []
      });
    }
  }, [isOpen, watchlist]);

  function mapTierItem(item) {
    return {
      id: item.anime_id || item.id,
      title: item.anime_title || item.title?.english || 'Anime',
      cover: item.anime_cover || item.coverImage?.large || '',
      score: item.score || 0
    };
  }

  // Live search for slot picker
  useEffect(() => {
    if (activeSlotIndex === null) return;
    const timer = setTimeout(async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      try {
        const res = await anilistQuery(SEARCH_ANIME_QUERY, { search: searchQuery.trim(), page: 1 });
        const media = res?.Page?.media || [];
        setSearchResults(media.map(m => ({
          id: m.id,
          title: m.title?.english || m.title?.romaji || 'Anime',
          cover: m.coverImage?.large || m.coverImage?.medium || '',
          score: m.averageScore ? Math.round(m.averageScore / 10) : 0
        })));
      } catch (err) {
        console.error("Search slot anime error:", err);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, activeSlotIndex]);

  if (!isOpen) return null;

  const currentTheme = THEMES.find(t => t.id === selectedTheme) || THEMES[0];

  const handleSelectAnimeForSlot = (anime) => {
    if (activeSlotIndex === null) return;
    const updated = [...gridSlots];
    updated[activeSlotIndex] = {
      id: anime.id || anime.anime_id,
      title: anime.title || anime.anime_title || 'Anime',
      cover: anime.cover || anime.anime_cover || anime.coverImage?.large || '',
      score: anime.score || 0
    };
    setGridSlots(updated);
    setActiveSlotIndex(null);
    setSearchQuery('');
    sound.playSaveSuccess();
  };

  const handleRemoveSlot = (e, index) => {
    e.stopPropagation();
    const updated = [...gridSlots];
    updated[index] = null;
    setGridSlots(updated);
    sound.playTap();
  };

  // Add item to a Tier
  const handleAddToTier = (tierKey, anime) => {
    const item = mapTierItem(anime);
    setTiers(prev => {
      // Remove from other tiers first
      const cleaned = {};
      Object.keys(prev).forEach(k => {
        cleaned[k] = prev[k].filter(i => i.id !== item.id);
      });
      cleaned[tierKey] = [...cleaned[tierKey], item];
      return cleaned;
    });
    sound.playSaveSuccess();
  };

  const handleRemoveFromTier = (tierKey, animeId) => {
    setTiers(prev => ({
      ...prev,
      [tierKey]: prev[tierKey].filter(i => i.id !== animeId)
    }));
    sound.playTap();
  };

  // ══════════════════════════════════════════════════════════════════
  // HIGH-DPI CANVAS EXPORT ENGINE (1200x1200px High-Res PNG)
  // ══════════════════════════════════════════════════════════════════
  const handleExportPNG = async () => {
    setIsExporting(true);
    sound.playTap();

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const size = 1200;
      canvas.width = size;
      canvas.height = size;

      // 1. Draw Background
      ctx.fillStyle = currentTheme.bg;
      ctx.fillRect(0, 0, size, size);

      // 2. Outer Border & Framing
      ctx.lineWidth = 12;
      ctx.strokeStyle = currentTheme.border;
      ctx.strokeRect(16, 16, size - 32, size - 32);

      // 3. Header Title Banner
      ctx.fillStyle = currentTheme.text;
      ctx.font = '900 44px "DM Sans", "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(gridTitle.toUpperCase(), size / 2, 85);

      // Subtitle with username & AniTrack watermark
      ctx.font = '700 20px "JetBrains Mono", monospace';
      ctx.fillStyle = currentTheme.accent;
      ctx.fillText(`CURATED BY @${username.toUpperCase()} • ANITRACK APP`, size / 2, 120);

      // 4. Draw 3x3 Poster Grid
      const gridStartY = 150;
      const gridSize = 980;
      const gap = 16;
      const cellSize = (gridSize - gap * 2) / 3;

      const loadImage = (url) => {
        return new Promise((resolve) => {
          if (!url) {
            resolve(null);
            return;
          }
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = url;
        });
      };

      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const index = row * 3 + col;
          const slotItem = gridSlots[index];
          const x = 110 + col * (cellSize + gap);
          const y = gridStartY + row * (cellSize + gap);

          // Card Background
          ctx.fillStyle = currentTheme.id === 'classic' ? '#E5DFD5' : '#26201A';
          ctx.fillRect(x, y, cellSize, cellSize);

          if (slotItem?.cover) {
            const img = await loadImage(slotItem.cover);
            if (img) {
              ctx.drawImage(img, x, y, cellSize, cellSize);
            }
          }

          // Card Border
          ctx.lineWidth = 6;
          ctx.strokeStyle = currentTheme.border;
          ctx.strokeRect(x, y, cellSize, cellSize);

          // Title Overlay bar at bottom of cell
          if (slotItem?.title) {
            ctx.fillStyle = 'rgba(24, 19, 13, 0.85)';
            ctx.fillRect(x, y + cellSize - 46, cellSize, 46);

            ctx.fillStyle = '#FDFAF5';
            ctx.font = '900 16px "DM Sans", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(slotItem.title.slice(0, 24), x + cellSize / 2, y + cellSize - 18);
          }

          // Number Badge at top-left
          ctx.fillStyle = currentTheme.accent;
          ctx.fillRect(x, y, 36, 36);
          ctx.lineWidth = 3;
          ctx.strokeStyle = currentTheme.border;
          ctx.strokeRect(x, y, 36, 36);
          ctx.fillStyle = '#18130D';
          ctx.font = '900 18px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(String(index + 1), x + 18, y + 25);
        }
      }

      // 5. Trigger Instant Browser Download
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `anitrack-3x3-${username.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`;
      a.click();

      sound.playCelebration();
      burstConfetti();
    } catch (err) {
      console.error("Failed to generate PNG:", err);
      sound.playError();
    } finally {
      setIsExporting(false);
    }
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="card-manga-panel w-full max-w-2xl bg-sand-50 dark:bg-stone-900 border-2 border-stone-900 rounded-xl shadow-[6px_6px_0px_0px_rgba(24,19,13,1)] overflow-hidden flex flex-col max-h-[94vh] animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="p-3.5 sm:p-4 border-b-2 border-stone-900 bg-sand-100 dark:bg-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="font-display font-black text-base text-ink-900">
                Anime Collage & Tier List Studio
              </h3>
              <p className="text-[11px] text-stone-500 font-sans">
                Create & export high-res shareable 3x3 grids for Twitter, Instagram & Reddit
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

        {/* View Mode Switcher */}
        <div className="flex border-b-2 border-stone-900 bg-sand-200/60 dark:bg-stone-800/60">
          <button
            onClick={() => { setActiveMode('grid3x3'); sound.playTab(); }}
            className={`flex-1 py-2 px-3 text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
              activeMode === 'grid3x3'
                ? 'bg-sand-50 dark:bg-stone-900 text-ink-900 border-b-2 border-amber-500'
                : 'text-stone-600 dark:text-stone-400 hover:bg-sand-100 dark:hover:bg-stone-700'
            }`}
          >
            <Grid3X3 className="w-4 h-4 text-amber-500" />
            <span>3x3 Favorite Grid</span>
          </button>
          <button
            onClick={() => { setActiveMode('tierlist'); sound.playTab(); }}
            className={`flex-1 py-2 px-3 text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
              activeMode === 'tierlist'
                ? 'bg-sand-50 dark:bg-stone-900 text-ink-900 border-b-2 border-amber-500'
                : 'text-stone-600 dark:text-stone-400 hover:bg-sand-100 dark:hover:bg-stone-700'
            }`}
          >
            <Layers className="w-4 h-4 text-purple-500" />
            <span>S-Tier Seasonal Tier Maker</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto hide-scrollbar">

          {/* Controls Bar: Title & Theme Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-sand-100 dark:bg-stone-800 rounded-lg border-2 border-stone-900">
            <div>
              <label className="block text-[10px] font-mono font-black uppercase text-stone-500 mb-1">
                Grid Headline
              </label>
              <input
                type="text"
                value={gridTitle}
                onChange={(e) => setGridTitle(e.target.value)}
                placeholder="e.g. My Top 9 Anime of All Time"
                className="w-full px-2.5 py-1.5 text-xs bg-sand-50 dark:bg-stone-900 border-2 border-stone-900 rounded font-sans font-bold text-ink-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono font-black uppercase text-stone-500 mb-1">
                Visual Frame Theme
              </label>
              <div className="flex gap-1.5 overflow-x-auto hide-scrollbar py-0.5">
                {THEMES.map(theme => (
                  <button
                    key={theme.id}
                    onClick={() => { setSelectedTheme(theme.id); sound.playTap(); }}
                    className={`px-2 py-1 rounded text-[10px] font-bold border-2 border-stone-900 flex items-center gap-1 transition-all ${
                      selectedTheme === theme.id 
                        ? 'bg-amber-400 text-stone-950 font-black shadow-xs' 
                        : 'bg-sand-50 dark:bg-stone-900 text-stone-600 dark:text-stone-300'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full border border-stone-900" style={{ backgroundColor: theme.accent }} />
                    <span>{theme.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ═══ MODE 1: 3x3 GRID GENERATOR ═══ */}
          {activeMode === 'grid3x3' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-500">
                  Tap any slot to pick or replace with an anime:
                </span>
                <span className="text-[10px] font-mono font-black uppercase text-amber-600 dark:text-amber-400">
                  {gridSlots.filter(Boolean).length}/9 Filled
                </span>
              </div>

              {/* Interactive 3x3 Grid Canvas Preview */}
              <div 
                className="grid grid-cols-3 gap-2 sm:gap-2.5 p-3 rounded-xl border-2 border-stone-900 shadow-manga"
                style={{ backgroundColor: currentTheme.bg, borderColor: currentTheme.border }}
              >
                {gridSlots.map((slot, index) => (
                  <div
                    key={index}
                    onClick={() => { setActiveSlotIndex(index); sound.playTap(); }}
                    className="aspect-[3/4] relative rounded-lg border-2 border-stone-900 overflow-hidden cursor-pointer group bg-sand-200 dark:bg-stone-800 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{ borderColor: currentTheme.border }}
                  >
                    {slot ? (
                      <>
                        <img 
                          src={slot.cover} 
                          alt={slot.title} 
                          className="w-full h-full object-cover"
                        />
                        {/* Bottom Title Bar */}
                        <div className="absolute bottom-0 inset-x-0 bg-stone-950/85 p-1 border-t border-stone-900">
                          <p className="text-[9px] sm:text-[10px] font-bold text-sand-50 font-sans line-clamp-1 text-center">
                            {slot.title}
                          </p>
                        </div>
                        {/* Remove Action Button */}
                        <button
                          onClick={(e) => handleRemoveSlot(e, index)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-stone-900/90 text-rose-400 border border-stone-900 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove from slot"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 hover:text-amber-500 transition-colors p-2 text-center">
                        <Plus className="w-6 h-6 stroke-[2.5]" />
                        <span className="text-[9px] font-mono font-bold mt-1 uppercase">
                          Slot #{index + 1}
                        </span>
                      </div>
                    )}

                    {/* Corner Number Badge */}
                    <span 
                      className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-black border border-stone-900 text-stone-950 shadow-2xs"
                      style={{ backgroundColor: currentTheme.accent }}
                    >
                      {index + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* ═══ MODE 2: SEASONAL TIER LIST MAKER ═══ */
            <div className="space-y-3">
              <div className="space-y-2">
                {[
                  { key: 'S', label: 'S-TIER • MASTERPIECE', color: 'bg-rose-500 text-white' },
                  { key: 'A', label: 'A-TIER • MUST WATCH', color: 'bg-amber-500 text-stone-950' },
                  { key: 'B', label: 'B-TIER • SOLID ENJOYMENT', color: 'bg-emerald-500 text-white' },
                  { key: 'C', label: 'C-TIER • AVERAGE / OK', color: 'bg-sky-500 text-white' },
                  { key: 'D', label: 'D-TIER • DISAPPOINTING', color: 'bg-stone-500 text-white' }
                ].map(tier => (
                  <div key={tier.key} className="flex border-2 border-stone-900 rounded-lg overflow-hidden bg-sand-100 dark:bg-stone-800">
                    <div className={`w-24 sm:w-28 ${tier.color} p-2 border-r-2 border-stone-900 flex items-center justify-center font-display font-black text-center text-xs uppercase leading-tight shrink-0`}>
                      {tier.label}
                    </div>
                    <div className="flex-1 p-2 flex flex-wrap gap-1.5 items-center min-h-[55px]">
                      {tiers[tier.key].map(anime => (
                        <div 
                          key={anime.id} 
                          className="w-10 h-14 relative rounded border border-stone-900 overflow-hidden group shrink-0"
                          title={anime.title}
                        >
                          <img src={anime.cover} alt={anime.title} className="w-full h-full object-cover" />
                          <button
                            onClick={() => handleRemoveFromTier(tier.key, anime.id)}
                            className="absolute top-0.5 right-0.5 p-0.5 bg-rose-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Watchlist Quick-Assign Pool */}
              <div className="p-3 bg-sand-100 dark:bg-stone-800 rounded-lg border-2 border-stone-900 space-y-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500 block">
                  Assign from Watchlist:
                </span>
                <div className="flex gap-2 overflow-x-auto hide-scrollbar py-1">
                  {watchlist.slice(0, 15).map(item => (
                    <div key={item.anime_id || item.id} className="w-14 shrink-0 space-y-1 text-center">
                      <img 
                        src={item.anime_cover || item.coverImage?.large} 
                        alt={item.anime_title} 
                        className="w-14 h-18 object-cover rounded border border-stone-900"
                      />
                      <div className="flex justify-center gap-0.5">
                        {['S', 'A', 'B', 'C'].map(k => (
                          <button
                            key={k}
                            onClick={() => handleAddToTier(k, item)}
                            className="w-3.5 h-3.5 bg-sand-200 dark:bg-stone-700 hover:bg-amber-400 hover:text-stone-950 rounded text-[8px] font-black border border-stone-900 flex items-center justify-center"
                          >
                            {k}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Bottom Actions */}
        <div className="p-3.5 sm:p-4 border-t-2 border-stone-900 bg-sand-100 dark:bg-stone-800 flex items-center justify-between gap-2">
          <button
            onClick={onClose}
            className="py-2 px-3 rounded-lg border-2 border-stone-900 bg-sand-200 dark:bg-stone-700 text-xs font-bold text-ink-900 hover:bg-sand-300"
          >
            Close
          </button>

          <button
            onClick={handleExportPNG}
            disabled={isExporting}
            className="btn-manga bg-amber-400 hover:bg-amber-300 text-stone-950 py-2.5 px-5 text-xs font-black flex items-center gap-2 shadow-manga disabled:opacity-50"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>{isExporting ? 'Generating High-Res PNG...' : 'Export High-Res PNG'}</span>
          </button>
        </div>

        {/* ═══ SLOT PICKER POPUP MODAL ═══ */}
        {activeSlotIndex !== null && (
          <div className="absolute inset-0 z-50 bg-black/75 p-4 flex items-center justify-center">
            <div className="w-full max-w-md bg-sand-50 dark:bg-stone-900 border-2 border-stone-900 rounded-xl p-4 space-y-3 max-h-[85%] flex flex-col shadow-manga animate-scale-up">
              <div className="flex items-center justify-between border-b border-stone-900/20 pb-2">
                <h4 className="font-display font-black text-sm text-ink-900">
                  Select Anime for Slot #{activeSlotIndex + 1}
                </h4>
                <button 
                  onClick={() => setActiveSlotIndex(null)}
                  className="p-1 text-stone-500 hover:text-ink-900"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search any anime title..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-sand-100 dark:bg-stone-800 border-2 border-stone-900 rounded-lg text-ink-900 font-sans focus:outline-none focus:ring-2 focus:ring-amber-400"
                  autoFocus
                />
              </div>

              {/* Options Grid (Watchlist + Search results) */}
              <div className="grid grid-cols-3 gap-2 overflow-y-auto hide-scrollbar flex-1 p-1">
                {(searchQuery ? searchResults : watchlist).map(anime => (
                  <div
                    key={anime.id || anime.anime_id}
                    onClick={() => handleSelectAnimeForSlot(anime)}
                    className="p-1 rounded-lg border-2 border-stone-900 bg-sand-100 dark:bg-stone-800 hover:bg-amber-400/20 cursor-pointer space-y-1 transition-all active:scale-95"
                  >
                    <img 
                      src={anime.cover || anime.anime_cover || anime.coverImage?.large} 
                      alt={anime.title || anime.anime_title} 
                      className="w-full aspect-[3/4] object-cover rounded border border-stone-900"
                    />
                    <p className="text-[9px] font-bold text-ink-900 truncate line-clamp-1">
                      {anime.title || anime.anime_title}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
