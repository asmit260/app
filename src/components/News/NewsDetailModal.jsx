import React, { useEffect } from 'react';
import { X, ExternalLink, Calendar, Eye, Share2, Flame, Film, AlertTriangle, Building2, BookOpen, Clock, UserCheck } from 'lucide-react';
import { sound } from '../../services/soundEffects';

const CATEGORY_CONFIG = {
  announcement: { label: 'Announcement', icon: Flame, badge: 'bg-amber-400 text-stone-950 border-stone-900' },
  trailer: { label: 'Trailer', icon: Film, badge: 'bg-purple-500 text-white border-stone-900' },
  delay: { label: 'Delay Notice', icon: AlertTriangle, badge: 'bg-rose-500 text-white border-stone-900' },
  industry: { label: 'Industry', icon: Building2, badge: 'bg-sky-500 text-white border-stone-900' },
  manga: { label: 'Manga / Novel', icon: BookOpen, badge: 'bg-emerald-500 text-white border-stone-900' }
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

function calculateReadingTime(text) {
  if (!text) return '1 min read';
  const words = text.trim().split(/\s+/).length;
  const mins = Math.max(1, Math.ceil(words / 180));
  return `~${mins} min read`;
}

// Simple & clean Markdown Parser for article content
function renderMarkdownContent(content) {
  if (!content) return null;
  const lines = content.split('\n');

  return lines.map((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={idx} className="h-3" />;

    // Heading 3
    if (trimmed.startsWith('### ')) {
      return (
        <h4 key={idx} className="font-display font-black text-sm sm:text-base text-ink-900 uppercase tracking-tight mt-3 mb-1.5 border-l-3 border-amber-400 pl-2">
          {trimmed.slice(4)}
        </h4>
      );
    }

    // Heading 2
    if (trimmed.startsWith('## ')) {
      return (
        <h3 key={idx} className="font-display font-black text-base sm:text-lg text-ink-900 uppercase tracking-tight mt-4 mb-2">
          {trimmed.slice(3)}
        </h3>
      );
    }

    // Heading 1
    if (trimmed.startsWith('# ')) {
      return (
        <h2 key={idx} className="font-display font-black text-lg sm:text-xl text-ink-900 uppercase tracking-tight mt-4 mb-2">
          {trimmed.slice(2)}
        </h2>
      );
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      return (
        <blockquote key={idx} className="p-3 my-2.5 bg-amber-400/10 dark:bg-amber-400/5 rounded-md border-l-4 border-amber-400 text-xs sm:text-sm font-sans italic text-stone-800 dark:text-stone-200">
          {trimmed.slice(2).replace(/^"/, '').replace(/"$/, '')}
        </blockquote>
      );
    }

    // Bullet list item
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      const parsedText = parseInlineFormatting(trimmed.slice(2));
      return (
        <li key={idx} className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 ml-4 list-disc marker:text-amber-500 my-1 leading-relaxed">
          {parsedText}
        </li>
      );
    }

    // Numbered list item
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      return (
        <div key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-stone-700 dark:text-stone-300 my-1 leading-relaxed">
          <span className="font-mono font-black text-amber-500">{numMatch[1]}.</span>
          <span>{parseInlineFormatting(numMatch[2])}</span>
        </div>
      );
    }

    // Normal paragraph
    return (
      <p key={idx} className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed font-sans my-1.5">
        {parseInlineFormatting(trimmed)}
      </p>
    );
  });
}

function parseInlineFormatting(text) {
  // Replace **bold** with strong
  const parts = [];
  const regex = /(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(<strong key={match.index} className="font-black text-stone-900 dark:text-stone-100">{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(<em key={match.index} className="italic">{token.slice(1, -1)}</em>);
    } else if (token.startsWith('[') && token.includes('](')) {
      const title = token.slice(1, token.indexOf(']('));
      const url = token.slice(token.indexOf('](') + 2, -1);
      parts.push(
        <a key={match.index} href={url} target="_blank" rel="noopener noreferrer" className="text-amber-600 dark:text-amber-400 font-bold underline hover:opacity-80">
          {title}
        </a>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

export default function NewsDetailModal({ article, onClose }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!article) return null;

  const cat = CATEGORY_CONFIG[article.category] || CATEGORY_CONFIG.announcement;
  const CatIcon = cat.icon;
  const readTime = calculateReadingTime(article.content);
  const timeAgo = formatRelativeTime(article.created_at);

  const handleShare = async () => {
    sound.playTab();
    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          text: article.summary || article.title,
          url: article.source_url || window.location.href
        });
      } catch (_) {}
    } else {
      try {
        await navigator.clipboard.writeText(`${article.title}\n${article.source_url || window.location.href}`);
        sound.playSaveSuccess();
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
      } catch (_) {}
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="card-manga-panel bg-sand-50 dark:bg-sand-200 w-full max-w-2xl max-h-[92vh] rounded-t-2xl sm:rounded-2xl border-2 border-stone-900 shadow-manga-lg overflow-hidden flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="p-3 sm:p-4 bg-sand-100 dark:bg-sand-300 border-b-2 border-stone-900 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded border shadow-2xs ${cat.badge}`}>
              <CatIcon className="w-3 h-3" />
              {cat.label}
            </span>
            <span className="text-[10px] font-mono font-bold text-stone-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {readTime}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {copied && (
              <span className="text-[10px] font-mono font-black bg-emerald-500 text-white px-2 py-1 rounded border border-stone-900 animate-scale-up">
                ✓ Copied!
              </span>
            )}
            <button
              onClick={handleShare}
              className="p-1.5 rounded-lg border-2 border-stone-900 bg-sand-50 dark:bg-sand-200 text-stone-700 dark:text-stone-300 hover:bg-amber-400 hover:text-stone-950 transition-colors shadow-2xs"
              title="Share Story"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                sound.playTab();
                onClose();
              }}
              className="p-1.5 rounded-lg border-2 border-stone-900 bg-sand-50 dark:bg-sand-200 text-stone-700 dark:text-stone-300 hover:bg-rose-500 hover:text-white transition-colors shadow-2xs"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Container */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-4 hide-scrollbar">
          
          {/* Cover Art Banner */}
          {article.cover_image && (
            <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden border-2 border-stone-900 shadow-manga bg-sand-300">
              <img 
                src={article.cover_image} 
                alt={article.title} 
                className="w-full h-full object-cover"
              />
              {article.is_pinned && (
                <div className="absolute top-2 left-2 bg-amber-400 text-stone-950 font-black text-[9px] uppercase px-2 py-0.5 rounded border border-stone-900 shadow-sm flex items-center gap-1">
                  <Flame className="w-3 h-3 fill-stone-950" />
                  Pinned Story
                </div>
              )}
            </div>
          )}

          {/* Article Header & Metadata */}
          <div className="space-y-2 border-b-2 border-stone-900/15 pb-4">
            <h1 className="font-display font-black text-lg sm:text-2xl text-ink-900 leading-tight">
              {article.title}
            </h1>

            <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-stone-500">
              <span className="flex items-center gap-1 font-bold text-stone-700 dark:text-stone-300">
                <UserCheck className="w-3.5 h-3.5 text-amber-500" />
                {article.author_name || 'AniTrack Editor'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {timeAgo}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                {article.views_count || 0} reads
              </span>
            </div>
          </div>

          {/* Summary Quote */}
          {article.summary && (
            <div className="p-3 bg-amber-400/10 rounded-lg border-2 border-stone-900 text-xs sm:text-sm font-sans font-bold text-stone-800 dark:text-stone-200">
              {article.summary}
            </div>
          )}

          {/* Article Markdown Body */}
          <div className="prose dark:prose-invert max-w-none">
            {renderMarkdownContent(article.content)}
          </div>

          {/* External Source Card */}
          {article.source_url && (
            <div className="pt-4 border-t-2 border-stone-900/15">
              <a
                href={article.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-manga bg-sand-100 dark:bg-sand-300 hover:bg-amber-400 hover:text-stone-950 text-ink-900 p-3 rounded-lg flex items-center justify-between border-2 border-stone-900 shadow-2xs font-bold text-xs group"
              >
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-amber-500 group-hover:text-stone-950" />
                  <span>Read Full Original Source Coverage</span>
                </div>
                <span className="text-[10px] font-mono text-stone-500 group-hover:text-stone-900 underline">
                  {article.source_url.replace(/^https?:\/\//, '').split('/')[0]}
                </span>
              </a>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
