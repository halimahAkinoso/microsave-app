import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import {
  Users, Wallet, TrendingUp, Clock, ArrowUpRight, ArrowDownLeft,
  CreditCard, BarChart3, Plus, RefreshCw, Shield
} from 'lucide-react';
import { API_BASE_URL as API } from '../services/api';


const fmt = (n) => `₦${Number(n).toLocaleString()}`;

const typeConfig = {
  deposit:    { color: 'text-emerald-600', bg: 'bg-emerald-50', icon: ArrowDownLeft, label: 'Deposit'    },
  withdrawal: { color: 'text-red-500',     bg: 'bg-red-50',     icon: ArrowUpRight,  label: 'Withdrawal' },
  loan:       { color: 'text-blue-600',    bg: 'bg-blue-50',    icon: CreditCard,    label: 'Loan'       },
};

const StatCard = ({ title, value, sub, subColor, icon: Icon, accent }) => (
  <div className={`p-6 rounded-2xl border shadow-sm ${accent ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100'}`}>
    <div className="flex items-start justify-between mb-4">
      <p className={`text-xs font-bold uppercase tracking-widest ${accent ? 'text-slate-400' : 'text-slate-400'}`}>{title}</p>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent ? 'bg-slate-800' : 'bg-emerald-50'}`}>
        <Icon size={18} className={accent ? 'text-emerald-400' : 'text-emerald-600'} />
      </div>
    </div>
    <p className={`text-3xl font-black tracking-tight mb-1 ${accent ? 'text-white' : 'text-slate-900'}`}>{value}</p>
    <p className={`text-xs font-semibold ${subColor || (accent ? 'text-slate-400' : 'text-slate-400')}`}>{sub}</p>
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const userName = localStorage.getItem('user_name') || 'User';

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/dashboard/stats`);
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error('Failed to load stats:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStats(); }, []);

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-medium">Loading dashboard…</p>
        </div>
      </div>
    </DashboardLayout>
  );

  const s = stats || {};

  return (
    <DashboardLayout>
      <div className="px-8 py-8 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900">Hello, {userName.split(' ')[0]}! 👋</h1>
            <p className="text-slate-500 font-medium mt-1">Here's your community finance overview.</p>
          </div>
          <button onClick={loadStats} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
            <RefreshCw size={15} /> Refresh
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <StatCard title="Total Savings" value={fmt(s.total_savings || 0)}
            sub={`Across ${s.total_groups || 0} groups`} icon={Wallet} />
          <StatCard title="Active Loans" value={s.active_loans || 0}
            sub="Currently disbursed" subColor="text-orange-500" icon={CreditCard} />
          <StatCard title="Repayment Rate" value={`${s.repayment_rate || 0}%`}
            sub="Loans completed" subColor="text-emerald-600" icon={TrendingUp} />
          <StatCard title="Total Members" value={s.total_members || 0}
            sub={`${s.active_groups || 0} active groups`} icon={Users} accent />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
          {/* Recent Transactions */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <h2 className="text-lg font-black text-slate-900">Recent Transactions</h2>
              <a href="/transactions" className="text-xs font-bold text-emerald-600 hover:underline">View all →</a>
            </div>
            <div className="divide-y divide-slate-50">
              {(s.recent_transactions || []).length === 0 && (
                <p className="text-slate-400 text-sm text-center py-8">No transactions yet.</p>
              )}
              {(s.recent_transactions || []).map((t) => {
                const cfg = typeConfig[t.type] || typeConfig.deposit;
                const TIcon = cfg.icon;
                return (
                  <div key={t.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                      <TIcon size={16} className={cfg.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{t.user_name}</p>
                      <p className="text-xs text-slate-400 truncate">{t.description || t.group_name}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-black ${t.type === 'withdrawal' ? 'text-red-500' : 'text-slate-900'}`}>
                        {t.type === 'withdrawal' ? '-' : '+'}{fmt(t.amount)}
                      </p>
                      <p className="text-[10px] text-slate-300">{t.group_name}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Groups */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <h2 className="text-lg font-black text-slate-900">Top Groups</h2>
              <BarChart3 size={18} className="text-slate-300" />
            </div>
            <div className="px-6 py-4 space-y-4">
              {(s.top_groups || []).length === 0 && (
                <p className="text-slate-400 text-sm text-center py-4">No groups yet.</p>
              )}
              {(s.top_groups || []).map((g, i) => {
                const maxBalance = s.top_groups[0]?.balance || 1;
                const pct = Math.round((g.balance / maxBalance) * 100);
                const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-orange-400', 'bg-teal-500'];
                return (
                  <div key={g.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <p className="text-sm font-bold text-slate-800 leading-tight">{g.name}</p>
                        <p className="text-[10px] text-slate-400">{g.member_count} members • {g.admin_name}</p>
                      </div>
                      <p className="text-sm font-black text-slate-900">{fmt(g.balance)}</p>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${colors[i % colors.length]} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Finance Overview per Group */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <h2 className="text-lg font-black text-slate-900">Finance Overview by Group</h2>
            <a href="/groups" className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:underline">
              <Plus size={13} /> New Group
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Group</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Admin</th>
                  <th className="text-right px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Members</th>
                  <th className="text-right px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(s.top_groups || []).map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                          <Shield size={14} className="text-emerald-600" />
                        </div>
                        <span className="font-bold text-slate-800">{g.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{g.admin_name}</td>
                    <td className="px-6 py-4 text-right text-slate-600 font-semibold">{g.member_count}</td>
                    <td className="px-6 py-4 text-right font-black text-slate-900">{fmt(g.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;

