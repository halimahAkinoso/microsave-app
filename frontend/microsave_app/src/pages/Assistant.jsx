import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquare, RefreshCw, Send, Users } from 'lucide-react';

import DashboardLayout from '../components/DashboardLayout';
import { getStoredSession } from '../hooks/useAuth';
import { apiFetch } from '../services/api';

const Chat = () => {
  const session = getStoredSession();
  const currentUserId = session?.user?.id;
  const currentUserName = session?.user?.name || 'User';

  const [membership, setMembership] = useState(null);
  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loadingMembership, setLoadingMembership] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);
  const pollRef = useRef(null);
  const messagesRef = useRef([]);
  const viewportRef = useRef(null);
  const stickToBottomRef = useRef(true);

  const isApprovedMember = membership?.join_status === 'approved' && group;
  const initials = useMemo(
    () =>
      currentUserName
        .split(' ')
        .map((part) => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2),
    [currentUserName]
  );

  const scrollToBottom = (behavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior });
  };

  const mergeMessages = (currentMessages, incomingMessages) => {
    if (!incomingMessages.length) {
      return currentMessages;
    }
    const merged = [...currentMessages];
    const existingIds = new Set(currentMessages.map((message) => message.id));
    incomingMessages.forEach((message) => {
      if (!existingIds.has(message.id)) {
        merged.push(message);
      }
    });
    return merged;
  };

  const loadMessages = async (groupId, { incremental = false, manual = false } = {}) => {
    if (manual) {
      setRefreshing(true);
    } else if (!incremental) {
      setLoadingMessages(true);
    }
    if (!incremental) {
      setError('');
    }

    try {
      const latestMessageId = messagesRef.current.at(-1)?.id;
      const query = incremental && latestMessageId ? `?after_id=${latestMessageId}` : '';
      const data = await apiFetch(`/chat/${groupId}/messages${query}`);
      const nextMessages = Array.isArray(data) ? data : [];
      setMessages((current) => {
        const updated = incremental ? mergeMessages(current, nextMessages) : nextMessages;
        messagesRef.current = updated;
        return updated;
      });
      if (!incremental || nextMessages.length > 0) {
        stickToBottomRef.current = true;
      }
    } catch (err) {
      if (!incremental) {
        setError(err.message || 'Could not load group messages.');
      }
    } finally {
      if (manual) {
        setRefreshing(false);
      } else if (!incremental) {
        setLoadingMessages(false);
      }
    }
  };

  useEffect(() => {
    let active = true;

    const loadMembership = async () => {
      setLoadingMembership(true);
      setError('');
      try {
        const data = await apiFetch('/groups/my-membership');
        if (!active) {
          return;
        }
        setMembership(data.membership || null);
        setGroup(data.group || null);
      } catch (err) {
        if (active) {
          setError(err.message || 'Could not load your group membership.');
        }
      } finally {
        if (active) {
          setLoadingMembership(false);
        }
      }
    };

    loadMembership();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isApprovedMember) {
      setMessages([]);
      messagesRef.current = [];
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
      return undefined;
    }

    loadMessages(group.id);
    pollRef.current = setInterval(() => {
      loadMessages(group.id, { incremental: true });
    }, 4000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [group?.id, isApprovedMember]);

  useEffect(() => {
    if (stickToBottomRef.current) {
      scrollToBottom(messages.length > 0 ? 'smooth' : 'auto');
    }
  }, [messages, loadingMessages]);

  const handleViewportScroll = () => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    const distanceFromBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 120;
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!isApprovedMember || !input.trim()) {
      return;
    }

    const content = input.trim();
    setInput('');
    setSending(true);
    setError('');

    try {
      const newMessage = await apiFetch(`/chat/${group.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
      stickToBottomRef.current = true;
      setMessages((current) => {
        const updated = mergeMessages(current, [newMessage]);
        messagesRef.current = updated;
        return updated;
      });
    } catch (err) {
      setError(err.message || 'Could not send your message.');
      setInput(content);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) {
      return '';
    }
    return new Date(isoString).toLocaleTimeString('en-NG', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (isoString) => {
    if (!isoString) {
      return '';
    }

    const date = new Date(isoString);
    const today = new Date();
    const midnightToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const midnightDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.round((midnightToday - midnightDate) / 86400000);

    if (diffDays === 0) {
      return 'Today';
    }
    if (diffDays === 1) {
      return 'Yesterday';
    }

    return date.toLocaleDateString('en-NG', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const groupedMessages = messages.reduce((accumulator, message) => {
    const dateKey = formatDate(message.created_at);
    if (!accumulator[dateKey]) {
      accumulator[dateKey] = [];
    }
    accumulator[dateKey].push(message);
    return accumulator;
  }, {});

  const renderEmptyState = () => {
    if (loadingMembership) {
      return (
        <div className="flex flex-1 items-center justify-center text-slate-400">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        </div>
      );
    }

    if (membership?.join_status === 'pending') {
      return (
        <div className="flex flex-1 items-center justify-center px-6 text-center text-slate-500">
          <div>
            <MessageSquare size={42} className="mx-auto mb-4 opacity-30" />
            <h2 className="text-lg font-black text-slate-900">Chat unlocks after approval</h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed">
              Your request to join {membership.group_name || 'this group'} is still pending. The admin
              must approve your membership before you can access the community chat.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-1 items-center justify-center px-6 text-center text-slate-500">
        <div>
          <MessageSquare size={42} className="mx-auto mb-4 opacity-30" />
          <h2 className="text-lg font-black text-slate-900">No active group chat</h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed">
            Join or create a group first. Chat is available only to approved members of a group.
          </p>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-0px)] overflow-hidden bg-slate-50">
        <aside className="hidden w-80 flex-shrink-0 border-r border-slate-100 bg-white lg:flex lg:flex-col">
          <div className="border-b border-slate-100 px-5 py-5">
            <h2 className="text-lg font-black text-slate-900">Community Chat</h2>
            <p className="mt-1 text-xs text-slate-400">Your current group messaging space</p>
          </div>

          <div className="flex-1 px-5 py-5">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Membership</p>
              <h3 className="mt-3 text-xl font-black text-slate-900">
                {group?.name || membership?.group_name || 'No active group'}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                {group?.description ||
                  (membership?.join_status === 'pending'
                    ? 'Waiting for admin approval before chat access is enabled.'
                    : 'You need an approved membership before messages are available.')}
              </p>

              <div className="mt-5 space-y-3 text-sm text-slate-600">
                <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                  <span>Status</span>
                  <span className="font-bold capitalize text-slate-900">
                    {membership?.join_status || 'none'}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                  <span>Role</span>
                  <span className="font-bold capitalize text-slate-900">
                    {membership?.role || 'member'}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                  <span>Members</span>
                  <span className="font-bold text-slate-900">{group?.member_count ?? 0}</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {!isApprovedMember ? (
            renderEmptyState()
          ) : (
            <>
              <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500 text-lg font-black text-white">
                    {group.name.charAt(0)}
                  </div>
                  <div>
                    <h1 className="text-lg font-black text-slate-900">{group.name}</h1>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Users size={12} />
                      <span>
                        {group.member_count} members
                        {group.admin_name ? ` | Admin: ${group.admin_name}` : ''}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => loadMessages(group.id, { manual: true })}
                  className="rounded-2xl p-2 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600"
                >
                  <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                </button>
              </div>

              {error ? (
                <div className="border-b border-rose-100 bg-rose-50 px-6 py-3 text-sm font-medium text-rose-700">
                  {error}
                </div>
              ) : null}

              <div
                ref={viewportRef}
                onScroll={handleViewportScroll}
                className="flex-1 overflow-y-auto px-4 py-5 sm:px-6"
              >
                {loadingMessages ? (
                  <div className="flex justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
                  </div>
                ) : null}

                {!loadingMessages &&
                  Object.entries(groupedMessages).map(([date, dayMessages]) => (
                    <div key={date} className="mb-6">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="h-px flex-1 bg-slate-200" />
                        <span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 shadow-sm">
                          {date}
                        </span>
                        <div className="h-px flex-1 bg-slate-200" />
                      </div>

                      {dayMessages.map((message) => {
                        const isCurrentUser = message.sender_id === currentUserId;
                        return (
                          <div
                            key={message.id}
                            className={`mb-3 flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`flex max-w-xs flex-col lg:max-w-md ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                              {!isCurrentUser ? (
                                <p className="mb-1 ml-1 text-[11px] font-bold text-slate-500">
                                  {message.sender_name}
                                </p>
                              ) : null}
                              <div
                                className={`rounded-2xl px-4 py-2.5 shadow-sm ${
                                  isCurrentUser
                                    ? 'rounded-br-sm bg-emerald-500 text-white'
                                    : 'rounded-bl-sm border border-slate-100 bg-white text-slate-800'
                                }`}
                              >
                                <p className="text-sm leading-relaxed">{message.content}</p>
                              </div>
                              <p className="mt-1 px-1 text-[10px] text-slate-400">
                                {formatTime(message.created_at)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}

                {!loadingMessages && messages.length === 0 ? (
                  <div className="py-16 text-center text-slate-400">
                    <MessageSquare size={34} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-semibold text-slate-500">
                      No messages yet. Start the conversation for {group.name}.
                    </p>
                  </div>
                ) : null}

                <div ref={bottomRef} />
              </div>

              <div className="flex-shrink-0 border-t border-slate-100 bg-white px-4 py-4 sm:px-6">
                <form onSubmit={sendMessage} className="flex items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-black text-white">
                    {initials}
                  </div>

                  <div className="flex flex-1 items-center rounded-2xl bg-slate-100 px-4 py-2.5 transition focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-400">
                    <input
                      type="text"
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      placeholder={`Message ${group.name}...`}
                      className="flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                      disabled={sending}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!input.trim() || sending}
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-600 disabled:opacity-40"
                  >
                    <Send size={16} />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Chat;
