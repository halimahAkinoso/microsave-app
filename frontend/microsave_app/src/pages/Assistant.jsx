import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Send, MessageSquare, Users, RefreshCw } from 'lucide-react';
import { API_BASE_URL as API } from '../services/api';


const Chat = () => {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);

  const currentUserId = Number(localStorage.getItem('user_id')) || 1;
  const currentUserName = localStorage.getItem('user_name') || 'User';

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  // Load groups this user is part of
  useEffect(() => {
    fetch(`${API}/groups`)
      .then(r => r.json())
      .then(data => {
        setGroups(data);
        if (data.length > 0) setSelectedGroup(data[0]);
      });
  }, []);

  // Load messages & poll every 3s
  const loadMessages = async (groupId) => {
    try {
      const data = await fetch(`${API}/chat/${groupId}/messages`).then(r => r.json());
      setMessages(data);
    } catch (e) {}
  };

  useEffect(() => {
    if (!selectedGroup) return;
    setLoading(true);
    loadMessages(selectedGroup.id).finally(() => setLoading(false));

    // Poll every 3 seconds
    pollRef.current = setInterval(() => loadMessages(selectedGroup.id), 3000);
    return () => clearInterval(pollRef.current);
  }, [selectedGroup]);

  useEffect(() => scrollToBottom(), [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !selectedGroup) return;
    setSending(true);
    const content = input.trim();
    setInput('');
    try {
      const res = await fetch(`${API}/chat/${selectedGroup.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender_id: currentUserId, content }),
      });
      const newMsg = await res.json();
      setMessages(prev => [...prev, newMsg]);
    } finally { setSending(false); }
  };

  const formatTime = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const today = new Date();
    const diff = Math.floor((today - d) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    return d.toLocaleDateString('en-NG', { day: '2-digit', month: 'short' });
  };

  // Group messages by date
  const messagesByDate = messages.reduce((acc, m) => {
    const dateKey = formatDate(m.created_at);
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(m);
    return acc;
  }, {});

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-0px)] overflow-hidden">

        {/* Group List Sidebar */}
        <div className="w-72 bg-white border-r border-slate-100 flex flex-col flex-shrink-0">
          <div className="px-5 py-5 border-b border-slate-100">
            <h2 className="text-lg font-black text-slate-900">Group Chats</h2>
            <p className="text-xs text-slate-400 mt-0.5">Select a group to view messages</p>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {groups.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-8">No groups available.</p>
            )}
            {groups.map(g => {
              const isSelected = selectedGroup?.id === g.id;
              return (
                <button key={g.id} onClick={() => setSelectedGroup(g)}
                  className={`w-full flex items-center gap-3 px-5 py-3.5 transition-all text-left ${
                    isSelected ? 'bg-emerald-50 border-r-4 border-emerald-500' : 'hover:bg-slate-50'
                  }`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 ${
                    isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {g.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold truncate ${isSelected ? 'text-emerald-700' : 'text-slate-800'}`}>{g.name}</p>
                    <p className="text-xs text-slate-400 truncate">{g.member_count} members</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selectedGroup ? (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              <div className="text-center">
                <MessageSquare size={48} className="mx-auto mb-3 opacity-20" />
                <p className="font-semibold">Select a group to start chatting</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-black">
                    {selectedGroup.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900">{selectedGroup.name}</h3>
                    <div className="flex items-center gap-1">
                      <Users size={11} className="text-slate-400" />
                      <p className="text-xs text-slate-400">{selectedGroup.member_count} members • Admin: {selectedGroup.admin_name}</p>
                    </div>
                  </div>
                </div>
                <button onClick={() => loadMessages(selectedGroup.id)} className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all">
                  <RefreshCw size={16} />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 bg-slate-50">
                {loading && (
                  <div className="flex justify-center">
                    <div className="w-6 h-6 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {Object.entries(messagesByDate).map(([date, dayMessages]) => (
                  <div key={date}>
                    {/* Date divider */}
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-slate-200" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 px-2">{date}</span>
                      <div className="flex-1 h-px bg-slate-200" />
                    </div>
                    {dayMessages.map(msg => {
                      const isMe = msg.sender_id === currentUserId;
                      return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-3`}>
                          <div className={`max-w-xs lg:max-w-sm xl:max-w-md ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                            {!isMe && (
                              <p className="text-[10px] font-bold text-slate-500 mb-1 ml-1">{msg.sender_name}</p>
                            )}
                            <div className={`px-4 py-2.5 rounded-2xl shadow-sm ${
                              isMe
                                ? 'bg-emerald-500 text-white rounded-br-sm'
                                : 'bg-white text-slate-800 border border-slate-100 rounded-bl-sm'
                            }`}>
                              <p className="text-sm leading-relaxed">{msg.content}</p>
                            </div>
                            <p className={`text-[10px] mt-1 ${isMe ? 'text-slate-400 mr-1' : 'text-slate-400 ml-1'}`}>
                              {formatTime(msg.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
                {messages.length === 0 && !loading && (
                  <div className="text-center py-12 text-slate-400">
                    <MessageSquare size={32} className="mx-auto mb-2 opacity-20" />
                    <p className="text-sm font-semibold">No messages yet. Say hello! 👋</p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="px-6 py-4 bg-white border-t border-slate-100 flex-shrink-0">
                <form onSubmit={sendMessage} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0">
                    {currentUserName.charAt(0)}
                  </div>
                  <div className="flex-1 flex items-center gap-2 bg-slate-100 rounded-2xl px-4 py-2.5">
                    <input
                      type="text"
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      placeholder={`Message ${selectedGroup.name}…`}
                      className="flex-1 bg-transparent outline-none text-sm text-slate-800 placeholder-slate-400"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!input.trim() || sending}
                    className="w-10 h-10 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-2xl flex items-center justify-center transition-all shadow-lg shadow-emerald-500/25 flex-shrink-0"
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

