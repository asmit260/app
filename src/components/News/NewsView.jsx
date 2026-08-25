import React, { useState, useEffect, useMemo } from 'react';
import { 
  Newspaper, 
  Search, 
  X, 
  Flame, 
  Film, 
  AlertTriangle, 
  Building2, 
  BookOpen, 
  Sparkles, 
  RotateCw, 
  Calendar, 
  Eye, 
  ShieldAlert, 
  Clock, 
  ChevronRight,
  TrendingUp,
  Pin
} from 'lucide-react';
import { fetchNewsArticles, incrementArticleViews } from '../../services/news';
import { sound } from '../../services/soundEffects';
import NewsDetailModal from './NewsDetailModal';

const CATEGORIES = [
  { id: 'all', label: 'All Stories', icon: Sparkles },
  { id: 'announcement', label: 'Announcements', icon: Flame },
  { id: 'trailer', label: 'Trailers', icon: Film },
  { id: 'delay', label: 'Delays', icon: AlertTriangle },
  { id: 'industry', label: 'Industry', icon: Building2 },
  { id: 'manga', label: 'Manga / Novels', icon: BookOpen }
];

const CATEGORY_TAG_STYLES = {
  announcement: { label: 'Announcement', badge: 'bg-amber-400 text-stone-950 border-stone-900' },
  trailer: { label: 'Trailer', badge: 'bg-purple-500 text-white border-stone-900' },
  delay: { label: 'Delay Notice', badge: 'bg-rose-500 text-white border-stone-900' },
  industry: { label: 'Industry', badge: 'bg-sky-500 text-white border-stone-900' },
  manga: { label: 'Manga / Novel', badge: 'bg-emerald-500 text-white border-stone-900' }
};

function formatRelativeTime(dateString) {
  if (!dateString) return 'Recent';
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function NewsView({ onOpenModeratorStudio }) {
  const [articles, setArticles] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState(null);

  const loadArticles = async () => {
    setIsLoading(true);
    try {
      const data = await fetchNewsArticles({ category: selectedCategory, search: searchQuery });
      setArticles(data);
    } catch (err) {
      console.error("Failed to load news articles:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadArticles();
  }, [selectedCategory, searchQuery]);

  const handleSelectArticle = (article) => {
    sound.playTab();
    incrementArticleViews(article.id);
    setSelectedArticle(article);
  };

  // Top Pinned Featured Hero Story (if category is all and no active search)
  const featuredArticle = useMemo(() => {
    if (selectedCategory !== 'all' || searchQuery.trim()) return null;
    return articles.find(a => a.is_pinned) || articles[0] || null;
  }, [articles, selectedCategory, searchQuery]);

  // Regular Feed Articles (excluding the featured one when displayed)
  const feedArticles = useMemo(() => {
    if (!featuredArticle) return articles;
    return articles.filter(a => a.id !== featuredArticle.id);
  }, [articles, featuredArticle]);

  return (
    <div className="space-y-4 pb-20">

      {/* ═══ HEADER & SEARCH BAR ═══ */}
      <div className="card-manga-panel p-3.5 bg-sand-50 dark:bg-sand-200 rounded-lg border-2 border-stone-900 shadow-[3px_3px_0px_0px_rgba(24,19,13,1)] space-y-3">
        
        {/* Row 1: Title & Moderator Studio Action */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="font-display font-black text-lg sm:text-xl text-ink-900 uppercase tracking-tight truncate flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-amber-500" />
              Anime News
            </h1>
            <span className="bg-amber-400 text-stone-950 text-[10px] font-mono font-black px-2 py-0.5 rounded-full border border-stone-900 shrink-0">
              {articles.length} Stories
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => { sound.playTab(); loadArticles(); }}
              className="p-1.5 rounded-md border-2 border-stone-900 bg-sand-100 dark:bg-sand-300 text-stone-700 dark:text-stone-300 hover:bg-sand-200 active:rotate-180 transition-all shadow-2xs"
              title="Refresh News Feed"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            {onOpenModeratorStudio && (
              <button
                onClick={() => { sound.playTab(); onOpenModeratorStudio(); }}
                className="btn-manga bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs px-2.5 py-1 rounded font-black flex items-center gap-1 shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)]"
                title="Open Moderator News Studio"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mod Studio</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search anime news, announcements, delays..."
            className="w-full pl-9 pr-8 py-2 bg-sand-100 dark:bg-sand-300 rounded-lg border-2 border-stone-900 text-xs font-bold text-ink-900 placeholder:text-stone-400 focus:outline-none focus:bg-amber-400/10 transition-colors shadow-inner"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-ink-900"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Row 3: Category Filter Pills */}
        <div className="pt-2 border-t border-stone-900/10 dark:border-stone-100/10">
          <div className="flex gap-2 overflow-x-auto hide-scrollbar py-0.5 scroll-smooth -mx-1 px-1">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    sound.playTab();
                    setSelectedCategory(cat.id);
                  }}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-black transition-all border-2 border-stone-900 flex items-center gap-1.5 select-none active:translate-y-0.5 ${
                    isSelected 
                      ? 'bg-amber-400 text-stone-950 font-black shadow-[2px_2px_0px_0px_rgba(24,19,13,1)] scale-[1.02]' 
                      : 'bg-sand-100 dark:bg-sand-300 text-stone-700 dark:text-stone-300 hover:bg-sand-200 shadow-sm'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══ BREAKING / FEATURED PINNED HERO STORY ═══ */}
      {featuredArticle && (
        <div
          onClick={() => handleSelectArticle(featuredArticle)}
          className="card-manga-panel bg-sand-50 dark:bg-sand-200 rounded-xl border-2 border-stone-900 shadow-[3.5px_3.5px_0px_0px_rgba(24,19,13,1)] overflow-hidden cursor-pointer group hover:border-amber-500 transition-all"
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
            {/* Left/Top Artwork */}
            <div className="md:col-span-6 relative aspect-[16/9] md:aspect-auto bg-sand-300 overflow-hidden border-b-2 md:border-b-0 md:border-r-2 border-stone-900">
              <img 
                src={featuredArticle.cover_image} 
                alt={featuredArticle.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-2 left-2 flex items-center gap-1.5">
                <span className="bg-amber-400 text-stone-950 text-[9px] font-black uppercase px-2 py-0.5 rounded border border-stone-900 shadow-sm flex items-center gap-1 animate-pulse">
                  <Flame className="w-3 h-3 fill-stone-950" />
                  Breaking News
                </span>
              </div>
            </div>

            {/* Right/Bottom Content */}
            <div className="md:col-span-6 p-4 sm:p-5 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${CATEGORY_TAG_STYLES[featuredArticle.category]?.badge || 'bg-stone-900 text-white'}`}>
                    {featuredArticle.category}
                  </span>
                  <span className="text-[10px] font-mono text-stone-500 font-bold">
                    {formatRelativeTime(featuredArticle.created_at)}
                  </span>
                </div>

                <h2 className="font-display font-black text-base sm:text-lg text-ink-900 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors leading-snug">
                  {featuredArticle.title}
                </h2>

                <p className="text-xs text-stone-600 dark:text-stone-300 font-sans line-clamp-2 leading-relaxed">
                  {featuredArticle.summary}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-stone-900/10 text-[10px] font-mono text-stone-500 font-bold">
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {featuredArticle.views_count || 0} reads
                </span>
                <span className="text-amber-600 dark:text-amber-400 flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                  Read Full Story <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ STANDARD NEWS ARTICLES LIST ═══ */}
      {articles.length === 0 ? (
        <div className="card-manga-panel p-8 text-center bg-sand-50 dark:bg-sand-200 rounded-lg border-2 border-stone-900 shadow-manga space-y-2">
          <Newspaper className="w-10 h-10 text-stone-400 mx-auto" />
          <p className="font-display font-bold text-base text-ink-900">
            No news articles found
          </p>
          <p className="text-xs text-stone-500 font-sans">
            Try adjusting your search query or selecting a different category.
          </p>
          <button
            onClick={() => { setSelectedCategory('all'); setSearchQuery(''); }}
            className="btn-manga bg-amber-400 text-stone-950 text-xs px-3 py-1.5 font-black mt-2"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {feedArticles.map(article => (
            <div
              key={article.id}
              onClick={() => handleSelectArticle(article)}
              className="card-manga-panel p-3 bg-sand-50 dark:bg-sand-200 rounded-lg border-2 border-stone-900 shadow-[2.5px_2.5px_0px_0px_rgba(24,19,13,1)] flex gap-3 cursor-pointer group hover:border-amber-500 active:scale-[0.99] transition-all"
            >
              {/* Thumbnail */}
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-md overflow-hidden border-2 border-stone-900 shadow-sm bg-sand-300">
                <img 
                  src={article.cover_image} 
                  alt={article.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                {article.is_pinned && (
                  <div className="absolute top-1 left-1 bg-amber-400 text-stone-950 p-0.5 rounded border border-stone-900 shadow-2xs">
                    <Pin className="w-2.5 h-2.5 fill-stone-950" />
                  </div>
                )}
              </div>

              {/* Text Meta */}
              <div className="flex-grow min-w-0 flex flex-col justify-between space-y-1">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.2 rounded border ${CATEGORY_TAG_STYLES[article.category]?.badge || 'bg-stone-900 text-white'}`}>
                      {article.category}
                    </span>
                    <span className="text-[9px] font-mono text-stone-500 font-bold">
                      {formatRelativeTime(article.created_at)}
                    </span>
                  </div>

                  <h3 className="font-display font-black text-xs sm:text-sm text-ink-900 line-clamp-2 leading-snug group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    {article.title}
                  </h3>

                  <p className="text-[10px] text-stone-500 line-clamp-1 font-sans">
                    {article.summary}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[9px] font-mono text-stone-500 pt-1 border-t border-stone-900/10">
                  <span>{article.author_name || 'AniTrack'}</span>
                  <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400 font-bold">
                    <Eye className="w-2.5 h-2.5" />
                    {article.views_count || 0}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full Article Reader Modal */}
      {selectedArticle && (
        <NewsDetailModal
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
        />
      )}

    </div>
  );
}
