import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Send, Sparkles, Users, UserPlus } from 'lucide-react';

import DashboardLayout from '../components/DashboardLayout';
import { getStoredSession } from '../hooks/useAuth';
import { apiFetch } from '../services/api';

const renderMarkdownLite = (text) =>
  text.split('\n').map((line, index, lines) => (
    <React.Fragment key={`${line}-${index}`}>
      {line}
      {index < lines.length - 1 && <br />}
    </React.Fragment>
  ));

const TypingIndicator = () => (
  <div className="mb-4 flex justify-start">
    <div className="flex max-w-xs items-end gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg">
        <Bot size={14} className="text-white" />
      </div>
      <div className="rounded-2xl rounded-bl-sm border border-slate-100 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400" style={{ animationDelay: '150ms' }} />
          <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  </div>
);

const AI = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [membership, setMembership] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const bottomRef = useRef(null);

  const session = getStoredSession();
  const currentUserName = session?.user?.name || 'User';
  const initials = currentUserName
    .split(' ')
    .map((token) => token[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const membershipApproved = membership?.join_status === 'approved';
  const isAdmin = membershipApproved && membership?.role === 'admin';

  const quickPrompts = useMemo(() => {
    if (!membershipApproved) {
      return [];
    }

    if (isAdmin) {
      return [
        'Give me an overview of the group.',
        'How many membership requests are pending?',
        'How many loan requests are pending?',
        'Who currently has active loans?',
        'What is our group balance?',
      ];
    }

    return [
      'How much do I still owe?',
      'Can I afford a loan?',
      'What group am I in?',
      'What is my wallet balance?',
      'Show my recent transactions',
    ];
  }, [isAdmin, membershipApproved]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    const loadMembership = async () => {
      setPageLoading(true);
      try {
        const membershipResponse = await apiFetch('/groups/my-membership');
        setMembership(membershipResponse.membership);
      } finally {
        setPageLoading(false);
      }
    };

    loadMembership();
  }, []);

  const sendMessage = async (text) => {
    if (!membershipApproved) {
      return;
    }

    const content = text || input.trim();
    if (!content) return;

    setInput('');
    setStarted(true);
    setMessages((current) => [...current, { role: 'user', content, ts: new Date() }]);
    setLoading(true);

    try {
      const response = await apiFetch('/assistant/chat', {
        method: 'POST',
        body: JSON.stringify({ message: content }),
      });
      setMessages((current) => [...current, { role: 'bot', content: response.response, ts: new Date() }]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: 'bot',
          content: 'I could not reach the assistant service right now. Check that the backend is running and your session is valid.',
          ts: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date) => date.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });

  const renderBlockedState = () => {
    const pending = membership?.join_status === 'pending';

    return (
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-2xl rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-xl shadow-orange-500/20">
            {pending ? <Users size={34} className="text-white" /> : <UserPlus size={34} className="text-white" />}
          </div>
          <h2 className="mt-6 text-2xl font-black text-slate-900">
            {pending ? 'Waiting for group approval' : 'Join a group to use the assistant'}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500">
            {pending
              ? 'This assistant is scoped to approved membership data. Once your admin approves the request, you can ask about savings, loans, repayments, approvals, and group balance.'
              : 'The assistant only works against an approved group membership. Join a group first so it can answer using your savings, loan, and repayment records.'}
          </p>
          <button
            onClick={() => navigate('/groups')}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            <Users size={16} />
            Open groups
          </button>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-0px)] flex-col overflow-hidden bg-slate-50">
        <div className="flex flex-shrink-0 items-center gap-4 border-b border-slate-100 bg-white px-6 py-4 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-500/25">
            <Bot size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900">MicroSave Assistant</h1>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              <p className="text-xs font-medium text-slate-400">
                {membershipApproved
                  ? `${membership?.group_name} | ${isAdmin ? 'Admin' : 'Member'} context`
                  : 'Approval required'}
              </p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {membershipApproved && (
              <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                {membership?.group_name}
              </span>
            )}
            <span className="flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
              <Sparkles size={11} />
              Smart AI
            </span>
          </div>
        </div>

        {pageLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          </div>
        ) : !membershipApproved ? (
          renderBlockedState()
        ) : (
          <>
            <div className="flex-1 space-y-2 overflow-y-auto px-4 py-6">
              {!started && (
                <div className="flex h-full flex-col items-center justify-center px-6 pb-8 text-center">
                  <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-2xl shadow-emerald-500/30">
                    <Bot size={36} className="text-white" />
                  </div>
                  <h2 className="mb-2 text-2xl font-black text-slate-900">Hello, {currentUserName.split(' ')[0]}</h2>
                  <p className="mb-3 max-w-sm font-medium leading-relaxed text-slate-500">
                    {isAdmin
                      ? 'Ask for approval workload, active loans, group balance, or an admin overview.'
                      : 'Ask about loan eligibility, outstanding debt, savings, wallet balance, or recent activity.'}
                  </p>
                  <p className="mb-8 text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
                    {membership.group_name} | {isAdmin ? 'Admin' : 'Member'}
                  </p>
                  <div className="flex max-w-2xl flex-wrap justify-center gap-2">
                    {quickPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => sendMessage(prompt)}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message, index) =>
                message.role === 'user' ? (
                  <div key={index} className="mb-4 flex justify-end">
                    <div className="flex max-w-xs items-end gap-2 lg:max-w-md">
                      <div className="flex flex-col items-end">
                        <div className="rounded-2xl rounded-br-sm bg-emerald-500 px-4 py-2.5 text-white shadow-lg shadow-emerald-500/20">
                          <p className="text-sm leading-relaxed">{message.content}</p>
                        </div>
                        <p className="mr-1 mt-1 text-[10px] text-slate-400">{formatTime(message.ts)}</p>
                      </div>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-xs font-black text-white shadow">
                        {initials}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div key={index} className="mb-4 flex justify-start">
                    <div className="flex max-w-xs items-end gap-2 lg:max-w-xl">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg">
                        <Bot size={14} className="text-white" />
                      </div>
                      <div className="flex flex-col">
                        <div className="rounded-2xl rounded-bl-sm border border-slate-100 bg-white px-4 py-3 shadow-sm">
                          <p className="text-sm leading-relaxed text-slate-800">{renderMarkdownLite(message.content)}</p>
                        </div>
                        <p className="ml-1 mt-1 text-[10px] text-slate-400">{formatTime(message.ts)}</p>
                      </div>
                    </div>
                  </div>
                )
              )}

              {loading && <TypingIndicator />}
              <div ref={bottomRef} />
            </div>

            <div className="flex-shrink-0 border-t border-slate-100 bg-white px-4 py-4 shadow-lg">
              {started && messages.length > 0 && messages.length < 4 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {quickPrompts.slice(0, 3).map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => sendMessage(prompt)}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  sendMessage();
                }}
                className="flex items-center gap-3"
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-xs font-black text-white shadow">
                  {initials}
                </div>
                <div className="flex flex-1 items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2.5 transition focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-400">
                  <input
                    type="text"
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder={isAdmin ? 'Ask about approvals, group balance, or active loans...' : 'Ask about your wallet, savings, or loans...'}
                    className="flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                    disabled={loading}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-600 disabled:opacity-40"
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AI;
