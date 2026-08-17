import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, MessageSquare, Bot } from 'lucide-react';

const QUICK_PILLS = [
  { label: 'Dark Fantasy', msg: 'Recommend 3 dark fantasy anime with high stakes and gritty fights.' },
  { label: 'After AoT?', msg: 'What should I watch if I loved Attack on Titan and Vinland Saga?' },
  { label: 'Hidden Gem', msg: 'Give me 1 truly underrated anime that most people haven’t seen.' },
  { label: 'Wholesome', msg: 'Recommend something cozy and wholesome with zero stress.' }
];

export default function LeviChatDrawer({ isOpen, onClose }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Listen up, cadet. I’m Captain Levi. Ask me for recommendations or advice on what to watch next. Don't waste my time with garbage."
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (!isOpen) return null;

  const handleSend = async (textToSend) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const userMsg = { role: 'user', content: query.trim() };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map(m => ({ role: m.role, content: m.content }))
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.reply) {
          setMessages([...nextMessages, { role: 'assistant', content: data.reply }]);
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn("API Chat failed, using persona fallback:", e);
    }

    // Persona fallback if server is offline
    setTimeout(() => {
      let reply = "Hmph. If you want something genuinely worthwhile, watch Vinland Saga or Monster. Keep your room clean and don't skip episodes.";
      if (query.toLowerCase().includes('underrated') || query.toLowerCase().includes('gem')) {
        reply = "Watch 'Claymore' or 'Dororo'. Both have relentless action and disciplined characters. Go watch them now.";
      } else if (query.toLowerCase().includes('wholesome') || query.toLowerCase().includes('cozy')) {
        reply = "Try 'Mushishi' or 'Laid-Back Camp'. Peaceful, methodical, and keeps your mind clear.";
      }
      setMessages([...nextMessages, { role: 'assistant', content: reply }]);
      setLoading(false);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full sm:w-[420px] h-full bg-sand-50 dark:bg-sand-100 border-l-2 border-stone-900 shadow-2xl flex flex-col justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b-2 border-stone-900 bg-sand-100 dark:bg-sand-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-stone-900 overflow-hidden bg-navy-900 shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)]">
              <img 
                src="/assets/images/levi-avatar.webp" 
                alt="Captain Levi" 
                className="w-full h-full object-cover"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
            <div>
              <h2 className="font-display font-black text-base text-ink-900 leading-tight">
                Captain Levi
              </h2>
              <p className="text-[11px] text-stone-500 font-sans">
                Scout Regiment · Anime Advisor AI
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-md border-2 border-stone-900 bg-sand-50 dark:bg-sand-300 text-ink-900 hover:bg-amber-400 active:translate-y-0.5 shadow-[1.5px_1.5px_0px_0px_rgba(24,19,13,1)]"
            title="Close Assistant"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Chat Message Stream */}
        <div className="p-4 flex-grow overflow-y-auto space-y-3.5 hide-scrollbar">
          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            return (
              <div 
                key={idx} 
                className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-full border border-stone-900 overflow-hidden bg-navy-900 shrink-0 mt-0.5">
                    <img 
                      src="/assets/images/levi-avatar.webp" 
                      alt="Levi" 
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                )}

                <div 
                  className={`max-w-[82%] p-3 rounded-lg text-xs leading-relaxed font-sans ${
                    isUser
                      ? 'bg-amber-400 text-ink-900 font-bold border-2 border-stone-900 shadow-[2px_2px_0px_0px_rgba(24,19,13,1)]'
                      : 'bg-sand-100 dark:bg-sand-200 text-ink-900 border-2 border-stone-900 shadow-[2px_2px_0px_0px_rgba(24,19,13,0.3)]'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-2.5 items-center">
              <div className="w-7 h-7 rounded-full border border-stone-900 overflow-hidden bg-navy-900 shrink-0">
                <img src="/assets/images/levi-avatar.webp" alt="Levi" className="w-full h-full object-cover" />
              </div>
              <div className="p-3 bg-sand-100 dark:bg-sand-200 border-2 border-stone-900 rounded-lg flex gap-1 items-center">
                <span className="scout-dot" />
                <span className="scout-dot" style={{ animationDelay: '0.2s' }} />
                <span className="scout-dot" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Actions & Input */}
        <div className="p-3 bg-sand-100 dark:bg-sand-200 border-t-2 border-stone-900 space-y-2.5">
          
          {/* Quick Prompt Pills */}
          <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-1">
            {QUICK_PILLS.map((pill, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(pill.msg)}
                className="shrink-0 px-2.5 py-1 text-[11px] font-bold rounded-full bg-sand-50 dark:bg-sand-300 text-ink-900 border border-stone-900 hover:bg-amber-300 active:scale-95 transition-all shadow-[1px_1px_0px_0px_rgba(24,19,13,1)]"
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* Text Input */}
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Levi for advice or recommendations..."
              disabled={loading}
              className="flex-grow px-3 py-2 bg-sand-50 dark:bg-sand-300 border-2 border-stone-900 rounded font-sans text-xs text-ink-900 focus:outline-none focus:ring-1 focus:ring-amber-400 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="btn-manga bg-amber-400 hover:bg-amber-300 text-ink-900 px-3 py-2 rounded flex items-center justify-center disabled:opacity-50"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
