import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  X, 
  Sparkles, 
  Flame, 
  Star, 
  Film, 
  Compass, 
  Plus, 
  Check, 
  Loader2,
  Swords,
  Heart,
  Wand2,
  Rocket,
  Laugh,
  Coffee,
  Ghost,
  Trophy
} from 'lucide-react';
import { anilistQuery, SEARCH_ANIME_QUERY, EXPLORE_PAGE_QUERY } from '../../services/anilist';
import { sound } from '../../services/soundEffects';

const GENRES = [
  { id: 'all', label: 'All Vibes', icon: Sparkles },
  { id: 'Action', label: 'Action', icon: Swords },
  { id: 'Romance', label: 'Romance', icon: Heart },
  { id: 'Fantasy', label: 'Fantasy', icon: Wand2 },
  { id: 'Sci-Fi', label: 'Sci-Fi', icon: Rocket },
  { id: 'Comedy', label: 'Comedy', icon: Laugh },
  { id: 'Mystery', label: 'Mystery', icon: Search },
  { id: 'Slice of Life', label: 'Slice of Life', icon: Coffee },
  { id: 'Supernatural', label: 'Supernatural', icon: Ghost },
  { id: 'Sports', label: 'Sports', icon: Trophy }
];

export default function ExploreView({
  watchlist = [],
  onUpdateWatchlist,
  onSelectAnime,
  titleLanguage = 'english'
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');
  
  const [curatedData, setCuratedData] = useState({
    trending: [],
    topRated: [],
    movies: [],
    popularThisSeason: []
  });
  
  const [searchResults, setSearchResults] = useState([]);
  const [loadingCurated, setLoadingCurated] = useState(true);
  const [searching, setSearching] = useState(false);

  // Fast watchlist map
  const watchlistMap = useMemo(() => {
    const map = {};
    (watchlist || []).forEach(item => {
      map[item.anime_id || item.id] = item;
    });
    return map;
  }, [watchlist]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch initial curated sections
  useEffect(() => {
    let isCurrent = true;
    const fetchCurated = async () => {
      setLoadingCurated(true);
      try {
        const now = new Date();
        const month = now.getMonth();
        const season = month < 3 ? 'WINTER' : month < 6 ? 'SPRING' : month < 9 ? 'SUMMER' : 'FALL';
        const seasonYear = now.getFullYear();

        const data = await anilistQuery(EXPLORE_PAGE_QUERY, { season, seasonYear });
        if (isCurrent && data) {
          setCuratedData({
            trending: data.trending?.media || [],
            topRated: data.topRated?.media || [],
            movies: data.movies?.media || [],
            popularThisSeason: data.popularThisSeason?.media || []
          });
        }
      } catch (err) {
        console.error("Failed to load explore content:", err);
      } finally {
        if (isCurrent) setLoadingCurated(false);
      }
    };

    fetchCurated();
    return () => { isCurrent = false; };
  }, []);

  // Perform search / genre filter
  useEffect(() => {
    let isCurrent = true;
    const executeSearch = async () => {
      if (!debouncedQuery && selectedGenre === 'all') {
        setSearchResults([]);
        setSearching(false);
        return;
      }

      setSearching(true);
      try {
        const variables = {
          page: 1,
          search: debouncedQuery || undefined,
          sort: debouncedQuery ? ['SEARCH_MATCH'] : ['SCORE_DESC']
        };

        const res = await anilistQuery(SEARCH_ANIME_QUERY, variables);
        if (isCurrent && res?.Page?.media) {
          let list = res.Page.media;
          if (selectedGenre !== 'all') {
            list = list.filter(m => (m.genres || []).includes(selectedGenre));
          }
          setSearchResults(list);
        }
      } catch (e) {
        console.error("Search error:", e);
      } finally {
        if (isCurrent) setSearching(false);
      }
    };

    executeSearch();
    return () => { isCurrent = false; };
  }, [debouncedQuery, selectedGenre]);

  const getTitle = (anime) => {
    if (!anime) return 'Anime';
    if (typeof anime.title === 'string') return anime.title;
    if (titleLanguage === 'romaji') return anime.title?.romaji || anime.title?.english || anime.title?.native;
    if (titleLanguage === 'native') return anime.title?.native || anime.title?.romaji || anime.title?.english;
    return anime.title?.english || anime.title?.romaji || anime.title?.native || 'Anime';
  };

  const handleQuickAdd = (e, anime) => {
    e.stopPropagation();
    sound.playSaveSuccess();
    const isAiring = anime.status === 'RELEASING';
    const status = isAiring ? 'watching' : 'plan_to_watch';
    onUpdateWatchlist(anime, status, isAiring ? 1 : 0);
  };

  // ═══ COMPONENT: MANGA POSTER CARD ═══
  const renderMangaCard = (anime) => {
    const cover = anime.coverImage?.large || anime.coverImage?.medium || '';
    const tracked = watchlistMap[anime.id];
    const isWatching = tracked?.status === 'watching';
    const isCompleted = tracked?.status === 'completed';

    return (
      <div
        key={anime.id}
        onClick={() => onSelectAnime(anime.id)}
        className="card-manga-panel bg-sand-50 dark:bg-sand-200 rounded-lg border-2 border-stone-900 shadow-[2.5px_2.5px_0px_0px_rgba(24,19,13,1)] overflow-hidden flex flex-col justify-between cursor-pointer group active:scale-[0.98] transition-all"
      >
        {/* Poster Image */}
        <div className="relative aspect-[3/4] w-full bg-sand-200 dark:bg-sand-300 overflow-hidden border-b-2 border-stone-900">
          {cover ? (
            <img
              src={cover}
              alt={getTitle(anime)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center p-2 text-stone-400">
              <Film className="w-8 h-8" />
            </div>
          )}

          {/* Top Score Badge */}
          {anime.averageScore && (
            <div className="absolute top-1.5 left-1.5 bg-stone-900/90 text-amber-400 text-[10px] font-mono font-black px-1.5 py-0.5 rounded border border-amber-400/40 flex items-center gap-0.5 shadow-sm">
              <Star className="w-2.5 h-2.5 fill-amber-400 stroke-none" />
              <span>{anime.averageScore}%</span>
            </div>
          )}

          {/* Quick Add / Tracked Overlay Button */}
          <div className="absolute bottom-1.5 right-1.5">
            {tracked ? (
              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase font-mono border border-stone-900 shadow-sm flex items-center gap-0.5 ${
                isWatching 
                  ? 'bg-status-watching text-white' 
                  : isCompleted 
                    ? 'bg-status-completed text-white' 
                    : 'bg-amber-400 text-stone-950 font-black'
              }`}>
                <Check className="w-2.5 h-2.5 stroke-[3]" />
                <span>{tracked.status}</span>
              </span>
            ) : (
              <button
                onClick={(e) => handleQuickAdd(e, anime)}
                className="btn-manga bg-amber-400 hover:bg-amber-300 text-stone-950 text-[10px] font-black px-2 py-0.5 rounded shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)] flex items-center gap-0.5 active:translate-y-0.5"
                title="Add to Watchlist"
              >
                <Plus className="w-3 h-3 stroke-[3]" />
                <span>Add</span>
              </button>
            )}
          </div>
        </div>

        {/* Title & Meta Info */}
        <div className="p-2 space-y-1">
          <h4 className="font-display font-black text-xs text-ink-900 line-clamp-1 leading-snug group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
            {getTitle(anime)}
          </h4>
          <div className="flex items-center justify-between text-[10px] font-mono text-stone-500">
            <span>{anime.format || 'TV'}</span>
            <span>{anime.episodes ? `${anime.episodes} eps` : 'Ongoing'}</span>
          </div>
        </div>
      </div>
    );
  };

  // ═══ COMPONENT: HORIZONTAL DISCOVERY CAROUSEL ═══
  const renderCarousel = (title, icon, items) => {
    if (!items || items.length === 0) return null;

    return (
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-black text-sm uppercase tracking-tight text-ink-900 flex items-center gap-1.5">
            {icon}
            <span>{title}</span>
          </h3>
          <span className="text-[10px] font-mono text-stone-500 font-bold">
            {items.length} Titles
          </span>
        </div>

        <div className="flex gap-3 overflow-x-auto hide-scrollbar scroll-smooth py-1 -mx-1 px-1">
          {items.map(anime => (
            <div key={anime.id} className="w-[125px] sm:w-[145px] shrink-0">
              {renderMangaCard(anime)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const isSearchActive = !!debouncedQuery || selectedGenre !== 'all';

  return (
    <div className="space-y-4 pb-20">

      {/* ═══ HEADER & UNIVERSAL SEARCH BAR ═══ */}
      <div className="card-manga-panel p-4 bg-sand-50 dark:bg-sand-200 rounded-lg border-2 border-stone-900 shadow-[3px_3px_0px_0px_rgba(24,19,13,1)] space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-black text-lg sm:text-xl text-ink-900 uppercase tracking-tight flex items-center gap-2">
              <Compass className="w-5 h-5 text-amber-500" />
              <span>Explore Anime</span>
            </h1>
            <p className="text-xs text-stone-500 font-sans mt-0.5">
              Discover 20,000+ anime series, movies, and all-time classics
            </p>
          </div>
        </div>

        {/* Global Live Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search any anime (e.g. Attack on Titan, Death Note, Frieren)..."
            className="w-full pl-10 pr-9 py-2 bg-sand-100 dark:bg-sand-300 border-2 border-stone-900 rounded-lg font-sans text-xs text-ink-900 focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder:text-stone-500 shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-stone-500 hover:text-ink-900"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Horizontal Scrollable Genre Filter Pills */}
        <div className="pt-2 border-t border-stone-900/10 dark:border-stone-100/10">
          <div className="flex gap-1.5 overflow-x-auto hide-scrollbar py-0.5 scroll-smooth -mx-1 px-1">
            {GENRES.map(genre => {
              const isSelected = selectedGenre === genre.id;
              const GenreIcon = genre.icon;
              return (
                <button
                  key={genre.id}
                  onClick={() => setSelectedGenre(genre.id)}
                  className={`shrink-0 px-2.5 py-1 rounded-md text-[11px] font-black transition-all border-2 border-stone-900 flex items-center gap-1.5 select-none active:translate-y-0.5 ${
                    isSelected 
                      ? 'bg-amber-400 text-stone-950 font-black shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)] scale-[1.02]' 
                      : 'bg-sand-100 dark:bg-sand-300 text-stone-700 dark:text-stone-300 hover:bg-sand-200'
                  }`}
                >
                  <GenreIcon className={`w-3.5 h-3.5 ${isSelected ? 'stroke-[2.5]' : ''}`} />
                  <span>{genre.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══ ACTIVE SEARCH / GENRE RESULTS ═══ */}
      {isSearchActive ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-display font-black text-sm uppercase text-ink-900 flex items-center gap-1.5">
              <Search className="w-4 h-4 text-amber-500" />
              <span>
                {debouncedQuery ? `Search results for "${debouncedQuery}"` : `${selectedGenre} Anime`}
              </span>
            </h3>
            {searching && (
              <div className="flex items-center gap-1 text-xs font-mono text-stone-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Searching...</span>
              </div>
            )}
          </div>

          {searchResults.length === 0 && !searching ? (
            <div className="card-manga-panel p-8 text-center bg-sand-50 dark:bg-sand-200 rounded-lg border-2 border-stone-900 shadow-manga space-y-2">
              <Film className="w-10 h-10 text-stone-400 mx-auto" />
              <p className="font-display font-bold text-base text-ink-900">
                No anime found
              </p>
              <p className="text-xs text-stone-500 font-sans">
                Try searching for a different anime title or reset the genre filter.
              </p>
              <button
                onClick={() => { setSearchQuery(''); setSelectedGenre('all'); }}
                className="btn-manga bg-amber-400 text-stone-950 text-xs px-3 py-1.5 font-black mt-2"
              >
                Clear Search & Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {searchResults.map(anime => renderMangaCard(anime))}
            </div>
          )}
        </div>
      ) : (
        /* ═══ DEFAULT CURATED DISCOVERY DASHBOARD ═══ */
        <div className="space-y-6">
          {loadingCurated ? (
            <div className="card-manga-panel p-12 text-center bg-sand-50 dark:bg-sand-200 border-2 border-stone-900 rounded-lg flex flex-col items-center justify-center gap-2 shadow-manga">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
              <span className="font-mono text-xs font-bold text-stone-500">Curating top anime from AniList...</span>
            </div>
          ) : (
            <>
              {/* Carousel 1: Trending This Season */}
              {renderCarousel(
                'Trending This Season', 
                <Flame className="w-4 h-4 text-amber-500" />, 
                curatedData.trending
              )}

              {/* Carousel 2: All-Time Classics & Top Rated */}
              {renderCarousel(
                'All-Time Legendary Classics', 
                <Star className="w-4 h-4 text-amber-500 fill-amber-400" />, 
                curatedData.topRated
              )}

              {/* Carousel 3: Masterpiece Anime Movies */}
              {renderCarousel(
                'Masterpiece Anime Movies', 
                <Film className="w-4 h-4 text-amber-500" />, 
                curatedData.movies
              )}

              {/* Carousel 4: Popular Broadcasts */}
              {renderCarousel(
                'Popular This Broadcast Season', 
                <Sparkles className="w-4 h-4 text-amber-500" />, 
                curatedData.popularThisSeason
              )}
            </>
          )}
        </div>
      )}

    </div>
  );
}
