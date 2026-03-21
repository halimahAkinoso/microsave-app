import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { CreditCard, Plus, RefreshCw, X, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { API_BASE_URL as API } from '../services/api';

const fmt = (n) => `₦${Number(n).toLocaleString()}`;
const currentUserId = Number(localStorage.getItem('user_id')) || 1;

const statusConfig = {
  pending:   { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-400',   label: 'Pending'   },
  active:    { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Active'    },
  overdue:   { bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-500',     label: 'Overdue'   },
  completed: { bg: 'bg-slate-100',   text: 'text-slate-600',   dot: 'bg-slate-400',   label: 'Completed' },
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

// Status badge (non-clickable)
const StatusBadge = ({ status }) => {
  const cfg = statusConfig[status] || statusConfig.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

// Request Loan Modal (for members)
const RequestLoanModal = ({ groups, onClose, onCreated }) => {
  const [form, setForm] = useState({ group_id: '', amount: '', purpose: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API}/loans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUserId, group_id: Number(form.group_id), amount: Number(form.amount), purpose: form.purpose }),
      });
      if (res.ok) { onCreated(); onClose(); }
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-black text-slate-900">Request a Loan</h3>
            <p className="text-xs text-slate-400 mt-0.5">Your group admin will review and approve.</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Select Group</label>
            <select required value={form.group_id} onChange={e => setForm(f => ({...f, group_id: e.target.value}))}
              className="w-full px-4 py-2.5 border-2 border-slate-100 rounded-xl focus:border-emerald-500 outline-none text-sm bg-white">
              <option value="">Choose your group…</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Amount (₦)</label>
            <input type="number" required min="1" value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))}
              className="w-full px-4 py-2.5 border-2 border-slate-100 rounded-xl focus:border-emerald-500 outline-none text-sm" placeholder="e.g. 50000" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Purpose</label>
            <input type="text" required value={form.purpose} onChange={e => setForm(f => ({...f, purpose: e.target.value}))}
              className="w-full px-4 py-2.5 border-2 border-slate-100 rounded-xl focus:border-emerald-500 outline-none text-sm" placeholder="What will you use this loan for?" />
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
            <p className="text-xs text-blue-700 font-semibold">
              💡 Once your admin approves your loan, the full amount will be instantly credited to your wallet.
            </p>
          </div>
          <button type="submit" disabled={saving}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-60">
            {saving ? 'Submitting…' : 'Submit Loan Request'}
          </button>
        </form>
      </div>
    </div>
  );
};

const Loans = () => {
  const [loans, setLoans] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  // Determine if current user is admin of any group
  const [isAdmin, setIsAdmin] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4500);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [lr, gr] = await Promise.all([
        fetch(`${API}/loans`).then(r => r.json()),
        fetch(`${API}/groups`).then(r => r.json()),
      ]);
      setLoans(lr);
      setGroups(gr);
      // Check if current user is admin of any group
      const adminGroup = gr.find(g => g.admin_id === currentUserId);
      setIsAdmin(!!adminGroup);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const approveLoan = async (loan) => {
    setProcessingId(loan.id);
    try {
      const res = await fetch(`${API}/loans/${loan.id}/approve`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, 'success');
        await load();
      } else {
        showToast(data.detail || 'Could not approve loan.', 'error');
      }
    } finally { setProcessingId(null); }
  };

  const declineLoan = async (loan) => {
    setProcessingId(loan.id);
    try {
      const res = await fetch(`${API}/loans/${loan.id}/decline`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast('Loan declined.', 'success');
        await load();
      } else {
        showToast(data.detail || 'Could not decline.', 'error');
      }
    } finally { setProcessingId(null); }
  };

  // Members only see their own loans; admins see all
  const visibleLoans = isAdmin ? loans : loans.filter(l => l.user_id === currentUserId);
  const filtered = filter === 'all' ? visibleLoans : visibleLoans.filter(l => l.status === filter);
  const counts = ['pending', 'active', 'overdue', 'completed'].reduce(
    (acc, s) => ({ ...acc, [s]: visibleLoans.filter(l => l.status === s).length }), {}
  );
  const pendingCount = visibleLoans.filter(l => l.status === 'pending').length;

  return (
    <DashboardLayout>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {showModal && <RequestLoanModal groups={groups} onClose={() => setShowModal(false)} onCreated={load} />}
      <div className="px-8 py-8 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900">Loans</h1>
            <p className="text-slate-500 font-medium mt-1">
              {isAdmin ? 'Review and approve member loan requests.' : 'Request a loan from your group.'}
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={load} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm">
              <RefreshCw size={15} className="text-slate-500" />
            </button>
            {/* Member: request loan; Admin: no button (they manage, not request) */}
            {!isAdmin && (
              <button onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all">
                <Plus size={16} /> Request Loan
              </button>
            )}
          </div>
        </div>

        {/* Admin pending alert */}
        {isAdmin && pendingCount > 0 && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 mb-6">
            <AlertTriangle size={18} className="text-amber-600 flex-shrink-0" />
            <p className="text-sm font-bold text-amber-800">
              {pendingCount} loan request{pendingCount > 1 ? 's' : ''} awaiting your approval.
            </p>
          </div>
        )}

        {/* Status filter tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {['all', 'pending', 'active', 'overdue', 'completed'].map((s) => {
            const cfg = statusConfig[s];
            const active = filter === s;
            const count = s === 'all' ? visibleLoans.length : counts[s];
            return (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all ${
                  active ? 'bg-slate-900 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}>
                {s === 'all' ? `All (${count})` : `${cfg.label} (${count})`}
              </button>
            );
          })}
        </div>

        {/* Loan Cards */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <CreditCard size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold">No loans found.</p>
            {!isAdmin && <p className="text-sm mt-1">Click "Request Loan" to apply for one from your group.</p>}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((loan) => {
              const progress = loan.repayment_progress || 0;
              const remaining = loan.amount - loan.amount_repaid;
              const isPending = loan.status === 'pending';
              const isProcessing = processingId === loan.id;
              return (
                <div key={loan.id} className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-shadow p-6 ${
                  isPending && isAdmin ? 'border-amber-200 ring-1 ring-amber-100' : 'border-slate-100'
                }`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-700 text-sm">
                        {loan.borrower_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-black text-slate-900">{loan.borrower_name}</p>
                        <p className="text-xs text-slate-400 font-semibold">{loan.group_name}</p>
                        {loan.created_at && (
                          <p className="text-[10px] text-slate-300 mt-0.5">
                            Requested {new Date(loan.created_at).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                    </div>
                    <StatusBadge status={loan.status} />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount</p>
                      <p className="text-lg font-black text-slate-900">{fmt(loan.amount)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Repaid</p>
                      <p className="text-lg font-black text-emerald-600">{fmt(loan.amount_repaid)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Remaining</p>
                      <p className="text-lg font-black text-red-500">{fmt(remaining)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Purpose</p>
                      <p className="text-sm font-bold text-slate-700 truncate">{loan.purpose || '—'}</p>
                    </div>
                  </div>

                  {/* Progress bar (only for active/completed) */}
                  {loan.status !== 'pending' && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-xs font-bold text-slate-400">Repayment Progress</p>
                        <p className="text-xs font-black text-slate-700">{progress}%</p>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            progress === 100 ? 'bg-emerald-500' : progress >= 50 ? 'bg-blue-500' : progress >= 25 ? 'bg-amber-400' : 'bg-red-400'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-300 mt-1">{fmt(loan.amount_repaid)} of {fmt(loan.amount)} repaid</p>
                    </div>
                  )}

                  {/* Admin approve/decline buttons for pending loans */}
                  {isAdmin && isPending && (
                    <div className="flex gap-3 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => approveLoan(loan)}
                        disabled={isProcessing}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-60 shadow-md shadow-emerald-500/20"
                      >
                        {isProcessing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle size={15} />}
                        {isProcessing ? 'Approving…' : 'Approve & Credit Wallet'}
                      </button>
                      <button
                        onClick={() => declineLoan(loan)}
                        disabled={isProcessing}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold text-sm transition-all disabled:opacity-60 border border-red-200"
                      >
                        <XCircle size={15} />
                        Decline
                      </button>
                    </div>
                  )}

                  {/* Member: pending info */}
                  {!isAdmin && isPending && (
                    <div className="pt-3 border-t border-amber-100">
                      <p className="text-xs text-amber-600 font-semibold bg-amber-50 rounded-xl px-4 py-2.5">
                        ⏳ Awaiting admin approval. Once approved, {fmt(loan.amount)} will be credited to your wallet automatically.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Loans;

