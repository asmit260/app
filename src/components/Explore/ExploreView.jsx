import React, { useState, useEffect } from 'react';
import { Search, Flame, Sparkles, MessageCircle, Newspaper, ArrowRight, ExternalLink } from 'lucide-react';
import { anilistQuery, SEARCH_ANIME_QUERY, EXPLORE_VIBE_QUERY, POPULAR_DISCUSSIONS_QUERY } from '../../services/anilist';
import { fetchLiveNews } from '../../services/news';
import { underratedAnime } from '../../data/underratedAnime';

const GENRES = ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mecha', 'Mystery', 'Psychological', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller'];

export default function ExploreView({ onSelectAnime, titleLanguage = 'english' }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [news, setNews] = useState([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [discussions, setDiscussions] = useState([]);
  const [loadingDiscussions, setLoadingDiscussions] = useState(true);

  useEffect(() => {
    loadNewsAndDiscussions();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch();
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedGenre]);

  const loadNewsAndDiscussions = async () => {
    try {
      fetchLiveNews().then(items => {
        setNews(items);
        setLoadingNews(false);
      });

      anilistQuery(POPULAR_DISCUSSIONS_QUERY).then(res => {
        if (res?.Page?.threads) {
          setDiscussions(res.Page.threads.filter(t => t.mediaCategories?.length > 0));
        }
        setLoadingDiscussions(false);
      });
    } catch (e) {
      console.error(e);
    }
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
        // Default to curated 49 gems
        setResults(underratedAnime);
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getTitle = (anime) => {
    if (typeof anime.title === 'string') return anime.title;
    if (titleLanguage === 'romaji') return anime.title?.romaji || anime.title?.english || anime.title?.native;
    if (titleLanguage === 'native') return anime.title?.native || anime.title?.romaji || anime.title?.english;
    return anime.title?.english || anime.title?.romaji || anime.title?.native || 'Unknown Title';
  };

  return (
    <div className="space-y-6 pb-20">

      {/* Search Input Bar */}
      <div className="card-manga-panel p-3 bg-sand-50 dark:bg-sand-200">
        <div className="relative flex items-center">
          <Search className="w-5 h-5 absolute left-3 text-stone-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSelectedGenre('');
              setSearchQuery(e.target.value);
            }}
            placeholder="Search anime by title, studio, or trope..."
            className="w-full pl-10 pr-4 py-2 bg-sand-100 dark:bg-sand-300 border-2 border-stone-900 rounded-md font-sans text-sm text-ink-900 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        {/* Genre Filter Pills */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pt-3 mt-2 border-t border-sand-300 dark:border-sand-400">
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedGenre('');
            }}
            className={`shrink-0 px-3 py-1 rounded-md text-xs font-black transition-all border-2 border-stone-900 ${
              !selectedGenre && !searchQuery
                ? 'bg-amber-400 text-ink-900 shadow-[2px_2px_0px_0px_rgba(24,19,13,1)] scale-[1.02]'
                : 'bg-sand-100 dark:bg-sand-300 text-stone-700 hover:bg-sand-200'
            }`}
          >
            All Gems (49)
          </button>
          {GENRES.map((g) => (
            <button
              key={g}
              onClick={() => {
                setSearchQuery('');
                setSelectedGenre(g);
              }}
              className={`shrink-0 px-3 py-1 rounded-md text-xs font-black transition-all border-2 border-stone-900 ${
                selectedGenre === g
                  ? 'bg-amber-400 text-ink-900 shadow-[2px_2px_0px_0px_rgba(24,19,13,1)] scale-[1.02]'
                  : 'bg-sand-100 dark:bg-sand-300 text-stone-700 hover:bg-sand-200'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* TRENDING NEWS SECTION (Shown when not searching) */}
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

      {/* POPULAR DISCUSSIONS SECTION (Shown when not searching) */}
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
            <span>
              {searchQuery ? `Search Results (${results.length})` : selectedGenre ? `${selectedGenre} Anime (${results.length})` : 'Hidden Gems Masterpieces'}
            </span>
          </h2>
          <span className="text-xs font-mono text-stone-500">
            {results.length} titles
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
              <div key={i} className="card-manga-panel h-64 shimmer-skeleton" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="card-manga-panel p-8 text-center bg-sand-50 dark:bg-sand-200">
            <p className="font-display font-bold text-base text-ink-900">No anime found</p>
            <p className="text-xs text-stone-500 font-sans mt-1">Try another search keyword or genre filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {results.map((anime) => {
              const title = getTitle(anime);
              const cover = anime.coverImage?.large || anime.coverImage?.medium || anime.coverImage;

              return (
                <div
                  key={anime.id}
                  onClick={() => onSelectAnime(anime.id)}
                  className="card-manga-panel overflow-hidden flex flex-col group cursor-pointer hover:border-amber-500"
                >
                  <div className="h-44 w-full bg-sand-200 relative overflow-hidden border-b-2 border-stone-900">
                    <img 
                      src={cover} 
                      alt={title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                    {anime.averageScore && (
                      <div className="absolute bottom-2 right-2">
                        <span className="px-1.5 py-0.5 text-[10px] font-mono font-black bg-amber-400 text-ink-900 border border-stone-900 shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)]">
                          ★ {anime.averageScore}%
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-2.5 flex-grow flex flex-col justify-between">
                    <div>
                      <h3 className="font-display font-bold text-xs text-ink-900 line-clamp-2 leading-snug group-hover:text-navy-700">
                        {title}
                      </h3>
                      {anime.whyWatch && (
                        <p className="text-[10px] text-stone-600 line-clamp-2 mt-1 italic font-sans">
                          "{anime.whyWatch}"
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1 mt-2">
                      {(anime.genres || []).slice(0, 2).map((g, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 bg-sand-200 dark:bg-sand-300 text-stone-700 text-[9px] font-bold rounded border border-stone-900/30">
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
}
