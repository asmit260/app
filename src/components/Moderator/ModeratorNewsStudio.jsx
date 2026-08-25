import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldAlert, 
  Plus, 
  Edit3, 
  Trash2, 
  Pin, 
  Eye, 
  Check, 
  Lock, 
  Unlock, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  List, 
  Heading, 
  Bold, 
  Italic, 
  Quote, 
  Sparkles, 
  Flame, 
  Film, 
  AlertTriangle, 
  Building2, 
  BookOpen, 
  KeyRound,
  RotateCcw
} from 'lucide-react';
import { 
  fetchNewsArticles, 
  publishNewsArticle, 
  updateNewsArticle, 
  deleteNewsArticle, 
  togglePinArticle, 
  verifyModeratorPin, 
  saveModeratorPin, 
  getStoredModeratorPin 
} from '../../services/news';
import { sound } from '../../services/soundEffects';
import { burstConfetti } from '../../utils/confetti';

const CATEGORIES = [
  { id: 'announcement', label: '🔥 Announcement', icon: Flame },
  { id: 'trailer', label: '🎬 Trailer', icon: Film },
  { id: 'delay', label: '⚠️ Delay Notice', icon: AlertTriangle },
  { id: 'industry', label: '🏢 Industry', icon: Building2 },
  { id: 'manga', label: '📖 Manga / Light Novel', icon: BookOpen }
];

const PRESET_COVERS = [
  { label: 'Fantasy / Magic', url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80' },
  { label: 'Action / Cyberpunk', url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80' },
  { label: 'Dungeon / Solo', url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80' },
  { label: 'Neon / City', url: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80' }
];

export default function ModeratorNewsStudio({ isOpen, onClose, onArticlesUpdated }) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState(false);
  
  const [activeTab, setActiveTab] = useState('publish'); // 'publish' | 'manage' | 'settings'
  const [articles, setArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState(null);

  // Form State
  const [form, setForm] = useState({
    title: '',
    category: 'announcement',
    cover_image: '',
    summary: '',
    content: '',
    source_url: '',
    author_name: 'AniTrack Moderator',
    is_pinned: false
  });

  const [previewMode, setPreviewMode] = useState(false);
  const [newPinInput, setNewPinInput] = useState('');
  const [pinSuccessMsg, setPinSuccessMsg] = useState('');

  // Load articles once unlocked
  const loadArticles = async () => {
    setIsLoading(true);
    try {
      const data = await fetchNewsArticles({ category: 'all' });
      setArticles(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isUnlocked) {
      loadArticles();
    }
  }, [isUnlocked]);

  // Handle PIN entry
  const handlePinDigit = (digit) => {
    sound.playTap();
    if (enteredPin.length < 4) {
      const next = enteredPin + digit;
      setEnteredPin(next);
      if (next.length === 4) {
        if (verifyModeratorPin(next)) {
          sound.playCelebration();
          setIsUnlocked(true);
          setPinError(false);
        } else {
          sound.playError();
          setPinError(true);
          setTimeout(() => {
            setEnteredPin('');
            setPinError(false);
          }, 800);
        }
      }
    }
  };

  const handlePinBackspace = () => {
    sound.playTap();
    setEnteredPin(prev => prev.slice(0, -1));
  };

  // Insert markdown tag in editor
  const insertMarkdown = (prefix, suffix = '') => {
    sound.playTab();
    const textarea = document.getElementById('mod-article-content');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = form.content.substring(start, end) || 'text';
    const replacement = `${prefix}${selectedText}${suffix}`;
    
    const nextContent = form.content.substring(0, start) + replacement + form.content.substring(end);
    setForm({ ...form, content: nextContent });
  };

  // Publish / Save Article
  const handleSaveArticle = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      alert('Please provide an article headline.');
      return;
    }
    if (!form.content.trim()) {
      alert('Please provide article body content.');
      return;
    }

    try {
      if (editingArticleId) {
        await updateNewsArticle(editingArticleId, form);
      } else {
        await publishNewsArticle(form);
      }

      sound.playCelebration();
      burstConfetti();
      
      // Reset form
      setForm({
        title: '',
        category: 'announcement',
        cover_image: '',
        summary: '',
        content: '',
        source_url: '',
        author_name: 'AniTrack Moderator',
        is_pinned: false
      });
      setEditingArticleId(null);
      setActiveTab('manage');
      await loadArticles();
      if (onArticlesUpdated) onArticlesUpdated();
    } catch (err) {
      console.error(err);
      alert('Failed to publish article.');
    }
  };

  // Load article for editing
  const handleEditClick = (art) => {
    sound.playTab();
    setForm({
      title: art.title,
      category: art.category,
      cover_image: art.cover_image,
      summary: art.summary,
      content: art.content,
      source_url: art.source_url,
      author_name: art.author_name || 'AniTrack Moderator',
      is_pinned: art.is_pinned
    });
    setEditingArticleId(art.id);
    setActiveTab('publish');
  };

  // Delete article
  const handleDeleteClick = async (artId, artTitle) => {
    if (window.confirm(`Permanently delete article "${artTitle}"?`)) {
      sound.playSaveSuccess();
      await deleteNewsArticle(artId);
      await loadArticles();
      if (onArticlesUpdated) onArticlesUpdated();
    }
  };

  // Toggle pin
  const handleTogglePin = async (artId, currentPinned) => {
    sound.playTab();
    await togglePinArticle(artId, !currentPinned);
    await loadArticles();
    if (onArticlesUpdated) onArticlesUpdated();
  };

  // Change PIN
  const handleChangePin = (e) => {
    e.preventDefault();
    if (newPinInput.length !== 4 || !/^\d{4}$/.test(newPinInput)) {
      alert('PIN must be exactly 4 numeric digits.');
      return;
    }
    saveModeratorPin(newPinInput);
    sound.playCelebration();
    setPinSuccessMsg(`Moderator PIN updated to ${newPinInput}!`);
    setNewPinInput('');
    setTimeout(() => setPinSuccessMsg(''), 3000);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="card-manga-panel bg-sand-50 dark:bg-sand-200 w-full max-w-2xl max-h-[92vh] rounded-t-2xl sm:rounded-2xl border-2 border-stone-900 shadow-manga-lg overflow-hidden flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="p-3.5 sm:p-4 bg-sand-100 dark:bg-sand-300 border-b-2 border-stone-900 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-amber-400 border border-stone-900 shadow-2xs">
              <ShieldAlert className="w-4 h-4 text-stone-950" />
            </span>
            <div>
              <h2 className="font-display font-black text-sm sm:text-base text-ink-900 uppercase tracking-tight">
                Moderator Studio
              </h2>
              <span className="text-[10px] font-mono text-stone-500 block">
                {isUnlocked ? 'Unlocked • Editorial Mode' : 'Security Verification Required'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {isUnlocked && (
              <button
                onClick={() => {
                  sound.playTab();
                  setIsUnlocked(false);
                  setEnteredPin('');
                }}
                className="p-1.5 rounded-lg border-2 border-stone-900 bg-sand-50 dark:bg-sand-200 text-stone-700 hover:bg-amber-400 hover:text-stone-950 transition-colors shadow-2xs"
                title="Lock Session"
              >
                <Lock className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => { sound.playTab(); onClose(); }}
              className="p-1.5 rounded-lg border-2 border-stone-900 bg-sand-50 dark:bg-sand-200 text-stone-700 hover:bg-rose-500 hover:text-white transition-colors shadow-2xs"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ═══ STATE 1: PIN UNLOCK SCREEN ═══ */}
        {!isUnlocked ? (
          <div className="p-6 text-center space-y-6 flex-grow overflow-y-auto">
            <div className="space-y-2 max-w-xs mx-auto">
              <div className="w-12 h-12 rounded-full bg-amber-400/20 border-2 border-amber-500 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="font-display font-black text-base text-ink-900">
                Enter Moderator PIN
              </h3>
              <p className="text-xs text-stone-500 font-sans">
                Enter your 4-digit master passcode to access the publishing studio.
              </p>
            </div>

            {/* PIN Dots Display */}
            <div className={`flex items-center justify-center gap-3 py-2 ${pinError ? 'animate-shake' : ''}`}>
              {[0, 1, 2, 3].map(idx => (
                <div 
                  key={idx}
                  className={`w-4 h-4 rounded-full border-2 border-stone-900 transition-all ${
                    enteredPin.length > idx 
                      ? 'bg-amber-400 scale-110 shadow-sm' 
                      : 'bg-sand-200 dark:bg-sand-400'
                  }`}
                />
              ))}
            </div>

            {pinError && (
              <p className="text-xs font-mono font-bold text-rose-500 animate-fade-in">
                Incorrect PIN. Please try again.
              </p>
            )}

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-2.5 max-w-[240px] mx-auto select-none">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  key={num}
                  onClick={() => handlePinDigit(String(num))}
                  className="btn-manga bg-sand-100 dark:bg-sand-300 hover:bg-amber-400 hover:text-stone-950 text-ink-900 py-3 rounded-lg text-base font-mono font-black border-2 border-stone-900 shadow-2xs active:scale-95"
                >
                  {num}
                </button>
              ))}
              <button
                onClick={() => setEnteredPin('')}
                className="btn-manga bg-sand-200 dark:bg-sand-400 text-stone-600 text-xs font-mono font-black py-3 rounded-lg border-2 border-stone-900 shadow-2xs"
              >
                Clear
              </button>
              <button
                onClick={() => handlePinDigit('0')}
                className="btn-manga bg-sand-100 dark:bg-sand-300 hover:bg-amber-400 hover:text-stone-950 text-ink-900 py-3 rounded-lg text-base font-mono font-black border-2 border-stone-900 shadow-2xs active:scale-95"
              >
                0
              </button>
              <button
                onClick={handlePinBackspace}
                className="btn-manga bg-sand-200 dark:bg-sand-400 text-stone-600 text-xs font-mono font-black py-3 rounded-lg border-2 border-stone-900 shadow-2xs"
              >
                ⌫
              </button>
            </div>

            <p className="text-[10px] font-mono text-stone-400">
              Default Master PIN: <span className="font-bold text-amber-600 dark:text-amber-400">2600</span>
            </p>
          </div>
        ) : (
          /* ═══ STATE 2: MODERATOR STUDIO CONTROLS ═══ */
          <div className="flex-grow overflow-y-auto flex flex-col">
            
            {/* Top Sub-Nav Tabs */}
            <div className="flex items-center border-b-2 border-stone-900 bg-sand-100/50 dark:bg-sand-300/50 p-2 gap-2 shrink-0">
              <button
                onClick={() => { sound.playTab(); setActiveTab('publish'); }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black transition-all border-2 border-stone-900 flex items-center justify-center gap-1.5 ${
                  activeTab === 'publish'
                    ? 'bg-amber-400 text-stone-950 shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)]'
                    : 'bg-sand-50 dark:bg-sand-200 text-stone-600 hover:bg-sand-100'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{editingArticleId ? 'Edit Article' : 'Post Article'}</span>
              </button>
              <button
                onClick={() => { sound.playTab(); setActiveTab('manage'); }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black transition-all border-2 border-stone-900 flex items-center justify-center gap-1.5 ${
                  activeTab === 'manage'
                    ? 'bg-amber-400 text-stone-950 shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)]'
                    : 'bg-sand-50 dark:bg-sand-200 text-stone-600 hover:bg-sand-100'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Manage ({articles.length})</span>
              </button>
              <button
                onClick={() => { sound.playTab(); setActiveTab('settings'); }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black transition-all border-2 border-stone-900 flex items-center justify-center gap-1.5 ${
                  activeTab === 'settings'
                    ? 'bg-amber-400 text-stone-950 shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)]'
                    : 'bg-sand-50 dark:bg-sand-200 text-stone-600 hover:bg-sand-100'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Security</span>
              </button>
            </div>

            {/* TAB CONTENT */}
            <div className="p-4 sm:p-5 flex-grow overflow-y-auto space-y-4 hide-scrollbar">
              
              {/* ─── TAB 1: ARTICLE PUBLISHER / COMPOSER ─── */}
              {activeTab === 'publish' && (
                <form onSubmit={handleSaveArticle} className="space-y-3.5">
                  
                  {editingArticleId && (
                    <div className="p-2.5 bg-amber-400/15 border-2 border-amber-500 rounded-lg flex items-center justify-between text-xs font-bold text-ink-900">
                      <span>Editing Article: "{form.title.slice(0, 35)}..."</span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingArticleId(null);
                          setForm({
                            title: '', category: 'announcement', cover_image: '', summary: '', content: '', source_url: '', author_name: 'AniTrack Moderator', is_pinned: false
                          });
                        }}
                        className="text-amber-700 dark:text-amber-400 underline font-black"
                      >
                        Cancel Edit
                      </button>
                    </div>
                  )}

                  {/* Headline Title */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-black uppercase text-stone-600 dark:text-stone-300">
                      Headline Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="e.g. Re:Zero Season 3 90-Minute Premiere Broadcast Date Announced"
                      className="w-full p-2.5 bg-sand-100 dark:bg-sand-300 rounded-lg border-2 border-stone-900 text-xs font-bold text-ink-900 focus:outline-none focus:bg-amber-400/10 shadow-inner"
                    />
                  </div>

                  {/* Category & Pinned Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-black uppercase text-stone-600 dark:text-stone-300">
                        Category Tag *
                      </label>
                      <select
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                        className="w-full p-2.5 bg-sand-100 dark:bg-sand-300 rounded-lg border-2 border-stone-900 text-xs font-bold text-ink-900 focus:outline-none shadow-inner"
                      >
                        {CATEGORIES.map(c => (
                          <option key={c.id} value={c.id} className="bg-sand-50 dark:bg-stone-900">{c.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-black uppercase text-stone-600 dark:text-stone-300">
                        Featured / Pinned
                      </label>
                      <label className="flex items-center gap-2 p-2.5 bg-sand-100 dark:bg-sand-300 rounded-lg border-2 border-stone-900 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={form.is_pinned}
                          onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })}
                          className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                        />
                        <span className="text-xs font-bold text-ink-900 flex items-center gap-1">
                          <Pin className="w-3.5 h-3.5 text-amber-500" />
                          Pin to Top Breaking News
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Cover Image URL + Quick Presets */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-black uppercase text-stone-600 dark:text-stone-300">
                      Cover Image URL
                    </label>
                    <input
                      type="url"
                      value={form.cover_image}
                      onChange={(e) => setForm({ ...form, cover_image: e.target.value })}
                      placeholder="https://... (Direct Image URL)"
                      className="w-full p-2.5 bg-sand-100 dark:bg-sand-300 rounded-lg border-2 border-stone-900 text-xs font-mono text-ink-900 focus:outline-none shadow-inner"
                    />

                    {/* Quick Image Presets */}
                    <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar py-0.5">
                      <span className="text-[10px] font-mono text-stone-500 shrink-0">Presets:</span>
                      {PRESET_COVERS.map((preset, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => setForm({ ...form, cover_image: preset.url })}
                          className="shrink-0 px-2 py-0.5 bg-sand-200 dark:bg-sand-400 rounded text-[9px] font-bold text-stone-700 dark:text-stone-200 border border-stone-900/30 hover:border-amber-500"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    {/* Image Preview Thumbnail */}
                    {form.cover_image && (
                      <div className="relative aspect-[16/9] w-full max-w-xs rounded-lg overflow-hidden border-2 border-stone-900 shadow-sm mt-1 bg-sand-300">
                        <img src={form.cover_image} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>

                  {/* Summary / Teaser */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-black uppercase text-stone-600 dark:text-stone-300">
                      Summary Teaser (1-2 Sentences)
                    </label>
                    <input
                      type="text"
                      value={form.summary}
                      onChange={(e) => setForm({ ...form, summary: e.target.value })}
                      placeholder="Short synopsis displayed on feed cards..."
                      className="w-full p-2.5 bg-sand-100 dark:bg-sand-300 rounded-lg border-2 border-stone-900 text-xs font-bold text-ink-900 focus:outline-none shadow-inner"
                    />
                  </div>

                  {/* Markdown Content Editor with Toolbar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black uppercase text-stone-600 dark:text-stone-300">
                        Article Body (Markdown Supported) *
                      </label>
                      <button
                        type="button"
                        onClick={() => setPreviewMode(!previewMode)}
                        className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 underline"
                      >
                        {previewMode ? 'Edit Markdown' : 'Preview Format'}
                      </button>
                    </div>

                    {/* Fast Markdown Toolbar */}
                    <div className="flex items-center gap-1 bg-sand-100 dark:bg-sand-300 p-1 rounded-t-lg border-2 border-b-0 border-stone-900">
                      <button
                        type="button"
                        onClick={() => insertMarkdown('**', '**')}
                        className="p-1 rounded hover:bg-amber-400 hover:text-stone-950 text-stone-700 dark:text-stone-300 text-xs font-black"
                        title="Bold"
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertMarkdown('*', '*')}
                        className="p-1 rounded hover:bg-amber-400 hover:text-stone-950 text-stone-700 dark:text-stone-300 text-xs"
                        title="Italic"
                      >
                        <Italic className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertMarkdown('### ')}
                        className="p-1 rounded hover:bg-amber-400 hover:text-stone-950 text-stone-700 dark:text-stone-300 text-xs font-black"
                        title="Heading"
                      >
                        <Heading className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertMarkdown('* ')}
                        className="p-1 rounded hover:bg-amber-400 hover:text-stone-950 text-stone-700 dark:text-stone-300 text-xs"
                        title="Bullet list"
                      >
                        <List className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertMarkdown('> ')}
                        className="p-1 rounded hover:bg-amber-400 hover:text-stone-950 text-stone-700 dark:text-stone-300 text-xs"
                        title="Quote"
                      >
                        <Quote className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertMarkdown('[Link Title](', ')')}
                        className="p-1 rounded hover:bg-amber-400 hover:text-stone-950 text-stone-700 dark:text-stone-300 text-xs"
                        title="Insert link"
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {!previewMode ? (
                      <textarea
                        id="mod-article-content"
                        required
                        rows={7}
                        value={form.content}
                        onChange={(e) => setForm({ ...form, content: e.target.value })}
                        placeholder="Write full article news content here with markdown headings, bullet points, quotes..."
                        className="w-full p-2.5 bg-sand-100 dark:bg-sand-300 rounded-b-lg border-2 border-stone-900 text-xs font-mono text-ink-900 focus:outline-none shadow-inner"
                      />
                    ) : (
                      <div className="w-full p-3 bg-sand-100 dark:bg-sand-300 rounded-b-lg border-2 border-stone-900 text-xs text-ink-900 min-h-[140px] whitespace-pre-wrap">
                        {form.content || '(Empty content preview)'}
                      </div>
                    )}
                  </div>

                  {/* External Source URL */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-black uppercase text-stone-600 dark:text-stone-300">
                      External Source Link (Optional)
                    </label>
                    <input
                      type="url"
                      value={form.source_url}
                      onChange={(e) => setForm({ ...form, source_url: e.target.value })}
                      placeholder="https://twitter.com/official_anime..."
                      className="w-full p-2.5 bg-sand-100 dark:bg-sand-300 rounded-lg border-2 border-stone-900 text-xs font-mono text-ink-900 focus:outline-none shadow-inner"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="btn-manga bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs sm:text-sm font-black w-full py-3 rounded-lg border-2 border-stone-900 shadow-manga flex items-center justify-center gap-2 select-none active:translate-y-0.5"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{editingArticleId ? 'Save & Update Article' : 'Publish News Story Live'}</span>
                  </button>
                </form>
              )}

              {/* ─── TAB 2: ARTICLE MANAGER ─── */}
              {activeTab === 'manage' && (
                <div className="space-y-3">
                  {articles.length === 0 ? (
                    <div className="p-8 text-center bg-sand-100 dark:bg-sand-300 rounded-lg border-2 border-stone-900 text-xs text-stone-500">
                      No published articles found. Create your first post in the Post Article tab!
                    </div>
                  ) : (
                    articles.map(art => (
                      <div
                        key={art.id}
                        className="p-3 bg-sand-100 dark:bg-sand-300 rounded-lg border-2 border-stone-900 shadow-2xs flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img 
                            src={art.cover_image} 
                            alt="" 
                            className="w-12 h-12 rounded object-cover border border-stone-900 shrink-0 bg-sand-200" 
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              {art.is_pinned && (
                                <span className="bg-amber-400 text-stone-950 text-[8px] font-black uppercase px-1 rounded border border-stone-900">
                                  Pinned
                                </span>
                              )}
                              <span className="text-[8px] font-mono font-bold uppercase text-stone-500">
                                {art.category}
                              </span>
                            </div>
                            <h4 className="font-display font-black text-xs text-ink-900 truncate">
                              {art.title}
                            </h4>
                            <span className="text-[10px] font-mono text-stone-500">
                              {new Date(art.created_at).toLocaleDateString()} • {art.views_count || 0} reads
                            </span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleTogglePin(art.id, art.is_pinned)}
                            className={`p-1.5 rounded border border-stone-900 ${art.is_pinned ? 'bg-amber-400 text-stone-950' : 'bg-sand-50 text-stone-600'}`}
                            title={art.is_pinned ? 'Unpin' : 'Pin to top'}
                          >
                            <Pin className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleEditClick(art)}
                            className="p-1.5 rounded border border-stone-900 bg-sand-50 text-stone-600 hover:bg-amber-400 hover:text-stone-950"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(art.id, art.title)}
                            className="p-1.5 rounded border border-stone-900 bg-sand-50 text-rose-500 hover:bg-rose-500 hover:text-white"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ─── TAB 3: SECURITY SETTINGS ─── */}
              {activeTab === 'settings' && (
                <div className="p-4 bg-sand-100 dark:bg-sand-300 rounded-lg border-2 border-stone-900 space-y-4">
                  <h3 className="font-display font-black text-sm text-ink-900 uppercase">
                    Change Moderator Master PIN
                  </h3>
                  <form onSubmit={handleChangePin} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
                        New 4-Digit Passcode:
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        value={newPinInput}
                        onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ''))}
                        placeholder="e.g. 2600"
                        className="p-2.5 bg-sand-50 dark:bg-stone-900 rounded-lg border-2 border-stone-900 text-xs font-mono tracking-widest text-ink-900 w-36 text-center text-lg font-black"
                      />
                    </div>
                    <button
                      type="submit"
                      className="btn-manga bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-black px-4 py-2 rounded-lg border-2 border-stone-900 shadow-2xs"
                    >
                      Update Passcode
                    </button>
                    {pinSuccessMsg && (
                      <p className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ✓ {pinSuccessMsg}
                      </p>
                    )}
                  </form>
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
