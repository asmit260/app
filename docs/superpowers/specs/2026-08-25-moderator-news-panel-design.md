# Design Spec: Moderator News Panel & Daily News Feed

**Date:** 2026-08-25  
**Topic:** Moderator News Publishing Studio & Public News Feed  
**Status:** Approved by User  
**Target Platform:** Web & Android (Capacitor)

---

## 1. Overview & Objective
Enable AniTrack moderators to publish and manage daily anime news, announcements, episode delay alerts, trailers, and industry updates directly from a secure Moderator Studio. All users can browse, search, and read formatted news stories inside a dedicated **News** tab with tactile manga styling, category filters, and instant offline caching.

---

## 2. Architecture & Data Model

### 2.1 Database Schema (`news_articles`)
```sql
CREATE TABLE IF NOT EXISTS news_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  summary TEXT,
  content TEXT NOT NULL, -- Markdown formatted article body
  cover_image TEXT,
  category TEXT NOT NULL DEFAULT 'announcement', -- 'announcement' | 'trailer' | 'delay' | 'industry' | 'manga'
  source_url TEXT,
  author_name TEXT DEFAULT 'AniTrack Editor',
  is_pinned BOOLEAN DEFAULT FALSE,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.2 Storage & Offline Strategy (`services/news.js`)
* **Supabase Integration**: Direct querying of `news_articles` with ordering by `is_pinned DESC, created_at DESC`.
* **Fallback Mock Storage**: For local/offline mode, `LocalStorageMockDb` in `services/supabase.js` includes the `news_articles` table with initial starter seed articles.
* **Client Caching**: `anitrack_cached_news` stored in `localStorage` for zero-latency instant rendering on app launch.

### 2.3 Moderator Authentication & Access Control
* **Security Model**: Master Moderator PIN verification (stored securely in encrypted app storage / session state with default PIN `2600`, customizable in settings).
* **Access Point**: Direct entry via **"Moderator Studio"** button in `ProfileView.jsx` or long-press on News header.
* **Session State**: Session-only unlock state (`isModeratorUnlocked`) so accidental access is prevented.

---

## 3. Component Architecture & UI Experience

### 3.1 Public News Tab (`src/components/News/NewsView.jsx`)
* **Header & Search Bar**: Search news by keywords, view live news count.
* **Category Pill Filter**:
  * 🌟 **All** (All Stories)
  * 🔥 **Announcements** (New Seasons, Adaptations, Cast)
  * 🎬 **Trailers** (PVs, Teasers, Visuals)
  * ⚠️ **Delays** (Broadcast / Streaming Delay Notices)
  * 🏢 **Industry** (Box Office, Studio News, Author Updates)
  * 📖 **Manga** (Manga & Light Novel News)
* **Pinned Hero Story Banner**:
  * Large poster artwork with comic halftone overlay.
  * `"BREAKING NEWS"` / `"PINNED"` badge.
  * Headline, reading time estimate (`~2 min read`), and relative timestamp (`2h ago`).
* **News Articles Grid / List**:
  * Manga panel cards with high-contrast borders and drop-shadows.
  * Thumbnail, category pill, title, snippet preview, and read counter.
* **Article Reader Modal (`src/components/News/NewsDetailModal.jsx`)**:
  * Full-bleed responsive header banner.
  * Rich Markdown parsing (headings, bold, lists, quotes, embedded links).
  * Direct source link button (`"Read Original Source ↗"`).
  * 1-Tap native share action (Web Share API / clipboard fallback).

### 3.2 Moderator Studio (`src/components/Moderator/ModeratorNewsStudio.jsx`)
* **PIN Unlock Screen**: 4-digit tactile PIN keypad with shake animation on invalid entry.
* **Moderator Control Deck**:
  * **Tab 1: Article Publisher**:
    * Title input field.
    * Category dropdown selector with distinctive emoji icons.
    * Cover image URL input with instant visual preview.
    * Summary / Teaser snippet input.
    * Full Markdown Editor with fast formatting toolbar (Bold, Heading, Bullet List, Link, Quote).
    * External Source URL input.
    * **"Pin to Top of Feed"** toggle switch.
    * Real-time Preview Mode toggle.
    * **"Publish News Post"** primary button with haptic feedback & confetti.
  * **Tab 2: Article Manager**:
    * Table/cards list of all published news articles.
    * Quick Actions: **Edit**, **Delete** (with confirmation), **Toggle Pin**.

### 3.3 Navigation Update (`src/components/Navigation/BottomNav.jsx`)
* Insert **News** tab (`Newspaper` icon) positioned seamlessly between **Explore** and **Watchlist** or as a 5-tab core deck (`Schedule`, `Explore`, `News`, `Watchlist`, `Profile`), with `Analytics` accessible via top header or profile.

---

## 4. Error Handling & Edge Cases
1. **Network Disconnected**: Serves cached news articles seamlessly with an `"Offline Mode • Viewing Cached News"` badge.
2. **Empty Feed**: Renders manga empty state with `"No news articles published yet"` and a direct link to the Moderator Studio.
3. **Invalid Images**: Automatic fallback to styled category placeholder artwork if a cover URL fails to load.
4. **Long Titles / Markdown**: Defensive CSS wrapping, clamped headlines on cards, and clean typography in the detail reader.

---

## 5. Verification & Testing Plan
* **CRUD Verification**:
  1. Open Profile -> Enter Moderator PIN -> Unlock Studio.
  2. Create a new article with Category `Trailer`, Cover Image, and Markdown text.
  3. Verify article appears immediately on the **News** tab as pinned breaking news.
  4. Edit the article and verify changes reflect live.
  5. Delete an article and verify removal.
* **Category Filtering**: Click category pills (`Delays`, `Announcements`) and verify instantaneous list filtering.
* **Build & Android Verification**: Run `npm run build` and `npx cap sync android` to ensure zero compilation or styling errors.
