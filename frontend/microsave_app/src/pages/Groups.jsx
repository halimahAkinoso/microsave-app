import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Users, Plus, CheckCircle, XCircle, Clock, Crown, RefreshCw, X, Shield, AlertTriangle } from 'lucide-react';

const API = 'http://localhost:8000';
const fmt = (n) => `₦${Number(n).toLocaleString()}`;
const currentUserId = Number(localStorage.getItem('user_id')) || 1;

// Toast notification
const Toast = ({ msg, type, onClose }) => (
  <div className={`fixed top-5 right-5 z-50 flex items-start gap-3 px-5 py-4 rounded-2xl shadow-2xl max-w-sm animate-fade-in ${
    type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
  }`}>
    <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
    <p className="text-sm font-semibold leading-snug flex-1">{msg}</p>
    <button onClick={onClose} className="opacity-70 hover:opacity-100 flex-shrink-0"><X size={16} /></button>
  </div>
);


const loanStatusConfig = {
  pending:   { bg: 'bg-amber-100',   text: 'text-amber-700',   label: 'Pending'   },
  active:    { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Active'    },
  overdue:   { bg: 'bg-red-100',     text: 'text-red-700',     label: 'Overdue'   },
  completed: { bg: 'bg-slate-100',   text: 'text-slate-500',   label: 'Completed' },
};

// ── Create Group Modal ────────────────────────────────────────────────────────
const CreateGroupModal = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({ name: '', description: '', contribution_amount: '', contribution_period: 'monthly' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch(`${API}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, contribution_amount: Number(form.contribution_amount), admin_id: currentUserId }),
      });
      onCreated();
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h3 className="text-lg font-black text-slate-900">Create New Group</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Group Name</label>
            <input required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
              className="w-full px-4 py-2.5 border-2 border-slate-100 rounded-xl focus:border-emerald-500 outline-none text-sm" placeholder="e.g. Market Women Beta" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
              className="w-full px-4 py-2.5 border-2 border-slate-100 rounded-xl focus:border-emerald-500 outline-none text-sm resize-none" rows={2} placeholder="What is this group about?" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Contribution (₦)</label>
              <input type="number" min="0" value={form.contribution_amount} onChange={e => setForm(f => ({...f, contribution_amount: e.target.value}))}
                className="w-full px-4 py-2.5 border-2 border-slate-100 rounded-xl focus:border-emerald-500 outline-none text-sm" placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Period</label>
              <select value={form.contribution_period} onChange={e => setForm(f => ({...f, contribution_period: e.target.value}))}
                className="w-full px-4 py-2.5 border-2 border-slate-100 rounded-xl focus:border-emerald-500 outline-none text-sm bg-white">
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="daily">Daily</option>
              </select>
            </div>
          </div>
          <p className="text-xs text-slate-400 bg-slate-50 rounded-xl p-3">
            👑 You will automatically become the <strong>Group Admin (Head)</strong>. New members must request to join and you will approve or reject them.
          </p>
          <button type="submit" disabled={saving}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-60">
            {saving ? 'Creating…' : 'Create Group'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ── Group Detail Card ─────────────────────────────────────────────────────────
const GroupCard = ({ group, onRefresh, userGroupId, onToast }) => {
  const [members, setMembers] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [joining, setJoining] = useState(false);
  const isAdmin = group.admin_id === currentUserId;
  const isMyGroup = userGroupId === group.id;

  const loadDetails = async () => {
    const [mr, jr] = await Promise.all([
      fetch(`${API}/groups/${group.id}/members`).then(r => r.json()),
      isAdmin ? fetch(`${API}/groups/${group.id}/join-requests`).then(r => r.json()) : Promise.resolve([]),
    ]);
    setMembers(mr);
    setJoinRequests(jr);
  };

  useEffect(() => { if (expanded) loadDetails(); }, [expanded]);

  const handleJoin = async () => {
    setJoining(true);
    try {
      const res = await fetch(`${API}/groups/${group.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUserId }),
      });
      const data = await res.json();
      if (!res.ok) {
        onToast(data.detail || 'Could not join group.', 'error');
      } else {
        onToast(data.message || 'Join request submitted!', 'success');
      }
    } catch {
      onToast('Network error. Please try again.', 'error');
    } finally {
      setJoining(false);
    }
  };

  const handleApproval = async (memberId, action) => {
    await fetch(`${API}/groups/${group.id}/join-requests/${memberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    await loadDetails();
    onRefresh();
  };

  const membersOnLoan = members.filter(m => m.loans && m.loans.length > 0);
  const activeMembers = members.filter(m => m.loans?.some(l => l.status === 'active')).length;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Card Header */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
              <Shield size={22} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">{group.name}</h3>
              <div className="flex items-center gap-1 mt-0.5">
                <Crown size={11} className="text-amber-500" />
                <p className="text-xs text-slate-400 font-semibold">{group.admin_name}</p>
              </div>
            </div>
          </div>
          {isAdmin && (
            <span className="px-2.5 py-1 bg-purple-100 text-purple-700 text-[10px] font-black uppercase tracking-wide rounded-full">Admin</span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Members</p>
            <p className="text-xl font-black text-slate-900">{group.member_count}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Balance</p>
            <p className="text-sm font-black text-emerald-600">{fmt(group.balance)}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contribution</p>
            <p className="text-sm font-black text-slate-700">{fmt(group.contribution_amount)}/{group.contribution_period === 'weekly' ? 'wk' : 'mo'}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setExpanded(e => !e)}
            className="flex-1 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
            {expanded ? 'Hide Details ▲' : 'View Members ▼'}
          </button>
          {/* Show join btn only if not admin and user isn't already in a group */}
          {!isAdmin && !userGroupId && (
            <button onClick={handleJoin} disabled={joining}
              className="flex-1 py-2 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-all disabled:opacity-60">
              {joining ? 'Requesting…' : 'Request to Join'}
            </button>
          )}
          {/* User is in THIS group — show badge */}
          {isMyGroup && !isAdmin && (
            <span className="flex-1 py-2 text-xs font-bold text-center text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl">
              ✅ Your Group
            </span>
          )}
          {/* User is in a DIFFERENT group — show disabled */}
          {!isAdmin && userGroupId && !isMyGroup && (
            <span className="flex-1 py-2 text-xs font-bold text-center text-slate-400 bg-slate-50 border border-slate-200 rounded-xl">
              🔒 One group only
            </span>
          )}
        </div>
      </div>

      {/* Expanded Detail */}
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-5 space-y-5">

          {/* Admin: Pending Join Requests */}
          {isAdmin && joinRequests.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock size={14} className="text-amber-500" />
                <h4 className="text-xs font-black text-amber-700 uppercase tracking-wide">Pending Join Requests ({joinRequests.length})</h4>
              </div>
              <div className="space-y-2">
                {joinRequests.map(req => (
                  <div key={req.id} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-amber-100">
                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center font-black text-amber-700 text-xs">
                      {req.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{req.name}</p>
                      <p className="text-xs text-slate-400">{req.occupation || 'Member'} • {req.phone}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleApproval(req.id, 'approve')}
                        className="p-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg transition-colors">
                        <CheckCircle size={15} />
                      </button>
                      <button onClick={() => handleApproval(req.id, 'reject')}
                        className="p-1.5 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-colors">
                        <XCircle size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Member List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-black text-slate-600 uppercase tracking-wide">Members ({members.length})</h4>
              <span className="text-xs text-emerald-600 font-bold">{activeMembers} on active loan</span>
            </div>
            <div className="space-y-2">
              {members.length === 0 && <p className="text-xs text-slate-400 text-center py-3">No approved members yet.</p>}
              {members.map(m => (
                <div key={m.id} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-slate-100">
                  <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center font-black text-slate-600 text-xs">
                    {m.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{m.name}</p>
                    <p className="text-xs text-slate-400 truncate">{m.occupation || 'Member'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.loans?.map(l => {
                      const cfg = loanStatusConfig[l.status] || loanStatusConfig.pending;
                      return <span key={l.id} className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>;
                    })}
                    <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${
                      m.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'
                    }`}>{m.role === 'admin' ? '👑 Admin' : 'Member'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Members on Loan */}
          {membersOnLoan.length > 0 && (
            <div>
              <h4 className="text-xs font-black text-slate-600 uppercase tracking-wide mb-3">Members on Loan</h4>
              <div className="space-y-2">
                {membersOnLoan.map(m => (
                  m.loans.map(l => {
                    const cfg = loanStatusConfig[l.status] || loanStatusConfig.pending;
                    return (
                      <div key={l.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-slate-100">
                        <div>
                          <p className="text-sm font-bold text-slate-800">{m.name}</p>
                          <p className="text-xs text-slate-400">{l.purpose || 'Loan'} • {fmt(l.amount)}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                      </div>
                    );
                  })
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Groups Page ───────────────────────────────────────────────────────────────
const Groups = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState(null);
  const [userGroupId, setUserGroupId] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetch(`${API}/groups`).then(r => r.json());
      setGroups(data);
      // Check if user is already an approved member of any group
      const memberRes = await fetch(`${API}/members?user_id=${currentUserId}`).then(r => r.json()).catch(() => []);
      // Find approved membership
      const myMembership = await fetch(`${API}/groups`)
        .then(r => r.json())
        .then(async (gs) => {
          for (const g of gs) {
            const members = await fetch(`${API}/groups/${g.id}/members`).then(r => r.json()).catch(() => []);
            const me = members.find(m => m.user_id === currentUserId);
            if (me) return g.id;
          }
          return null;
        });
      setUserGroupId(myMembership);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <DashboardLayout>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {showCreate && <CreateGroupModal onClose={() => setShowCreate(false)} onCreated={load} />}
      <div className="px-8 py-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900">Groups</h1>
            <p className="text-slate-500 font-medium mt-1">Manage your savings groups, members, and loan requests.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 shadow-sm">
              <RefreshCw size={15} />
            </button>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all">
              <Plus size={16} /> Create Group
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Users size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold">No groups yet. Create the first one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {groups.map(g => <GroupCard key={g.id} group={g} onRefresh={load} userGroupId={userGroupId} onToast={showToast} />)}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Groups;
