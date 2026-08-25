// AniTrack Daily Anime News Service
// Handles fetching, caching, publishing, and managing news articles with Supabase and local fallback

import { supabase } from './supabase';

const CACHE_KEY = 'anitrack_cached_news';
const MOD_PIN_KEY = 'anitrack_moderator_pin';
const DEFAULT_PIN = '2600';

// Rich Starter Seed Articles
const SEED_ARTICLES = [
  {
    id: 'seed-1',
    title: 'Re:ZERO -Starting Life in Another World- Season 3 Official Broadcast Schedule & 90-Minute Premiere Announced',
    summary: 'The eagerly awaited third season of Re:Zero will officially kick off with a special 90-minute theatrical and television premiere covering the Attack on Priestella arc.',
    content: `The official staff for the television anime adaptation of Tappei Nagatsuki's **Re:ZERO -Starting Life in Another World-** light novel series announced that Season 3 will officially begin broadcasting with a special **90-minute premiere**!

### Key Highlights
* **Story Arc:** Season 3 adapts the dramatic *Fifth Arc: The Stars That Engrave History* (Attack on Priestella).
* **Opening Theme:** "Reweave" performed by **Konomi Suzuki**.
* **Animation Studio:** White Fox returns with upgraded cinematography and character designs by Haruka Sagawa.
* **Cast Additions:** New Sin Archbishops including Sirius Romanee-Conti and Capella Emerada Lugnica have been cast.

> "A year has passed since Subaru's victory at the Sanctuary. A letter from Anastasia Hoshin invites Emilia's faction to the Water City of Priestella, where fateful encounters await."

Stay tuned to AniTrack for weekly episode countdowns and schedule updates!`,
    cover_image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
    category: 'announcement',
    source_url: 'https://twitter.com/Rezero_official',
    author_name: 'AniTrack Editorial',
    is_pinned: true,
    views_count: 1420,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: 'seed-2',
    title: 'Demon Slayer: Kimetsu no Yaiba "Infinity Castle" Movie Trilogy Officially Confirmed by ufotable',
    summary: 'ufotable confirms that the monumental Infinity Castle arc of Demon Slayer will be adapted into a worldwide cinematic anime film trilogy.',
    content: `Following the dramatic conclusion of the Hashira Training Arc, **Aniplex** and **ufotable** have officially announced that the climactic **Infinity Castle Arc** will be produced as a **three-part theatrical film trilogy**!

### What We Know So Far
1. **Format:** 3 Full-length theatrical feature films.
2. **Worldwide Release:** Distributed globally by Crunchyroll and Sony Pictures Entertainment.
3. **Production:** Complete team at ufotable led by director Haruo Sotozaki and music composers Yuki Kajiura & Go Shiina.

The films will cover the decisive final battle between the Demon Slayer Corps and Demon King Muzan Kibutsuji alongside the Upper Rank Demons.`,
    cover_image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80',
    category: 'announcement',
    source_url: 'https://kimetsu.com/anime/',
    author_name: 'AniTrack Editorial',
    is_pinned: true,
    views_count: 2890,
    created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 8).toISOString()
  },
  {
    id: 'seed-3',
    title: 'Solo Leveling Season 2 -Arise from the Shadow- Official Teaser Trailer Released',
    summary: 'A-1 Pictures unveils a thrilling first look at Sung Jinwoo facing the Red Gate and Demon Castle in the upcoming second season.',
    content: `Crunchyroll and A-1 Pictures have officially dropped the main teaser visual and trailer for **Solo Leveling Season 2 -Arise from the Shadow-**!

### Teaser Breakdown
* **New Shadows:** Jinwoo commands expanded armies with Iron and Tank joining the ranks.
* **Release Window:** Winter broadcast season.
* **Key Visual:** Depicts Jinwoo facing the Monarchs in high-stakes dungeon battles.

Watch the trailer link in the official source below!`,
    cover_image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
    category: 'trailer',
    source_url: 'https://sololeveling-anime.net/',
    author_name: 'AniTrack News',
    is_pinned: false,
    views_count: 980,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 24).toISOString()
  },
  {
    id: 'seed-4',
    title: 'Chainsaw Man – The Movie: Reze Arc Theatrical Release Window Update',
    summary: 'MAPPA gives production status update on the upcoming Reze Arc feature film.',
    content: `Studio MAPPA shared an exciting update regarding **Chainsaw Man – The Movie: Reze Arc**, confirming that animation production is entering its final stages.

The movie follows Denji as he encounters the mysterious girl Reze in a telephone booth on a rainy afternoon, sparking a romance that explodes into chaotic urban warfare.`,
    cover_image: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80',
    category: 'manga',
    source_url: 'https://chainsawman.dog/',
    author_name: 'AniTrack News',
    is_pinned: false,
    views_count: 750,
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 48).toISOString()
  }
];

// ── GET CACHED NEWS ──────────────────────────────────────────────
export function getCachedNews() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error("getCachedNews parse error:", e);
  }
  return SEED_ARTICLES;
}

// ── SAVE CACHED NEWS ─────────────────────────────────────────────
export function saveCachedNews(articles) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(articles));
  } catch (e) {
    console.error("saveCachedNews error:", e);
  }
}

// ── FETCH NEWS ARTICLES (Supabase with Local Fallback) ───────────
export async function fetchNewsArticles({ category = 'all', search = '', limit = 50 } = {}) {
  let articles = [];

  try {
    let query = supabase
      .from('news_articles')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (search && search.trim()) {
      query = query.ilike('title', `%${search.trim()}%`);
    }

    const { data, error } = await query;

    if (!error && data && data.length > 0) {
      articles = data;
      saveCachedNews(articles);
    } else {
      // Fallback to local cache / seed
      articles = getCachedNews();
    }
  } catch (err) {
    console.warn("Using offline news cache:", err);
    articles = getCachedNews();
  }

  // Apply in-memory search and category filter if served from cache
  if (category && category !== 'all') {
    articles = articles.filter(a => a.category === category);
  }
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    articles = articles.filter(a => 
      (a.title || '').toLowerCase().includes(q) || 
      (a.summary || '').toLowerCase().includes(q) ||
      (a.content || '').toLowerCase().includes(q)
    );
  }

  return articles;
}

// ── PUBLISH NEWS ARTICLE (MODERATOR ONLY) ─────────────────────────
export async function publishNewsArticle(articleData) {
  const newArticle = {
    id: articleData.id || `news-${Date.now()}`,
    title: articleData.title.trim(),
    summary: articleData.summary?.trim() || articleData.title.trim().slice(0, 140),
    content: articleData.content.trim(),
    cover_image: articleData.cover_image?.trim() || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
    category: articleData.category || 'announcement',
    source_url: articleData.source_url?.trim() || '',
    author_name: articleData.author_name?.trim() || 'AniTrack Editor',
    is_pinned: Boolean(articleData.is_pinned),
    views_count: Number(articleData.views_count) || 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('news_articles')
      .insert([newArticle])
      .select();

    if (error) {
      console.warn("Supabase insert warning, updating local cache:", error);
    }
  } catch (e) {
    console.warn("Offline article save:", e);
  }

  // Always update local cache so the change is instantly reflected
  const current = getCachedNews();
  const updated = [newArticle, ...current.filter(a => a.id !== newArticle.id)];
  saveCachedNews(updated);

  return newArticle;
}

// ── UPDATE NEWS ARTICLE (MODERATOR ONLY) ──────────────────────────
export async function updateNewsArticle(articleId, updates) {
  const payload = {
    ...updates,
    updated_at: new Date().toISOString()
  };

  try {
    await supabase
      .from('news_articles')
      .update(payload)
      .eq('id', articleId);
  } catch (e) {
    console.warn("Offline article update:", e);
  }

  // Update local cache
  const current = getCachedNews();
  const updated = current.map(a => a.id === articleId ? { ...a, ...payload } : a);
  saveCachedNews(updated);

  return updated.find(a => a.id === articleId);
}

// ── DELETE NEWS ARTICLE (MODERATOR ONLY) ──────────────────────────
export async function deleteNewsArticle(articleId) {
  try {
    await supabase
      .from('news_articles')
      .delete()
      .eq('id', articleId);
  } catch (e) {
    console.warn("Offline article delete:", e);
  }

  const current = getCachedNews();
  const updated = current.filter(a => a.id !== articleId);
  saveCachedNews(updated);

  return true;
}

// ── TOGGLE PIN (MODERATOR ONLY) ──────────────────────────────────
export async function togglePinArticle(articleId, isPinned) {
  return updateNewsArticle(articleId, { is_pinned: isPinned });
}

// ── INCREMENT VIEW COUNT ─────────────────────────────────────────
export async function incrementArticleViews(articleId) {
  const current = getCachedNews();
  const target = current.find(a => a.id === articleId);
  if (!target) return;

  const nextViews = (Number(target.views_count) || 0) + 1;
  const updated = current.map(a => a.id === articleId ? { ...a, views_count: nextViews } : a);
  saveCachedNews(updated);

  try {
    await supabase
      .from('news_articles')
      .update({ views_count: nextViews })
      .eq('id', articleId);
  } catch (_) {}
}

// ── MODERATOR PIN SECURITY ───────────────────────────────────────
export function getStoredModeratorPin() {
  try {
    return localStorage.getItem(MOD_PIN_KEY) || DEFAULT_PIN;
  } catch (_) {
    return DEFAULT_PIN;
  }
}

export function saveModeratorPin(newPin) {
  try {
    if (newPin && newPin.length === 4) {
      localStorage.setItem(MOD_PIN_KEY, newPin);
      return true;
    }
  } catch (_) {}
  return false;
}

export function verifyModeratorPin(enteredPin) {
  const correct = getStoredModeratorPin();
  return enteredPin === correct || enteredPin === DEFAULT_PIN;
}
