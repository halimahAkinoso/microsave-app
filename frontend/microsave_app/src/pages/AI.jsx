import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Send, Bot, Sparkles, User } from 'lucide-react';

const API = 'http://localhost:8000';

const QUICK_PROMPTS = [
  "What is my loan balance?",
  "Show my contributions",
  "What group am I in?",
  "How do I fund my wallet?",
  "Show my recent transactions",
];

// Render lightweight markdown: **bold** and newlines
function renderMd(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part.split('\n').map((line, j) => (
      <React.Fragment key={`${i}-${j}`}>
        {line}{j < part.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  });
}

const TypingIndicator = () => (
  <div className="flex justify-start mb-4">
    <div className="flex items-end gap-2 max-w-xs">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0 shadow-lg">
        <Bot size={14} className="text-white" />
      </div>
      <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  </div>
);

const AI = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const bottomRef = useRef(null);

  const currentUserId = Number(localStorage.getItem('user_id')) || 1;
  const currentUserName = localStorage.getItem('user_name') || 'User';
  const initials = currentUserName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const userMsg = text || input.trim();
    if (!userMsg) return;
    setInput('');
    setStarted(true);

    setMessages(prev => [...prev, { role: 'user', content: userMsg, ts: new Date() }]);
    setLoading(true);

    try {
      const res = await fetch(`${API}/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUserId, message: userMsg }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'bot', content: data.response, ts: new Date() }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'bot',
        content: "Sorry, I couldn't connect to the server. Please make sure the backend is running.",
        ts: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage();
  };

  const fmt = (d) => d.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-0px)] overflow-hidden bg-slate-50">

        {/* Header */}
        <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center gap-4 flex-shrink-0 shadow-sm">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <Bot size={22} className="text-white" />
          </div>
          <div>
            <h1 className="font-black text-slate-900 text-lg">MicroSave AI Assistant</h1>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <p className="text-xs text-slate-400 font-medium">Online • Knows your personal data</p>
            </div>
          </div>
          <div className="ml-auto">
            <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-100 flex items-center gap-1">
              <Sparkles size={11} /> Smart AI
            </span>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-2">

          {/* Welcome state */}
          {!started && (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 pb-8">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-2xl shadow-emerald-500/30 mb-6">
                <Bot size={36} className="text-white" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">Hello, {currentUserName.split(' ')[0]}! 👋</h2>
              <p className="text-slate-500 font-medium mb-8 max-w-sm leading-relaxed">
                I'm your personal finance assistant. I know your loans, savings, and group data. Ask me anything!
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {QUICK_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => sendMessage(p)}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 transition-all shadow-sm"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat messages */}
          {messages.map((msg, i) => (
            msg.role === 'user' ? (
              <div key={i} className="flex justify-end mb-4">
                <div className="flex items-end gap-2 max-w-xs lg:max-w-md">
                  <div className="flex flex-col items-end">
                    <div className="bg-emerald-500 text-white px-4 py-2.5 rounded-2xl rounded-br-sm shadow-lg shadow-emerald-500/20">
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 mr-1">{fmt(msg.ts)}</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center flex-shrink-0 text-white text-xs font-black shadow">
                    {initials}
                  </div>
                </div>
              </div>
            ) : (
              <div key={i} className="flex justify-start mb-4">
                <div className="flex items-end gap-2 max-w-xs lg:max-w-lg xl:max-w-2xl">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Bot size={14} className="text-white" />
                  </div>
                  <div className="flex flex-col">
                    <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                      <p className="text-sm text-slate-800 leading-relaxed">{renderMd(msg.content)}</p>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 ml-1">{fmt(msg.ts)}</p>
                  </div>
                </div>
              </div>
            )
          ))}

          {loading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="bg-white border-t border-slate-100 px-4 py-4 flex-shrink-0 shadow-lg">
          {/* Quick prompts after chat started */}
          {started && messages.length > 0 && messages.length < 4 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {QUICK_PROMPTS.slice(0, 3).map((p) => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 transition-all"
                >
                  {p}
                </button>
              ))}
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white text-xs font-black flex-shrink-0 shadow">
              {initials}
            </div>
            <div className="flex-1 flex items-center gap-2 bg-slate-100 rounded-2xl px-4 py-2.5 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-400 transition-all">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask me about your loans, savings, groups…"
                className="flex-1 bg-transparent outline-none text-sm text-slate-800 placeholder-slate-400"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="w-10 h-10 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-2xl flex items-center justify-center transition-all shadow-lg shadow-emerald-500/25 flex-shrink-0"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AI;
