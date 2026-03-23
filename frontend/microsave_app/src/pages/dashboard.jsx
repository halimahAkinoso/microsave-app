import React, { useEffect, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  CreditCard,
  RefreshCw,
  Shield,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';

import DashboardLayout from '../components/DashboardLayout';
import { getStoredSession } from '../hooks/useAuth';
import { apiFetch } from '../services/api';

const formatCurrency = (value) => `NGN ${Number(value || 0).toLocaleString()}`;

const transactionConfig = {
  contribution: { color: 'text-emerald-600', bg: 'bg-emerald-50', icon: ArrowDownLeft },
  savings: { color: 'text-emerald-600', bg: 'bg-emerald-50', icon: ArrowDownLeft },
  loan: { color: 'text-blue-600', bg: 'bg-blue-50', icon: CreditCard },
  loan_repayment: { color: 'text-purple-600', bg: 'bg-purple-50', icon: ArrowUpRight },
  top_up: { color: 'text-teal-600', bg: 'bg-teal-50', icon: ArrowDownLeft },
};

const StatCard = ({ title, value, sub, icon: Icon, accent = false }) => (
  <div className={`rounded-3xl border p-6 shadow-sm ${accent ? 'border-slate-800 bg-slate-900 text-white' : 'border-slate-100 bg-white'}`}>
    <div className="mb-4 flex items-start justify-between">
      <p className={`text-xs font-bold uppercase tracking-widest ${accent ? 'text-slate-400' : 'text-slate-400'}`}>{title}</p>
      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${accent ? 'bg-slate-800' : 'bg-emerald-50'}`}>
        <Icon size={18} className={accent ? 'text-emerald-400' : 'text-emerald-600'} />
      </div>
    </div>
    <p className={`text-3xl font-black ${accent ? 'text-white' : 'text-slate-900'}`}>{value}</p>
    <p className={`mt-1 text-xs font-semibold ${accent ? 'text-slate-400' : 'text-slate-400'}`}>{sub}</p>
  </div>
);

const ActionLink = ({ href, label, icon: Icon, dark = false }) => (
  <a
    href={href}
    className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition ${dark ? 'bg-slate-900 text-white hover:bg-slate-800' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
  >
    <Icon size={16} />
    {label}
  </a>
);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const session = getStoredSession();
  const userName = session?.user?.name || 'User';

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/dashboard/stats');
      setStats(data);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    return `${date.toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })} ${date.toLocaleTimeString('en-NG', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
            <p className="font-medium text-slate-500">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const data = stats || {};
  const scopeLabel =
    data.scope === 'admin_group'
      ? 'Admin group view'
      : data.scope === 'member_personal'
        ? 'Personal member view'
        : data.scope === 'pending_membership'
          ? 'Pending membership view'
          : 'No group assigned';

  const hasApprovedMembership = data.membership?.join_status === 'approved';
  const hasPendingMembership = data.membership?.join_status === 'pending';
  const isAdmin = data.membership?.role === 'admin' && hasApprovedMembership;
  const totalAdminQueue = (data.admin_queue?.membership_requests || 0) + (data.admin_queue?.loan_requests || 0);

  const statCards = isAdmin
    ? [
        {
          title: 'Group Balance',
          value: formatCurrency(data.total_savings),
          sub: data.membership?.group_name || 'No group selected',
          icon: Wallet,
        },
        {
          title: 'Pending Approvals',
          value: totalAdminQueue,
          sub: `${data.admin_queue?.membership_requests || 0} membership, ${data.admin_queue?.loan_requests || 0} loan`,
          icon: CheckCircle2,
        },
        {
          title: 'Active Loans',
          value: data.active_loans || 0,
          sub: formatCurrency(data.outstanding_balance || 0),
          icon: CreditCard,
        },
        {
          title: 'Members',
          value: data.total_members || 0,
          sub: 'Approved members in your group',
          icon: Users,
          accent: true,
        },
      ]
    : hasApprovedMembership
      ? [
          {
            title: 'My Savings',
            value: formatCurrency(data.total_savings),
            sub: data.membership?.group_name || 'No group selected',
            icon: Wallet,
          },
          {
            title: 'Wallet Balance',
            value: formatCurrency(data.wallet_balance),
            sub: 'Available personal balance',
            icon: Wallet,
          },
          {
            title: 'Outstanding Loan',
            value: formatCurrency(data.outstanding_balance),
            sub: `${data.active_loans || 0} active loan(s)`,
            icon: CreditCard,
          },
          {
            title: 'Repayment Rate',
            value: `${data.repayment_rate || 0}%`,
            sub: 'Completed personal loans',
            icon: TrendingUp,
            accent: true,
          },
        ]
      : [
          {
            title: 'Wallet Balance',
            value: formatCurrency(data.wallet_balance),
            sub: 'Available personal balance',
            icon: Wallet,
          },
          {
            title: 'Recent Activity',
            value: (data.recent_transactions || []).length,
            sub: 'Transactions currently visible',
            icon: BarChart3,
          },
          {
            title: 'Membership Status',
            value: hasPendingMembership ? 'Pending' : 'Not joined',
            sub: hasPendingMembership ? data.membership?.group_name : 'Join a group to continue',
            icon: hasPendingMembership ? Clock3 : UserPlus,
          },
          {
            title: 'Approved Members',
            value: data.total_members || 0,
            sub: hasPendingMembership ? 'In your requested group' : 'Available after joining',
            icon: Users,
            accent: true,
          },
        ];

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl px-8 py-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900">Hello, {userName.split(' ')[0]}</h1>
            <p className="mt-1 text-slate-500">This dashboard is scoped to your current role and group state.</p>
            <p className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-700">
              {scopeLabel}
            </p>
          </div>
          <button onClick={loadStats} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50">
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>

        {!hasApprovedMembership && (
          <div className={`mb-8 rounded-3xl border p-6 ${hasPendingMembership ? 'border-blue-200 bg-gradient-to-r from-blue-50 to-white' : 'border-emerald-200 bg-gradient-to-r from-emerald-50 to-white'}`}>
            <p className={`text-xs font-black uppercase tracking-[0.2em] ${hasPendingMembership ? 'text-blue-600' : 'text-emerald-600'}`}>
              {hasPendingMembership ? 'Approval pending' : 'Membership required'}
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">
              {hasPendingMembership
                ? 'Your group request is waiting for admin approval'
                : 'Join or create a group before using savings and loans'}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              {hasPendingMembership
                ? 'Your wallet and recent activity remain visible, but savings payments, loan requests, and repayments stay locked until the group admin approves your request.'
                : 'Your financial records are attached to one approved group. Open the Groups page to request membership or create your own group.'}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <ActionLink href="/groups" label={hasPendingMembership ? 'View membership status' : 'Open groups'} icon={Users} dark />
              <ActionLink href="/transactions" label="Open transactions" icon={BarChart3} />
            </div>
          </div>
        )}

        <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => (
            <StatCard
              key={card.title}
              title={card.title}
              value={card.value}
              sub={card.sub}
              icon={card.icon}
              accent={card.accent}
            />
          ))}
        </div>

        {isAdmin && (
          <div className="mb-8 rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-600">
                  Admin queue
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">
                  {totalAdminQueue > 0
                    ? `${totalAdminQueue} approval item${totalAdminQueue > 1 ? 's' : ''} need attention`
                    : 'No approval items are waiting'}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Membership requests: {data.admin_queue?.membership_requests || 0}. Loan requests: {data.admin_queue?.loan_requests || 0}.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <ActionLink href="/approvals" label="Open approvals" icon={CheckCircle2} dark />
                <ActionLink href="/members" label="Open members" icon={Users} />
                <ActionLink href="/transactions" label="Open transactions" icon={BarChart3} />
              </div>
            </div>
          </div>
        )}

        {hasApprovedMembership && !isAdmin && (
          <div className="mb-8 rounded-3xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">
                  Quick actions
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">Move directly into your finance flows</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Use these shortcuts to fund your wallet, pay savings, request a new loan, or review your full transaction history.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <ActionLink href="/fund-wallet" label="Fund wallet" icon={Wallet} dark />
                <ActionLink href="/fund-wallet?action=pay&type=savings" label="Pay savings" icon={ArrowDownLeft} />
                <ActionLink href="/loans?action=request" label="Request loan" icon={CreditCard} />
                <ActionLink href="/transactions" label="Open transactions" icon={BarChart3} />
              </div>
            </div>
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3 rounded-3xl border border-slate-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <h2 className="text-lg font-black text-slate-900">Recent Activity</h2>
              <a href="/transactions" className="text-xs font-bold text-emerald-600 hover:underline">
                View all
              </a>
            </div>
            <div className="divide-y divide-slate-50">
              {(data.recent_transactions || []).length === 0 && (
                <p className="py-8 text-center text-sm text-slate-400">No recent activity available.</p>
              )}
              {(data.recent_transactions || []).map((transaction) => {
                const config = transactionConfig[transaction.type] || transactionConfig.top_up;
                const Icon = config.icon;
                return (
                  <div key={transaction.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${config.bg}`}>
                      <Icon size={16} className={config.color} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-800">{transaction.user_name}</p>
                      <p className="truncate text-xs text-slate-400">{transaction.description || transaction.group_name}</p>
                      <p className="mt-1 text-[10px] font-medium text-slate-300">{formatDateTime(transaction.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-900">{formatCurrency(transaction.amount)}</p>
                      <p className="text-[10px] text-slate-300">{transaction.group_name}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-2 rounded-3xl border border-slate-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <h2 className="text-lg font-black text-slate-900">Group Snapshot</h2>
              <BarChart3 size={18} className="text-slate-300" />
            </div>
            <div className="px-6 py-5">
              {(data.top_groups || []).length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-400">No group data available yet.</p>
              ) : (
                data.top_groups.map((group) => (
                  <div key={group.id} className="space-y-4">
                    <div>
                      <p className="text-sm font-black text-slate-900">{group.name}</p>
                      <p className="text-xs text-slate-400">{group.member_count} members</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Admin</p>
                        <p className="mt-1 text-sm font-black text-slate-800">{group.admin_name}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Balance</p>
                        <p className="mt-1 text-sm font-black text-emerald-600">{formatCurrency(group.balance)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
            <h2 className="text-lg font-black text-slate-900">Current Membership</h2>
            <a href="/groups" className="text-xs font-bold text-emerald-600 hover:underline">
              Open groups
            </a>
          </div>
          <div className="px-6 py-5">
            {data.membership ? (
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50">
                  <Shield size={18} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-lg font-black text-slate-900">{data.membership.group_name}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Role: {data.membership.role}. Status: {data.membership.join_status}.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                You do not have an approved group yet. Join or create one from the Groups page.
              </p>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
