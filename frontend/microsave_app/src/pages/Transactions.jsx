import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { ArrowLeftRight, RefreshCw, TrendingUp, TrendingDown, Crown } from 'lucide-react';
import { API_BASE_URL as API } from '../services/api';

const fmt = (n) => `₦${Number(n).toLocaleString()}`;
const currentUserId = Number(localStorage.getItem('user_id')) || 1;

const typeConfig = {
  contribution:     { bg: 'bg-emerald-50',  text: 'text-emerald-700', dot: 'bg-emerald-400', label: 'Contribution',    icon: TrendingUp   },
  loan:             { bg: 'bg-blue-50',      text: 'text-blue-700',    dot: 'bg-blue-400',    label: 'Loan Disbursed',  icon: TrendingUp   },
  loan_repayment:   { bg: 'bg-purple-50',    text: 'text-purple-700',  dot: 'bg-purple-400',  label: 'Loan Repayment',  icon: TrendingDown },
  payment:          { bg: 'bg-slate-50',     text: 'text-slate-700',   dot: 'bg-slate-400',   label: 'Payment',         icon: TrendingDown },
  top_up:           { bg: 'bg-teal-50',      text: 'text-teal-700',    dot: 'bg-teal-400',    label: 'Top Up',          icon: TrendingUp   },
  deposit:          { bg: 'bg-emerald-50',   text: 'text-emerald-700', dot: 'bg-emerald-400', label: 'Deposit',         icon: TrendingUp   },
  withdrawal:       { bg: 'bg-orange-50',    text: 'text-orange-700',  dot: 'bg-orange-400',  label: 'Withdrawal',      icon: TrendingDown },
  split_payment:    { bg: 'bg-pink-50',      text: 'text-pink-700',    dot: 'bg-pink-400',    label: 'Split Payment',   icon: TrendingDown },
};

const getTypeConfig = (type) => typeConfig[type] || {
  bg: 'bg-slate-50', text: 'text-slate-700', dot: 'bg-slate-400', label: type, icon: ArrowLeftRight
};

const formatDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
};

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [filterGroup, setFilterGroup] = useState('all');
  const [isAdmin, setIsAdmin] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const gr = await fetch(`${API}/groups`).then(r => r.json());
      setGroups(gr);

      // Check admin
      const adminGroup = gr.find(g => g.admin_id === currentUserId);
      const adminMode = !!adminGroup;
      setIsAdmin(adminMode);

      // Build URL — admins get all transactions; members get their own
      const params = new URLSearchParams();
      if (adminMode) {
        params.set('admin', 'true');
      } else {
        params.set('user_id', String(currentUserId));
      }
      const txns = await fetch(`${API}/transactions?${params}`).then(r => r.json());
      setTransactions(txns);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // Filter in frontend
  const filtered = transactions.filter(t => {
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (filterGroup !== 'all' && String(t.group_id) !== filterGroup) return false;
    if (dateFrom && new Date(t.created_at) < new Date(dateFrom)) return false;
    if (dateTo && new Date(t.created_at) > new Date(dateTo + 'T23:59:59')) return false;
    return true;
  });

  // Summary totals
  const inboundTypes = ['contribution', 'loan', 'deposit', 'top_up'];
  const totalIn  = filtered.filter(t => inboundTypes.includes(t.type)).reduce((s, t) => s + t.amount, 0);
  const totalOut = filtered.filter(t => !inboundTypes.includes(t.type)).reduce((s, t) => s + t.amount, 0);

  const allTypes = [...new Set(transactions.map(t => t.type))];

  return (
    <DashboardLayout>
      <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-slate-900">Transactions</h1>
              {isAdmin && (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-black">
                  <Crown size={11} /> Admin View
                </span>
              )}
            </div>
            <p className="text-slate-500 font-medium mt-1">
              {isAdmin
                ? 'Full transaction history for all members in your group.'
                : 'Your personal transaction history.'}
            </p>
          </div>
          <button onClick={load} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm">
            <RefreshCw size={16} className="text-slate-500" />
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-center">
            <p className="text-2xl font-black text-slate-900">{filtered.length}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Transactions</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 text-center">
            <p className="text-2xl font-black text-emerald-700">{fmt(totalIn)}</p>
            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mt-1">Total Inflow</p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-2xl p-5 text-center">
            <p className="text-2xl font-black text-red-600">{fmt(totalOut)}</p>
            <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mt-1">Total Outflow</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6 space-y-4">
          <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Filters</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Type filter */}
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              className="px-4 py-2.5 border-2 border-slate-100 rounded-xl focus:border-emerald-500 outline-none text-sm font-semibold bg-white">
              <option value="all">All Types</option>
              {allTypes.map(t => <option key={t} value={t}>{getTypeConfig(t).label}</option>)}
            </select>

            {/* Group filter */}
            <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)}
              className="px-4 py-2.5 border-2 border-slate-100 rounded-xl focus:border-emerald-500 outline-none text-sm font-semibold bg-white">
              <option value="all">All Groups</option>
              {groups.map(g => <option key={g.id} value={String(g.id)}>{g.name}</option>)}
            </select>

            {/* Date From */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="w-full px-4 py-2 border-2 border-slate-100 rounded-xl focus:border-emerald-500 outline-none text-sm font-semibold" />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="w-full px-4 py-2 border-2 border-slate-100 rounded-xl focus:border-emerald-500 outline-none text-sm font-semibold" />
            </div>
          </div>
          {(filterType !== 'all' || filterGroup !== 'all' || dateFrom || dateTo) && (
            <button onClick={() => { setFilterType('all'); setFilterGroup('all'); setDateFrom(''); setDateTo(''); }}
              className="text-xs font-bold text-emerald-600 hover:underline">
              Clear all filters
            </button>
          )}
        </div>

        {/* Transaction List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <ArrowLeftRight size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold">No transactions found.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Table header */}
            <div className={`grid gap-4 px-6 py-3 bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest ${
              isAdmin ? 'grid-cols-6' : 'grid-cols-5'
            }`}>
              {isAdmin && <span>Member</span>}
              <span>Date & Time</span>
              <span>Type</span>
              <span>Group</span>
              <span>Description</span>
              <span className="text-right">Amount</span>
            </div>

            <div className="divide-y divide-slate-50">
              {filtered.map(t => {
                const cfg = getTypeConfig(t.type);
                const Icon = cfg.icon;
                const isInbound = inboundTypes.includes(t.type);
                return (
                  <div key={t.id} className={`grid gap-4 px-6 py-4 items-center hover:bg-slate-50/60 transition-colors ${
                    isAdmin ? 'grid-cols-6' : 'grid-cols-5'
                  }`}>
                    {/* Member name (admin only) */}
                    {isAdmin && (
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center text-xs font-black text-slate-600 flex-shrink-0">
                          {(t.user_name || '?').charAt(0).toUpperCase()}
                        </div>
                        <p className="text-xs font-bold text-slate-800 truncate">{t.user_name}</p>
                      </div>
                    )}

                    {/* Date */}
                    <div>
                      <p className="text-xs font-bold text-slate-700">{formatDate(t.created_at).split(' ').slice(0, 3).join(' ')}</p>
                      <p className="text-[10px] text-slate-400">{formatDate(t.created_at).split(' ').slice(3).join(' ')}</p>
                    </div>

                    {/* Type badge */}
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black whitespace-nowrap ${cfg.bg} ${cfg.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                      {cfg.label}
                    </span>

                    {/* Group */}
                    <p className="text-xs font-semibold text-slate-500 truncate">{t.group_name || '—'}</p>

                    {/* Description */}
                    <p className="text-xs text-slate-400 truncate">{t.description || '—'}</p>

                    {/* Amount */}
                    <div className="flex items-center justify-end gap-1.5">
                      <Icon size={13} className={isInbound ? 'text-emerald-500' : 'text-red-400'} />
                      <p className={`text-sm font-black ${isInbound ? 'text-emerald-600' : 'text-red-500'}`}>
                        {isInbound ? '+' : '-'}{fmt(t.amount)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer count */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-xs font-semibold text-slate-400">
              Showing {filtered.length} of {transactions.length} transactions
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Transactions;

