import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  X, 
  TrendingUp, 
  Clock, 
  Star, 
  Film, 
  Tv, 
  Sparkles, 
  ChevronRight, 
  Loader2,
  ArrowUpRight
} from 'lucide-react';
import { getRealtimeSearchSuggestions } from '../../services/searchAutocomplete';
import { sound } from '../../services/soundEffects';

const TRENDING_SEARCHES = [
  'One Piece',
  'Jujutsu Kaisen',
  'Frieren',
  'Solo Leveling',
  'Demon Slayer',
  'Attack on Titan',
  'Bleach',
  'Chainsaw Man',
  'Steins;Gate',
  'Death Note'
];

const RECENT_SEARCHES_KEY = 'anitrack_recent_searches_v1';

export default function InstantSearchInput({
  value = '',
  onChange,
  onSelectAnime,
  onSubmit,
  placeholder = 'Search anime (e.g. One Piece, Frieren, Naruto)...',
  className = '',
  inputClassName = '',
  autoFocus = false,
  showDropdown = true,
  titleLanguage = 'english'
}) {
  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState([]);

  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Sync internal state with external value
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored).slice(0, 6));
      }
    } catch (_) {}
  }, []);

  const saveRecentSearch = (text) => {
    if (!text || text.trim().length < 2) return;
    const clean = text.trim();
    try {
      const updated = [clean, ...recentSearches.filter(s => s.toLowerCase() !== clean.toLowerCase())].slice(0, 8);
      setRecentSearches(updated);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (_) {}
  };

  const removeRecentSearch = (e, text) => {
    e.stopPropagation();
    const updated = recentSearches.filter(s => s !== text);
    setRecentSearches(updated);
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (_) {}
    sound.playTap();
  };

  const clearAllRecentSearches = (e) => {
    e.stopPropagation();
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch (_) {}
    sound.playTap();
  };

  // Real-time predictive autocomplete fetcher (0ms for 1-2 chars, 200ms for 3+ chars)
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    let active = true;
    
    // For 1-2 characters, resolve instantly in 0ms from local memory trie
    const debounceDelay = trimmed.length <= 2 ? 0 : 200;
    if (debounceDelay > 0) setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const results = await getRealtimeSearchSuggestions(trimmed, 5);
        if (active) {
          setSuggestions(results);
          setSelectedIndex(-1);
        }
      } catch (err) {
        console.error("Autocomplete search error:", err);
      } finally {
        if (active) setLoading(false);
      }
    }, debounceDelay);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const newVal = e.target.value;
    setQuery(newVal);
    if (onChange) onChange(newVal);
    if (!isOpen) setIsOpen(true);
  };

  const handleSelectSuggestion = (anime) => {
    const title = getTitle(anime);
    saveRecentSearch(title);
    setIsOpen(false);
    sound.playTap();
    if (onSelectAnime) {
      onSelectAnime(anime.id, anime);
    } else if (onChange) {
      onChange(title);
    }
  };

  const handleSearchSubmit = (searchTerm) => {
    const term = searchTerm || query;
    if (!term.trim()) return;
    saveRecentSearch(term);
    setIsOpen(false);
    sound.playTab();
    if (onSubmit) {
      onSubmit(term);
    } else if (onChange) {
      onChange(term);
    }
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        handleSelectSuggestion(suggestions[selectedIndex]);
      } else {
        handleSearchSubmit(query);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const getTitle = (anime) => {
    if (!anime?.title) return 'Anime';
    if (typeof anime.title === 'string') return anime.title;
    if (titleLanguage === 'romaji') return anime.title.romaji || anime.title.english || anime.title.native;
    return anime.title.english || anime.title.romaji || anime.title.userPreferred || anime.title.native || 'Anime';
  };

  // Highlight matching query prefix in bold (YouTube style)
  const renderHighlightedTitle = (title, matchQuery) => {
    if (!matchQuery || !title) return title;
    const q = matchQuery.trim().toLowerCase();
    const idx = title.toLowerCase().indexOf(q);
    if (idx === -1) return title;

    const before = title.slice(0, idx);
    const match = title.slice(idx, idx + q.length);
    const after = title.slice(idx + q.length);

    return (
      <span>
        {before}
        <span className="font-black text-amber-500 underline decoration-amber-400 decoration-2 underline-offset-2">
          {match}
        </span>
        {after}
      </span>
    );
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Search Input Container */}
      <div className="relative flex items-center">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none" />

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => { setIsOpen(true); sound.playTap(); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={`w-full pl-10 pr-9 py-2 bg-sand-100 dark:bg-sand-300 border-2 border-stone-900 rounded-lg font-sans text-xs text-ink-900 focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder:text-stone-500 shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)] transition-all ${inputClassName}`}
        />

        {/* Loading Spinner or Clear Button */}
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500 absolute right-3 top-1/2 -translate-y-1/2" />
        ) : query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              if (onChange) onChange('');
              setSuggestions([]);
              inputRef.current?.focus();
              sound.playTap();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-stone-500 hover:text-ink-900 rounded"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      {/* ═══ REAL-TIME PREDICTIVE AUTO-SUGGEST TRAY ═══ */}
      {showDropdown && isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-sand-50 dark:bg-stone-900 border-2 border-stone-900 rounded-xl shadow-[5px_5px_0px_0px_rgba(24,19,13,1)] overflow-hidden animate-slide-up max-h-[75vh] flex flex-col">
          
          {query.trim().length > 0 ? (
            /* ═══ 1. LIVE PREDICTIONS LIST ═══ */
            <div className="overflow-y-auto hide-scrollbar p-1.5 space-y-1 divide-y divide-stone-900/10 dark:divide-stone-100/10">
              {suggestions.length > 0 ? (
                <>
                  <div className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>Instant Suggestions</span>
                    </span>
                    <span className="text-[9px] lowercase opacity-75">arrow keys to navigate</span>
                  </div>

                  {suggestions.map((anime, idx) => {
                    const isSelected = idx === selectedIndex;
                    const title = getTitle(anime);
                    const cover = anime.coverImage?.medium || anime.coverImage?.large || anime.cover || '';
                    const year = anime.startDate?.year || anime.seasonYear;

                    return (
                      <div
                        key={anime.id || idx}
                        onClick={() => handleSelectSuggestion(anime)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-amber-400 text-stone-950 shadow-2xs font-bold' 
                            : 'hover:bg-sand-200 dark:hover:bg-stone-800 text-ink-900'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {/* Anime Poster Thumbnail */}
                          {cover ? (
                            <img 
                              src={cover} 
                              alt={title} 
                              className="w-8 h-11 object-cover rounded border border-stone-900 shrink-0 bg-sand-200 shadow-2xs"
                            />
                          ) : (
                            <div className="w-8 h-11 rounded border border-stone-900 bg-sand-200 flex items-center justify-center shrink-0">
                              <Film className="w-3.5 h-3.5 text-stone-500" />
                            </div>
                          )}

                          {/* Title & Metadata */}
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <p className="text-xs truncate font-display font-black leading-tight">
                              {renderHighlightedTitle(title, query)}
                            </p>

                            <div className="flex items-center gap-1.5 text-[10px] opacity-80 font-mono flex-wrap">
                              <span className="px-1 py-0.2 rounded bg-stone-900 text-amber-400 text-[8px] font-black uppercase">
                                {anime.format || 'TV'}
                              </span>

                              {year && (
                                <span>{year}</span>
                              )}

                              {anime.averageScore > 0 && (
                                <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400 font-black">
                                  <Star className="w-2.5 h-2.5 fill-current" />
                                  <span>{(anime.averageScore / 10).toFixed(1)}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Jump Icon */}
                        <div className="shrink-0 pl-2">
                          <ArrowUpRight className={`w-3.5 h-3.5 ${isSelected ? 'text-stone-950' : 'text-stone-400'}`} />
                        </div>
                      </div>
                    );
                  })}

                  {/* Fallback "Search All For Query" button */}
                  <div 
                    onClick={() => handleSearchSubmit(query)}
                    className="p-2.5 rounded-lg bg-sand-100 dark:bg-stone-800 hover:bg-amber-400 hover:text-stone-950 text-ink-900 text-xs font-black flex items-center justify-between cursor-pointer transition-all border border-stone-900/30 shadow-2xs mt-1"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <Search className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="truncate">Search all results for "<strong>{query}</strong>"</span>
                    </span>
                    <ChevronRight className="w-4 h-4 shrink-0" />
                  </div>
                </>
              ) : loading ? (
                <div className="p-6 text-center text-xs text-stone-500 space-y-2">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-amber-500" />
                  <p>Searching database in real-time...</p>
                </div>
              ) : (
                <div className="p-5 text-center space-y-2">
                  <p className="text-xs font-bold text-stone-600 dark:text-stone-400">
                    No instant matches for "{query}"
                  </p>
                  <button
                    onClick={() => handleSearchSubmit(query)}
                    className="btn-manga bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs px-3 py-1.5 font-black shadow-2xs"
                  >
                    Perform Full Search
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* ═══ 2. ZERO-QUERY STATE: TRENDING & RECENT SEARCHES ═══ */
            <div className="p-3 space-y-3.5">
              
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500 px-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-stone-500" />
                      <span>Recent Searches</span>
                    </span>
                    <button
                      onClick={clearAllRecentSearches}
                      className="text-[9px] lowercase hover:text-rose-500 underline decoration-dotted"
                    >
                      clear history
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {recentSearches.map((term, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          setQuery(term);
                          handleSearchSubmit(term);
                        }}
                        className="px-2.5 py-1 rounded-md bg-sand-200 dark:bg-stone-800 border border-stone-900 text-xs font-bold text-ink-900 hover:bg-amber-400 hover:text-stone-950 cursor-pointer flex items-center gap-1.5 transition-all shadow-2xs group"
                      >
                        <Clock className="w-2.5 h-2.5 opacity-60" />
                        <span>{term}</span>
                        <button
                          onClick={(e) => removeRecentSearch(e, term)}
                          className="opacity-0 group-hover:opacity-100 hover:text-rose-600 ml-0.5 p-0.5"
                          title="Remove from history"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trending Anime Tags */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1 px-1">
                  <TrendingUp className="w-3 h-3 text-amber-500" />
                  <span>Popular Trending Anime</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {TRENDING_SEARCHES.map((title, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setQuery(title);
                        handleSearchSubmit(title);
                      }}
                      className="px-2.5 py-1 rounded-md bg-sand-100 dark:bg-stone-800 border border-stone-900 text-xs font-bold text-ink-900 hover:bg-amber-400 hover:text-stone-950 transition-all shadow-2xs flex items-center gap-1 active:scale-95"
                    >
                      <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                      <span>{title}</span>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>
      )}
    </div>
  );
}
