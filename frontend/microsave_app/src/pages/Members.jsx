import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import {
  UserCheck, Crown, RefreshCw, ChevronDown, Clock,
  CheckCircle, XCircle, AlertTriangle, X, Users
} from 'lucide-react';
import { API_BASE_URL as API } from '../services/api';

const currentUserId = Number(localStorage.getItem('user_id')) || 1;

const loanStatusConfig = {
  pending:   { bg: 'bg-amber-100',   text: 'text-amber-700',   label: 'Pending'   },
  active:    { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Active'    },
  overdue:   { bg: 'bg-red-100',     text: 'text-red-700',     label: 'Overdue'   },
  completed: { bg: 'bg-slate-100',   text: 'text-slate-500',   label: 'Completed' },
};

// Toast
const Toast = ({ msg, type, onClose }) => (
  <div className={`fixed top-5 right-5 z-50 flex items-start gap-3 px-5 py-4 rounded-2xl shadow-2xl max-w-sm ${
    type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
  }`}>
    {type === 'success' ? <CheckCircle size={18} className="flex-shrink-0 mt-0.5" /> : <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />}
    <p className="text-sm font-semibold flex-1">{msg}</p>
    <button onClick={onClose}><X size={16} className="opacity-70 hover:opacity-100" /></button>
  </div>
);

const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });
};

const Members = () => {
  const [members, setMembers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]); // pending per group
  const [loading, setLoading] = useState(true);
  const [filterGroup, setFilterGroup] = useState('all');
  const [updatingRole, setUpdatingRole] = useState(null);
  const [processingReq, setProcessingReq] = useState(null);
  const [activeTab, setActiveTab] = useState('members'); // members | pending
  const [toast, setToast] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [myAdminGroups, setMyAdminGroups] = useState([]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [mr, gr] = await Promise.all([
        fetch(`${API}/members`).then(r => r.json()),
        fetch(`${API}/groups`).then(r => r.json()),
      ]);
      setMembers(mr);
      setGroups(gr);

      const adminGroups = gr.filter(g => g.admin_id === currentUserId);
      setMyAdminGroups(adminGroups);
      setIsAdmin(adminGroups.length > 0);

      // Load join requests for all groups I admin
      if (adminGroups.length > 0) {
        const reqs = await Promise.all(
          adminGroups.map(g =>
            fetch(`${API}/groups/${g.id}/join-requests`)
              .then(r => r.json())
              .then(data => data.map(req => ({ ...req, group_id: g.id, group_name: g.name })))
              .catch(() => [])
          )
        );
        setJoinRequests(reqs.flat());
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleRoleChange = async (memberId, newRole) => {
    setUpdatingRole(memberId);
    try {
      await fetch(`${API}/members/${memberId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
      showToast(`Role updated to ${newRole}.`, 'success');
    } finally { setUpdatingRole(null); }
  };

  const handleApproval = async (req, action) => {
    setProcessingReq(req.id);
    try {
      const res = await fetch(`${API}/groups/${req.group_id}/join-requests/${req.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        showToast(action === 'approve' ? `${req.name} approved and added to ${req.group_name}!` : `${req.name}'s request declined.`, 'success');
        await load();
      } else {
        const d = await res.json();
        showToast(d.detail || 'Action failed.', 'error');
      }
    } finally { setProcessingReq(null); }
  };

  // Group members by group_id
  const grouped = {};
  members.forEach(m => {
    if (!grouped[m.group_id]) grouped[m.group_id] = { group_name: m.group_name, members: [] };
    grouped[m.group_id].members.push(m);
  });

  const filteredGroups = filterGroup === 'all'
    ? Object.entries(grouped)
    : Object.entries(grouped).filter(([gid]) => gid === filterGroup);

  const isAdminOfGroup = (groupId) => {
    const g = groups.find(gr => gr.id === Number(groupId));
    return g && g.admin_id === currentUserId;
  };

  const totalMembers = members.length;
  const adminCount = members.filter(m => m.role === 'admin').length;
  const onLoanCount = members.filter(m => m.loans?.some(l => l.status === 'active')).length;
  const pendingCount = joinRequests.length;

  return (
    <DashboardLayout>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-slate-900">Members</h1>
              {isAdmin && (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-black">
                  <Crown size={11} /> Admin View
                </span>
              )}
            </div>
            <p className="text-slate-500 font-medium mt-1">
              {isAdmin ? 'Manage members, approvals, and roles.' : 'View all approved members in your group.'}
            </p>
          </div>
          <button onClick={load} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm">
            <RefreshCw size={15} className="text-slate-500" />
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-center">
            <p className="text-3xl font-black text-slate-900">{totalMembers}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Active Members</p>
          </div>
          <div className="bg-purple-50 border border-purple-100 rounded-2xl p-5 text-center">
            <p className="text-3xl font-black text-purple-700">{adminCount}</p>
            <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mt-1">Group Admins</p>
          </div>
          <div className={`rounded-2xl p-5 text-center border ${
            pendingCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-orange-50 border-orange-100'
          }`}>
            <p className={`text-3xl font-black ${pendingCount > 0 ? 'text-amber-700' : 'text-orange-700'}`}>
              {isAdmin ? pendingCount : onLoanCount}
            </p>
            <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${pendingCount > 0 ? 'text-amber-400' : 'text-orange-400'}`}>
              {isAdmin ? 'Pending Requests' : 'On Active Loan'}
            </p>
          </div>
        </div>

        {/* Admin: pending requests alert */}
        {isAdmin && pendingCount > 0 && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 mb-5 cursor-pointer"
            onClick={() => setActiveTab('pending')}>
            <Clock size={18} className="text-amber-600 flex-shrink-0 animate-pulse" />
            <p className="text-sm font-bold text-amber-800 flex-1">
              {pendingCount} member{pendingCount > 1 ? 's' : ''} waiting for your approval to join.
            </p>
            <span className="text-xs font-black text-amber-600 underline">Review now →</span>
          </div>
        )}

        {/* Tabs (admin only) */}
        {isAdmin && (
          <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-2xl w-fit">
            <button onClick={() => setActiveTab('members')}
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'members' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}>
              <Users size={14} className="inline mr-1.5" />
              Active Members ({totalMembers})
            </button>
            <button onClick={() => setActiveTab('pending')}
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-all relative ${
                activeTab === 'pending' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}>
              <Clock size={14} className="inline mr-1.5" />
              Pending Requests
              {pendingCount > 0 && (
                <span className="ml-2 bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{pendingCount}</span>
              )}
            </button>
          </div>
        )}

        {/* ── PENDING JOIN REQUESTS TAB ── */}
        {activeTab === 'pending' && isAdmin && (
          <div>
            {joinRequests.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                <CheckCircle size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-semibold">No pending requests. All caught up!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {joinRequests.map(req => (
                  <div key={req.id} className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5 flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center font-black text-amber-700 text-sm flex-shrink-0">
                      {(req.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-black text-slate-900">{req.name}</p>
                        <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 font-bold rounded-full">{req.group_name}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {req.occupation || 'Member'} · {req.phone || 'No phone'} · {req.email || ''}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleApproval(req, 'approve')}
                        disabled={processingReq === req.id}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-60 shadow-md shadow-emerald-500/20"
                      >
                        {processingReq === req.id
                          ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          : <CheckCircle size={13} />}
                        Approve
                      </button>
                      <button
                        onClick={() => handleApproval(req, 'reject')}
                        disabled={processingReq === req.id}
                        className="flex items-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-xl transition-all disabled:opacity-60 border border-red-200"
                      >
                        <XCircle size={13} />
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ACTIVE MEMBERS TAB ── */}
        {activeTab === 'members' && (
          <>
            {/* Group filter */}
            <div className="flex items-center gap-2 mb-5 flex-wrap">
              <button onClick={() => setFilterGroup('all')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filterGroup === 'all' ? 'bg-slate-900 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                All Groups
              </button>
              {groups.map(g => (
                <button key={g.id} onClick={() => setFilterGroup(String(g.id))}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filterGroup === String(g.id) ? 'bg-slate-900 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                  {g.name}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                <UserCheck size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-semibold">No members found.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredGroups.map(([groupId, { group_name, members: gMembers }]) => {
                  const canManage = isAdminOfGroup(groupId);
                  return (
                    <div key={groupId} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                      <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-slate-800">{group_name}</h3>
                          {canManage && <Crown size={13} className="text-amber-500" />}
                        </div>
                        <span className="text-xs text-slate-400 font-semibold">{gMembers.length} member{gMembers.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="divide-y divide-slate-50">
                        {gMembers.map(m => {
                          const isAdminMember = m.role === 'admin';
                          const activeLoans = m.loans?.filter(l => l.status !== 'completed') || [];
                          const isMe = m.user_id === currentUserId;
                          return (
                            <div key={m.id} className={`flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors ${isMe ? 'bg-blue-50/30' : ''}`}>
                              {/* Avatar */}
                              <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 ${
                                isAdminMember ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {m.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-bold text-slate-900 truncate">{m.name}</p>
                                  {isAdminMember && <Crown size={12} className="text-amber-500 flex-shrink-0" />}
                                  {isMe && <span className="text-[10px] bg-blue-100 text-blue-700 font-black px-1.5 py-0.5 rounded-full">You</span>}
                                </div>
                                <p className="text-xs text-slate-400">{m.occupation || 'Member'} · {m.phone || '—'} · Joined {formatDate(m.joined_at)}</p>
                              </div>

                              {/* Loan badges */}
                              <div className="flex gap-1 flex-wrap justify-end">
                                {activeLoans.map(l => {
                                  const cfg = loanStatusConfig[l.status] || loanStatusConfig.pending;
                                  return (
                                    <span key={l.id} className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.bg} ${cfg.text}`}>
                                      {cfg.label}
                                    </span>
                                  );
                                })}
                              </div>

                              {/* Role control (admin only, not for other admins) */}
                              {canManage && !isAdminMember ? (
                                <div className="relative flex-shrink-0">
                                  <select
                                    value={m.role}
                                    disabled={updatingRole === m.id}
                                    onChange={e => handleRoleChange(m.id, e.target.value)}
                                    className="appearance-none px-3 py-1.5 pr-7 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl cursor-pointer hover:bg-slate-200 transition-colors outline-none disabled:opacity-50"
                                  >
                                    <option value="general">General</option>
                                    <option value="admin">Admin</option>
                                  </select>
                                  <ChevronDown size={11} className="absolute right-2 top-2 text-slate-400 pointer-events-none" />
                                </div>
                              ) : (
                                <span className={`flex-shrink-0 px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                                  isAdminMember ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {isAdminMember ? '👑 Admin' : 'Member'}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Members;

