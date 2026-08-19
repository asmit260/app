import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Sparkles, MessageCircle, Newspaper, ExternalLink, LayoutGrid, List } from 'lucide-react';
import { anilistQuery, SEARCH_ANIME_QUERY, EXPLORE_VIBE_QUERY, POPULAR_DISCUSSIONS_QUERY } from '../../services/anilist';
import { fetchLiveNews } from '../../services/news';
import { getActiveAnimeAlerts } from '../../services/notifications';
import { underratedAnime } from '../../data/underratedAnime';
import AnimeCard from '../Common/AnimeCard';
import AiringAlertModal from '../Schedule/AiringAlertModal';

const GENRES = ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mecha', 'Mystery', 'Psychological', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller'];

export default function ExploreView({ 
  watchlist = [], 
  onUpdateWatchlist, 
  onRemoveItem, 
  onSelectAnime, 
  titleLanguage = 'english' 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [news, setNews] = useState([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [discussions, setDiscussions] = useState([]);
  const [loadingDiscussions, setLoadingDiscussions] = useState(true);
  const [activeAlerts, setActiveAlerts] = useState({});
  const [selectedAlertAnime, setSelectedAlertAnime] = useState(null);
  const [selectedAlertInfo, setSelectedAlertInfo] = useState(null);

  // Fast hash map for watchlist lookups
  const watchlistMap = useMemo(() => {
    const map = {};
    (watchlist || []).forEach(item => {
      map[item.anime_id || item.id] = item;
    });
    return map;
  }, [watchlist]);

  const loadAlerts = useCallback(async () => {
    try {
      const alerts = await getActiveAnimeAlerts();
      setActiveAlerts(alerts);
    } catch (_) {}
  }, []);

  useEffect(() => {
    loadAlerts();
    const handleAlertsChanged = () => loadAlerts();
    window.addEventListener('anitrack-alerts-changed', handleAlertsChanged);
    return () => window.removeEventListener('anitrack-alerts-changed', handleAlertsChanged);
  }, [loadAlerts]);

  useEffect(() => {
    loadNewsAndDiscussions();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedGenre]);

  const loadNewsAndDiscussions = () => {
    fetchLiveNews()
      .then(items => {
        setNews(items || []);
      })
      .catch(err => {
        console.warn("Live news fetch failed:", err);
      })
      .finally(() => setLoadingNews(false));

    anilistQuery(POPULAR_DISCUSSIONS_QUERY)
      .then(res => {
        if (res?.Page?.threads) {
          setDiscussions(res.Page.threads.filter(t => t.mediaCategories?.length > 0));
        }
      })
      .catch(err => {
        console.warn("Discussions query failed:", err);
      })
      .finally(() => setLoadingDiscussions(false));
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      if (searchQuery.trim().length > 0) {
        const res = await anilistQuery(SEARCH_ANIME_QUERY, {
          search: searchQuery.trim(),
          page: 1,
          sort: ['POPULARITY_DESC']
        });
        if (res?.Page?.media) {
          setResults(res.Page.media);
        }
      } else if (selectedGenre) {
        const res = await anilistQuery(EXPLORE_VIBE_QUERY, {
          genre: selectedGenre,
          page: 1
        });
        if (res?.Page?.media) {
          setResults(res.Page.media);
        }
      } else {
        setResults(underratedAnime);
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">

      {/* Search Input Bar */}
      <div className="card-manga-panel p-3 bg-sand-50 dark:bg-sand-200">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-stone-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search thousands of anime by name..."
            className="w-full pl-9 pr-4 py-2 bg-sand-100 dark:bg-sand-300 border-2 border-stone-900 rounded-md font-sans text-xs sm:text-sm text-ink-900 font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        {/* Genre Filter Pills */}
        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pt-3 mt-2 border-t border-sand-300 dark:border-sand-400">
          <button
            onClick={() => setSelectedGenre('')}
            className={`shrink-0 px-3 py-1 text-xs font-black rounded border-2 border-stone-900 transition-all ${
              !selectedGenre 
                ? 'bg-amber-400 text-ink-900 shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)] scale-[1.02]' 
                : 'bg-sand-100 dark:bg-sand-300 text-stone-700 hover:bg-sand-200'
            }`}
          >
            All Genres
          </button>
          {GENRES.map((g) => (
            <button
              key={g}
              onClick={() => setSelectedGenre(selectedGenre === g ? '' : g)}
              className={`shrink-0 px-3 py-1 text-xs font-bold rounded border-2 border-stone-900 transition-all ${
                selectedGenre === g
                  ? 'bg-amber-400 text-ink-900 shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)] scale-[1.02]'
                  : 'bg-sand-100 dark:bg-sand-300 text-stone-700 hover:bg-sand-200'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* TRENDING NEWS SECTION */}
      {!searchQuery && !selectedGenre && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-black text-lg md:text-xl text-ink-900 uppercase tracking-tight flex items-center gap-2">
              <span className="bg-stone-900 text-sand-50 dark:bg-sand-50 dark:text-stone-900 px-2 py-0.5 text-xs font-black uppercase border border-stone-900 shadow-[2px_2px_0px_0px_rgba(24,19,13,1)]">
                Live
              </span>
              <span>Trending News</span>
            </h2>
            <Newspaper className="w-4 h-4 text-stone-500" />
          </div>

          {loadingNews ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="card-manga-panel h-36 shimmer-skeleton" />
              ))}
            </div>
          ) : news.length === 0 ? (
            <p className="text-xs text-stone-500 italic">No news items available right now.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {news.slice(0, 4).map((item, idx) => (
                <a
                  key={idx}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card-manga-panel overflow-hidden flex flex-col group hover:border-amber-500"
                >
                  <div className="h-28 w-full bg-sand-300 relative overflow-hidden border-b-2 border-stone-900">
                    <img 
                      src={item.imageUrl} 
                      alt={item.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <div className="absolute top-2 left-2">
                      <span className="px-1.5 py-0.5 text-[9px] font-black uppercase bg-amber-400 text-ink-900 border border-stone-900 shadow-[1px_1px_0px_0px_rgba(24,19,13,1)]">
                        News
                      </span>
                    </div>
                  </div>
                  <div className="p-2.5 flex-grow flex flex-col justify-between">
                    <h4 className="font-display font-bold text-xs text-ink-900 leading-snug line-clamp-2 group-hover:text-navy-700">
                      {item.title}
                    </h4>
                    <span className="text-[10px] text-stone-500 font-mono font-bold mt-1.5 flex items-center justify-between">
                      <span>{item.timeAgo}</span>
                      <ExternalLink className="w-3 h-3 text-stone-400 group-hover:text-ink-900" />
                    </span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>
      )}

      {/* POPULAR DISCUSSIONS SECTION */}
      {!searchQuery && !selectedGenre && discussions.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-black text-lg md:text-xl text-ink-900 uppercase tracking-tight flex items-center gap-2">
              <span className="bg-amber-400 text-ink-900 px-2 py-0.5 text-xs font-black uppercase border border-stone-900 shadow-[2px_2px_0px_0px_rgba(24,19,13,1)]">
                Hot
              </span>
              <span>Discussions</span>
            </h2>
            <MessageCircle className="w-4 h-4 text-stone-500" />
          </div>

          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
            {discussions.slice(0, 6).map((thread) => (
              <a
                key={thread.id}
                href={thread.siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="card-manga-panel p-3 shrink-0 w-64 flex flex-col justify-between group hover:border-amber-500"
              >
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-sand-300 dark:border-sand-400">
                  <img 
                    src={thread.mediaCategories[0]?.coverImage?.medium} 
                    alt="Cover" 
                    className="w-7 h-9 object-cover border border-stone-900" 
                  />
                  <span className="text-[10px] font-bold text-stone-600 truncate uppercase">
                    {thread.mediaCategories[0]?.title?.english || thread.mediaCategories[0]?.title?.romaji}
                  </span>
                </div>
                <h4 className="font-display font-bold text-xs text-ink-900 line-clamp-2 group-hover:text-navy-700 leading-snug">
                  {thread.title}
                </h4>
                <div className="mt-3 pt-2 border-t border-sand-200 flex items-center justify-between text-[10px] font-mono text-stone-500 font-bold">
                  <span>{thread.user?.name}</span>
                  <span className="bg-sand-200 px-1.5 py-0.5 rounded border border-stone-900/30">
                    {thread.replyCount} replies
                  </span>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* ANIME RESULTS GRID */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-black text-lg md:text-xl text-ink-900 uppercase tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span>{searchQuery ? 'Search Results' : selectedGenre ? `${selectedGenre} Anime` : 'Curated Masterpieces'}</span>
          </h2>

          <div className="flex items-center gap-1 bg-sand-200 dark:bg-sand-300 p-1 rounded-md border-2 border-stone-900 shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)]">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition-all ${
                viewMode === 'grid' 
                  ? 'bg-amber-400 text-ink-900 font-black shadow-sm' 
                  : 'text-stone-600 hover:text-ink-900'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition-all ${
                viewMode === 'list' 
                  ? 'bg-amber-400 text-ink-900 font-black shadow-sm' 
                  : 'text-stone-600 hover:text-ink-900'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
              <div key={i} className="card-manga-panel h-[385px] shimmer-skeleton rounded-md" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="card-manga-panel p-8 text-center bg-sand-50 dark:bg-sand-200">
            <p className="font-display font-bold text-base text-ink-900">No anime found</p>
            <p className="text-xs text-stone-500 font-sans mt-1">Try another search keyword or genre filter.</p>
          </div>
        ) : (
          <div className={
            viewMode === 'grid'
              ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5"
              : "space-y-3"
          }>
            {results.map((anime) => (
              <AnimeCard
                key={anime.id}
                anime={anime}
                watchlistEntry={watchlistMap[anime.id]}
                onUpdateStatus={onUpdateWatchlist}
                onRemoveItem={onRemoveItem}
                onSelectAnime={onSelectAnime}
                titleLanguage={titleLanguage}
                whyWatch={anime.whyWatch}
                isAlertActive={!!activeAlerts[anime.id]}
                onOpenAlert={(a, info) => {
                  setSelectedAlertAnime(a);
                  setSelectedAlertInfo(info || { airingAt: Math.floor(Date.now()/1000) + 86400, episode: 1 });
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* Airing Alert Modal */}
      {selectedAlertAnime && (
        <AiringAlertModal
          isOpen={!!selectedAlertAnime}
          onClose={() => {
            setSelectedAlertAnime(null);
            setSelectedAlertInfo(null);
          }}
          anime={selectedAlertAnime}
          airingInfo={selectedAlertInfo}
          existingAlert={activeAlerts[selectedAlertAnime.id]}
          onAlertUpdated={loadAlerts}
          titleLanguage={titleLanguage}
        />
      )}

    </div>
  );
}
