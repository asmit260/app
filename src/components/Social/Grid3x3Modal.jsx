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
  Eye,
  Bookmark,
  Globe,
  Loader2
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

const TIER_CONFIG = [
  { key: 'S', label: 'S-TIER', subLabel: 'MASTERPIECE', color: '#EF4444', textColor: '#FFFFFF', bgClass: 'bg-rose-500 text-white' },
  { key: 'A', label: 'A-TIER', subLabel: 'MUST WATCH', color: '#F59E0B', textColor: '#18130D', bgClass: 'bg-amber-500 text-stone-950' },
  { key: 'B', label: 'B-TIER', subLabel: 'GREAT', color: '#10B981', textColor: '#FFFFFF', bgClass: 'bg-emerald-500 text-white' },
  { key: 'C', label: 'C-TIER', subLabel: 'AVERAGE', color: '#0EA5E9', textColor: '#FFFFFF', bgClass: 'bg-sky-500 text-white' },
  { key: 'D', label: 'D-TIER', subLabel: 'DISAPPOINTING', color: '#6B7280', textColor: '#FFFFFF', bgClass: 'bg-stone-500 text-white' }
];

/**
 * Robust CORS-Safe Canvas Image Loader
 * Fetches images as blob/objectURL or proxies via wsrv.nl to prevent canvas tainting.
 */
async function loadCanvasImage(url) {
  if (!url) return null;

  // Try 1: Fetch as blob with CORS & convert to Object URL
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (res.ok) {
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = objectUrl;
      });
      return img;
    }
  } catch (_) {}

  // Try 2: Safe public image proxy (wsrv.nl) with automatic CORS headers
  try {
    const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=600&fit=cover&output=jpg`;
    const res = await fetch(proxyUrl, { mode: 'cors' });
    if (res.ok) {
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = objectUrl;
      });
      return img;
    }
  } catch (_) {}

  // Try 3: Direct anonymous image load
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
    return img;
  } catch (_) {}

  return null;
}

export default function Grid3x3Modal({
  isOpen,
  onClose,
  watchlist = [],
  username = 'Anime Fan',
  titleLanguage = 'english'
}) {
  const [activeMode, setActiveMode] = useState('grid3x3'); // 'grid3x3' | 'tierlist'
  const [gridTitle, setGridTitle] = useState('My Top 9 Favorite Anime');
  const [tierTitle, setTierTitle] = useState('Seasonal Anime Tier List');
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

  // Global search for tier list
  const [tierSearchQuery, setTierSearchQuery] = useState('');
  const [tierSearchResults, setTierSearchResults] = useState([]);
  const [tierSearching, setTierSearching] = useState(false);

  // Slot selector picker state (for 3x3)
  const [activeSlotIndex, setActiveSlotIndex] = useState(null);
  const [pickerTab, setPickerTab] = useState('database'); // 'database' | 'watchlist'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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
        C: topAnime.slice(8, 9).map(mapTierItem),
        D: []
      });
    }
  }, [isOpen, watchlist]);

  function mapTierItem(item) {
    return {
      id: item.anime_id || item.id,
      title: item.anime_title || item.title?.english || item.title?.romaji || 'Anime',
      cover: item.anime_cover || item.coverImage?.large || item.coverImage?.medium || '',
      score: item.score || (item.averageScore ? Math.round(item.averageScore / 10) : 0)
    };
  }

  // Live search for 3x3 slot picker
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

  // Live search for Tier List additions
  useEffect(() => {
    if (activeMode !== 'tierlist') return;
    const timer = setTimeout(async () => {
      if (!tierSearchQuery.trim()) {
        setTierSearchResults([]);
        return;
      }
      setTierSearching(true);
      try {
        const res = await anilistQuery(SEARCH_ANIME_QUERY, { search: tierSearchQuery.trim(), page: 1 });
        const media = res?.Page?.media || [];
        setTierSearchResults(media.map(m => ({
          id: m.id,
          title: m.title?.english || m.title?.romaji || 'Anime',
          cover: m.coverImage?.large || m.coverImage?.medium || '',
          score: m.averageScore ? Math.round(m.averageScore / 10) : 0
        })));
      } catch (err) {
        console.error("Tier list search error:", err);
      } finally {
        setTierSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [tierSearchQuery, activeMode]);

  if (!isOpen) return null;

  const currentTheme = THEMES.find(t => t.id === selectedTheme) || THEMES[0];

  const handleSelectAnimeForSlot = (anime) => {
    if (activeSlotIndex === null) return;
    const updated = [...gridSlots];
    updated[activeSlotIndex] = {
      id: anime.id || anime.anime_id,
      title: anime.title || anime.anime_title || 'Anime',
      cover: anime.cover || anime.anime_cover || anime.coverImage?.large || anime.coverImage?.medium || '',
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
      // Remove from any existing tier first
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
  // HIGH-DPI CANVAS EXPORT ENGINES (3x3 Grid & S/A/B/C/D Tier List)
  // ══════════════════════════════════════════════════════════════════
  const handleExportPNG = async () => {
    setIsExporting(true);
    sound.playTap();

    try {
      if (activeMode === 'grid3x3') {
        await exportGrid3x3Canvas();
      } else {
        await exportTierListCanvas();
      }
      sound.playCelebration();
      burstConfetti();
    } catch (err) {
      console.error("Failed to generate PNG:", err);
      sound.playError();
    } finally {
      setIsExporting(false);
    }
  };

  // 1. Export 3x3 Anime Grid Canvas
  const exportGrid3x3Canvas = async () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const size = 1200;
    canvas.width = size;
    canvas.height = size;

    // Background & Outer Border
    ctx.fillStyle = currentTheme.bg;
    ctx.fillRect(0, 0, size, size);

    ctx.lineWidth = 14;
    ctx.strokeStyle = currentTheme.border;
    ctx.strokeRect(16, 16, size - 32, size - 32);

    // Header Title Banner
    ctx.fillStyle = currentTheme.text;
    ctx.font = '900 44px "DM Sans", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(gridTitle.toUpperCase(), size / 2, 85);

    // Subtitle & Watermark
    ctx.font = '700 20px "JetBrains Mono", monospace';
    ctx.fillStyle = currentTheme.accent;
    ctx.fillText(`CURATED BY @${username.toUpperCase()} • ANITRACK APP`, size / 2, 120);

    // 3x3 Poster Grid Cells
    const gridStartY = 150;
    const gridSize = 980;
    const gap = 16;
    const cellSize = (gridSize - gap * 2) / 3;

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const index = row * 3 + col;
        const slotItem = gridSlots[index];
        const x = 110 + col * (cellSize + gap);
        const y = gridStartY + row * (cellSize + gap);

        // Cell Background
        ctx.fillStyle = currentTheme.id === 'classic' ? '#E5DFD5' : '#26201A';
        ctx.fillRect(x, y, cellSize, cellSize);

        // Load & Draw Image with full CORS safety
        if (slotItem?.cover) {
          const img = await loadCanvasImage(slotItem.cover);
          if (img) {
            ctx.drawImage(img, x, y, cellSize, cellSize);
          }
        }

        // Cell Border
        ctx.lineWidth = 6;
        ctx.strokeStyle = currentTheme.border;
        ctx.strokeRect(x, y, cellSize, cellSize);

        // Title Overlay
        if (slotItem?.title) {
          ctx.fillStyle = 'rgba(24, 19, 13, 0.88)';
          ctx.fillRect(x, y + cellSize - 46, cellSize, 46);

          ctx.fillStyle = '#FDFAF5';
          ctx.font = '900 16px "DM Sans", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(slotItem.title.slice(0, 24), x + cellSize / 2, y + cellSize - 18);
        }

        // Number Badge
        ctx.fillStyle = currentTheme.accent;
        ctx.fillRect(x, y, 38, 38);
        ctx.lineWidth = 3;
        ctx.strokeStyle = currentTheme.border;
        ctx.strokeRect(x, y, 38, 38);
        ctx.fillStyle = '#18130D';
        ctx.font = '900 18px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(String(index + 1), x + 19, y + 26);
      }
    }

    // Trigger Browser Download
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `anitrack-3x3-${username.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`;
    a.click();
  };

  // 2. Export Seasonal Tier List Canvas (S/A/B/C/D)
  const exportTierListCanvas = async () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const width = 1200;
    const rowHeight = 150;
    const gap = 12;
    const headerHeight = 140;
    const footerHeight = 60;
    const totalHeight = headerHeight + 5 * (rowHeight + gap) + footerHeight;

    canvas.width = width;
    canvas.height = totalHeight;

    // Background
    ctx.fillStyle = currentTheme.bg;
    ctx.fillRect(0, 0, width, totalHeight);

    ctx.lineWidth = 12;
    ctx.strokeStyle = currentTheme.border;
    ctx.strokeRect(14, 14, width - 28, totalHeight - 28);

    // Header Title
    ctx.fillStyle = currentTheme.text;
    ctx.font = '900 42px "DM Sans", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(tierTitle.toUpperCase(), width / 2, 75);

    ctx.font = '700 18px "JetBrains Mono", monospace';
    ctx.fillStyle = currentTheme.accent;
    ctx.fillText(`CURATED BY @${username.toUpperCase()} • ANITRACK APP`, width / 2, 110);

    // Draw 5 Tier Rows
    const startY = headerHeight;
    const badgeWidth = 150;
    const posterWidth = 85;
    const posterHeight = 125;

    for (let i = 0; i < TIER_CONFIG.length; i++) {
      const tierDef = TIER_CONFIG[i];
      const tierItems = tiers[tierDef.key] || [];
      const y = startY + i * (rowHeight + gap);

      // Row Background
      ctx.fillStyle = currentTheme.id === 'classic' ? '#EAE5DB' : '#221D18';
      ctx.fillRect(40, y, width - 80, rowHeight);

      // Tier Badge Box on Left
      ctx.fillStyle = tierDef.color;
      ctx.fillRect(40, y, badgeWidth, rowHeight);

      ctx.lineWidth = 4;
      ctx.strokeStyle = currentTheme.border;
      ctx.strokeRect(40, y, badgeWidth, rowHeight);

      // Tier Text
      ctx.fillStyle = tierDef.textColor;
      ctx.font = '900 32px "DM Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(tierDef.key, 40 + badgeWidth / 2, y + rowHeight / 2 + 10);

      // Row Border
      ctx.lineWidth = 4;
      ctx.strokeStyle = currentTheme.border;
      ctx.strokeRect(40, y, width - 80, rowHeight);

      // Draw Posters in this Tier
      const posterStartY = y + (rowHeight - posterHeight) / 2;
      const posterStartX = 40 + badgeWidth + 16;

      for (let j = 0; j < Math.min(tierItems.length, 9); j++) {
        const item = tierItems[j];
        const px = posterStartX + j * (posterWidth + 12);

        // Card placeholder
        ctx.fillStyle = '#2D2620';
        ctx.fillRect(px, posterStartY, posterWidth, posterHeight);

        if (item.cover) {
          const img = await loadCanvasImage(item.cover);
          if (img) {
            ctx.drawImage(img, px, posterStartY, posterWidth, posterHeight);
          }
        }

        ctx.lineWidth = 3;
        ctx.strokeStyle = currentTheme.border;
        ctx.strokeRect(px, posterStartY, posterWidth, posterHeight);
      }
    }

    // Watermark
    ctx.fillStyle = currentTheme.accent;
    ctx.font = '800 14px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ANITRACK ANIME TIER STUDIO • BUILD YOUR OWN AT ANITRACK', width / 2, totalHeight - 24);

    // Trigger Browser Download
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `anitrack-tier-list-${username.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`;
    a.click();
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
        <div className="p-3.5 sm:p-4 border-b-2 border-stone-900 bg-sand-100 dark:bg-stone-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="font-display font-black text-base text-ink-900">
                Anime Collage & Tier List Studio
              </h3>
              <p className="text-[11px] text-stone-500 font-sans">
                Search any anime across the AniList database & export high-res PNGs
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

        {/* Mode Switcher Tabs */}
        <div className="flex border-b-2 border-stone-900 bg-sand-200/60 dark:bg-stone-800/60 shrink-0">
          <button
            onClick={() => { setActiveMode('grid3x3'); sound.playTab(); }}
            className={`flex-1 py-2 px-3 text-xs font-black flex items-center justify-center gap-2 transition-all ${
              activeMode === 'grid3x3'
                ? 'bg-sand-50 dark:bg-stone-900 text-ink-900 border-b-2 border-amber-500'
                : 'text-stone-600 dark:text-stone-400 hover:bg-sand-100 dark:hover:bg-stone-700'
            }`}
          >
            <Grid3X3 className="w-3.5 h-3.5 text-amber-500" />
            <span>3x3 Favorite Anime Grid</span>
          </button>

          <button
            onClick={() => { setActiveMode('tierlist'); sound.playTab(); }}
            className={`flex-1 py-2 px-3 text-xs font-black flex items-center justify-center gap-2 transition-all ${
              activeMode === 'tierlist'
                ? 'bg-sand-50 dark:bg-stone-900 text-ink-900 border-b-2 border-amber-500'
                : 'text-stone-600 dark:text-stone-400 hover:bg-sand-100 dark:hover:bg-stone-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-purple-500" />
            <span>Seasonal Tier List (S/A/B/C/D)</span>
          </button>
        </div>

        {/* Studio Controls Header */}
        <div className="p-3 bg-sand-100 dark:bg-stone-800 border-b-2 border-stone-900 flex flex-col sm:flex-row gap-2.5 items-center justify-between shrink-0">
          {/* Custom Editable Title */}
          <div className="w-full sm:w-auto flex-1">
            <input
              type="text"
              value={activeMode === 'grid3x3' ? gridTitle : tierTitle}
              onChange={(e) => activeMode === 'grid3x3' ? setGridTitle(e.target.value) : setTierTitle(e.target.value)}
              placeholder="Enter Custom Title..."
              maxLength={40}
              className="w-full px-2.5 py-1 text-xs font-display font-black text-ink-900 bg-sand-50 dark:bg-stone-900 border-2 border-stone-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* Theme Selector */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
            <Palette className="w-3.5 h-3.5 text-stone-500 shrink-0" />
            <div className="flex gap-1">
              {THEMES.map(theme => (
                <button
                  key={theme.id}
                  onClick={() => { setSelectedTheme(theme.id); sound.playTap(); }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border border-stone-900 transition-all ${
                    selectedTheme === theme.id
                      ? 'bg-amber-400 text-stone-950 font-black shadow-2xs scale-105'
                      : 'bg-sand-50 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-sand-200'
                  }`}
                >
                  {theme.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Studio Canvas Area */}
        <div className="p-4 overflow-y-auto hide-scrollbar flex-1 space-y-4">
          
          {activeMode === 'grid3x3' ? (
            /* ═══ MODE 1: 3x3 ANIME GRID ═══ */
            <div className="space-y-3">
              <p className="text-xs text-stone-500 text-center font-sans">
                Tap any slot to search any anime from AniList or pick from your watchlist:
              </p>

              <div className="grid grid-cols-3 gap-2.5 max-w-sm mx-auto aspect-square p-2 rounded-xl border-2 border-stone-900 bg-sand-200 dark:bg-stone-800 shadow-manga">
                {gridSlots.map((item, index) => (
                  <div
                    key={index}
                    onClick={() => { setActiveSlotIndex(index); sound.playTab(); }}
                    className="relative aspect-square rounded-lg border-2 border-stone-900 overflow-hidden cursor-pointer group bg-sand-100 dark:bg-stone-900 hover:scale-[1.03] transition-all flex items-center justify-center shadow-2xs"
                  >
                    {item ? (
                      <>
                        <img 
                          src={item.cover} 
                          alt={item.title} 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90" />
                        <span className="absolute bottom-1 left-1 right-1 text-[9px] font-bold text-white truncate text-center leading-tight">
                          {item.title}
                        </span>

                        <button
                          onClick={(e) => handleRemoveSlot(e, index)}
                          className="absolute top-1 right-1 p-0.5 rounded-full bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove anime"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </>
                    ) : (
                      <div className="text-center space-y-1 text-stone-400 group-hover:text-amber-500">
                        <Plus className="w-6 h-6 mx-auto" />
                        <span className="text-[9px] font-bold uppercase font-mono block">
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
            <div className="space-y-3.5">
              
              {/* 🔍 Global AniList Database Search Bar for Tiers */}
              <div className="p-3 bg-sand-100 dark:bg-stone-800 rounded-xl border-2 border-stone-900 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-ink-900 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-blue-500" />
                    <span>Search Any Anime to Add:</span>
                  </span>
                  <span className="text-[10px] font-mono text-stone-500">AniList Database</span>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                  <input
                    type="text"
                    value={tierSearchQuery}
                    onChange={(e) => setTierSearchQuery(e.target.value)}
                    placeholder="Search any anime title (e.g. Frieren, Naruto, Bleach)..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-sand-50 dark:bg-stone-900 border-2 border-stone-900 rounded-lg text-ink-900 font-sans focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  {tierSearching && (
                    <Loader2 className="w-4 h-4 animate-spin text-amber-500 absolute right-3 top-1/2 -translate-y-1/2" />
                  )}
                </div>

                {/* Search Results Drawer */}
                {tierSearchResults.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto hide-scrollbar py-1 pt-2 border-t border-stone-900/10">
                    {tierSearchResults.slice(0, 10).map(anime => (
                      <div key={anime.id} className="w-16 shrink-0 space-y-1 text-center group">
                        <img 
                          src={anime.cover} 
                          alt={anime.title} 
                          className="w-16 h-20 object-cover rounded border-2 border-stone-900 shadow-2xs"
                        />
                        <p className="text-[9px] font-bold text-ink-900 truncate">{anime.title}</p>
                        <div className="flex justify-center gap-0.5">
                          {['S', 'A', 'B', 'C', 'D'].map(k => (
                            <button
                              key={k}
                              onClick={() => handleAddToTier(k, anime)}
                              className="w-3.5 h-3.5 bg-sand-200 dark:bg-stone-700 hover:bg-amber-400 hover:text-stone-950 rounded text-[8px] font-black border border-stone-900 flex items-center justify-center active:scale-95"
                              title={`Add to ${k}-Tier`}
                            >
                              {k}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 5 Tier Rows */}
              <div className="space-y-2">
                {TIER_CONFIG.map(tier => (
                  <div key={tier.key} className="flex border-2 border-stone-900 rounded-lg overflow-hidden bg-sand-100 dark:bg-stone-800 shadow-2xs">
                    <div 
                      className="w-24 sm:w-28 p-2 border-r-2 border-stone-900 flex flex-col items-center justify-center font-display font-black text-center text-xs uppercase leading-tight shrink-0"
                      style={{ backgroundColor: tier.color, color: tier.textColor }}
                    >
                      <span>{tier.key}-TIER</span>
                      <span className="text-[8px] font-mono opacity-80">{tier.subLabel}</span>
                    </div>

                    <div className="flex-1 p-2 flex flex-wrap gap-2 items-center min-h-[60px]">
                      {tiers[tier.key].length === 0 ? (
                        <span className="text-[10px] text-stone-400 italic">No anime in this tier yet</span>
                      ) : (
                        tiers[tier.key].map(anime => (
                          <div 
                            key={anime.id} 
                            className="w-11 h-15 relative rounded border border-stone-900 overflow-hidden group shrink-0 shadow-2xs"
                            title={anime.title}
                          >
                            <img src={anime.cover} alt={anime.title} className="w-full h-full object-cover" />
                            <button
                              onClick={() => handleRemoveFromTier(tier.key, anime.id)}
                              className="absolute top-0.5 right-0.5 p-0.5 bg-rose-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Remove from tier"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Watchlist Quick-Assign Pool */}
              {watchlist.length > 0 && (
                <div className="p-3 bg-sand-100 dark:bg-stone-800 rounded-lg border-2 border-stone-900 space-y-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
                    <Bookmark className="w-3 h-3" />
                    <span>Quick Assign from Your Watchlist:</span>
                  </span>
                  <div className="flex gap-2.5 overflow-x-auto hide-scrollbar py-1">
                    {watchlist.map(item => (
                      <div key={item.anime_id || item.id} className="w-14 shrink-0 space-y-1 text-center">
                        <img 
                          src={item.anime_cover || item.coverImage?.large} 
                          alt={item.anime_title} 
                          className="w-14 h-18 object-cover rounded border border-stone-900"
                        />
                        <div className="flex justify-center gap-0.5">
                          {['S', 'A', 'B', 'C', 'D'].map(k => (
                            <button
                              key={k}
                              onClick={() => handleAddToTier(k, item)}
                              className="w-3.5 h-3.5 bg-sand-200 dark:bg-stone-700 hover:bg-amber-400 hover:text-stone-950 rounded text-[8px] font-black border border-stone-900 flex items-center justify-center active:scale-95"
                              title={`Add to ${k}-Tier`}
                            >
                              {k}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Bottom Actions */}
        <div className="p-3.5 sm:p-4 border-t-2 border-stone-900 bg-sand-100 dark:bg-stone-800 flex items-center justify-between gap-2 shrink-0">
          <button
            onClick={onClose}
            className="py-2 px-3 rounded-lg border-2 border-stone-900 bg-sand-200 dark:bg-stone-700 text-xs font-bold text-ink-900 hover:bg-sand-300 active:translate-y-0.5"
          >
            Close
          </button>

          <button
            onClick={handleExportPNG}
            disabled={isExporting}
            className="btn-manga bg-amber-400 hover:bg-amber-300 text-stone-950 py-2.5 px-5 text-xs font-black flex items-center gap-2 shadow-manga disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Rendering High-Res PNG...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>Export {activeMode === 'grid3x3' ? '3x3 Grid' : 'Tier List'} PNG</span>
              </>
            )}
          </button>
        </div>

        {/* ═══ SLOT PICKER POPUP MODAL (FOR 3x3 GRID) ═══ */}
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

              {/* Source Tabs: Database vs Watchlist */}
              <div className="flex border-2 border-stone-900 rounded-lg overflow-hidden p-0.5 bg-sand-200 dark:bg-stone-800">
                <button
                  onClick={() => setPickerTab('database')}
                  className={`flex-1 py-1 text-xs font-black rounded flex items-center justify-center gap-1.5 transition-all ${
                    pickerTab === 'database' 
                      ? 'bg-amber-400 text-stone-950 shadow-2xs' 
                      : 'text-stone-600 dark:text-stone-400 hover:text-ink-900'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Search AniList</span>
                </button>
                <button
                  onClick={() => setPickerTab('watchlist')}
                  className={`flex-1 py-1 text-xs font-black rounded flex items-center justify-center gap-1.5 transition-all ${
                    pickerTab === 'watchlist' 
                      ? 'bg-amber-400 text-stone-950 shadow-2xs' 
                      : 'text-stone-600 dark:text-stone-400 hover:text-ink-900'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>From Watchlist ({watchlist.length})</span>
                </button>
              </div>

              {/* Search Bar */}
              {pickerTab === 'database' && (
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search any anime title across database..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-sand-100 dark:bg-stone-800 border-2 border-stone-900 rounded-lg text-ink-900 font-sans focus:outline-none focus:ring-2 focus:ring-amber-400"
                    autoFocus
                  />
                  {searching && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500 absolute right-3 top-1/2 -translate-y-1/2" />
                  )}
                </div>
              )}

              {/* Options Grid */}
              <div className="grid grid-cols-3 gap-2 overflow-y-auto hide-scrollbar flex-1 p-1">
                {(pickerTab === 'database' ? (searchQuery ? searchResults : []) : watchlist).map(anime => (
                  <div
                    key={anime.id || anime.anime_id}
                    onClick={() => handleSelectAnimeForSlot(anime)}
                    className="p-1 rounded-lg border-2 border-stone-900 bg-sand-100 dark:bg-stone-800 hover:bg-amber-400/25 cursor-pointer space-y-1 transition-all active:scale-95 group shadow-2xs"
                  >
                    <img 
                      src={anime.cover || anime.anime_cover || anime.coverImage?.large} 
                      alt={anime.title || anime.anime_title} 
                      className="w-full aspect-[3/4] object-cover rounded border border-stone-900"
                    />
                    <p className="text-[9px] font-bold text-ink-900 truncate line-clamp-1 group-hover:text-amber-600">
                      {anime.title || anime.anime_title}
                    </p>
                  </div>
                ))}
                {pickerTab === 'database' && !searchQuery && (
                  <div className="col-span-3 py-8 text-center text-xs text-stone-500">
                    Type in the search box above to find any anime from the global AniList database!
                  </div>
                )}
                {pickerTab === 'watchlist' && watchlist.length === 0 && (
                  <div className="col-span-3 py-8 text-center text-xs text-stone-500">
                    Your watchlist is empty. Switch to "Search AniList" to pick any anime!
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
