import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight,
  Banknote,
  Clock3,
  CreditCard,
  Crown,
  PiggyBank,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Wallet,
} from 'lucide-react';

import DashboardLayout from '../components/DashboardLayout';
import { apiFetch } from '../services/api';
import { getStoredSession } from '../hooks/useAuth';

const formatCurrency = (value) => `NGN ${Number(value || 0).toLocaleString()}`;

const typeConfig = {
  contribution: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400', label: 'Savings', icon: TrendingUp },
  savings: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400', label: 'Savings', icon: TrendingUp },
  loan: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400', label: 'Loan Disbursed', icon: TrendingUp },
  loan_repayment: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-400', label: 'Loan Repayment', icon: TrendingDown },
  top_up: { bg: 'bg-teal-50', text: 'text-teal-700', dot: 'bg-teal-400', label: 'Top Up', icon: TrendingUp },
};

const getTypeConfig = (type) =>
  typeConfig[type] || {
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    dot: 'bg-slate-400',
    label: type,
    icon: ArrowLeftRight,
  };

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return `${date.toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })} ${date.toLocaleTimeString('en-NG', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
};

const Transactions = () => {
  const navigate = useNavigate();
  const currentUserId = getStoredSession()?.user?.id;

  const [transactions, setTransactions] = useState([]);
  const [membership, setMembership] = useState(null);
  const [currentMember, setCurrentMember] = useState(null);
  const [adminQueue, setAdminQueue] = useState({ pendingMemberships: 0, pendingLoans: 0 });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadPage = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const membershipResponse = await apiFetch('/groups/my-membership');
      const activeMembership = membershipResponse.membership;
      setMembership(activeMembership);

      const transactionList = await apiFetch('/transactions');
      setTransactions(Array.isArray(transactionList) ? transactionList : []);
      setCurrentMember(null);
      setAdminQueue({ pendingMemberships: 0, pendingLoans: 0 });

      if (activeMembership?.join_status === 'approved') {
        if (activeMembership.role === 'admin') {
          const [joinRequests, loans] = await Promise.all([
            apiFetch(`/groups/${activeMembership.group_id}/join-requests`),
            apiFetch('/loans'),
          ]);
          setAdminQueue({
            pendingMemberships: Array.isArray(joinRequests) ? joinRequests.length : 0,
            pendingLoans: Array.isArray(loans) ? loans.filter((loan) => loan.status === 'pending').length : 0,
          });
        } else {
          const memberList = await apiFetch('/members');
          const personalRecord = Array.isArray(memberList)
            ? memberList.find((member) => member.user_id === currentUserId) || null
            : null;
          setCurrentMember(personalRecord);
        }
      }
    } catch (error) {
      setErrorMessage(error.message || 'Could not load transactions right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, []);

  const membershipApproved = membership?.join_status === 'approved';
  const isAdmin = membershipApproved && membership?.role === 'admin';
  const isPendingMembership = membership?.join_status === 'pending';

  const filteredTransactions = useMemo(
    () =>
      transactions.filter((transaction) => {
        if (filterType !== 'all' && transaction.type !== filterType) return false;
        if (dateFrom && new Date(transaction.created_at) < new Date(dateFrom)) return false;
        if (dateTo && new Date(transaction.created_at) > new Date(`${dateTo}T23:59:59`)) return false;
        return true;
      }),
    [transactions, filterType, dateFrom, dateTo]
  );

  const inboundTypes = ['contribution', 'savings', 'loan', 'top_up'];
  const totalIn = filteredTransactions
    .filter((transaction) => inboundTypes.includes(transaction.type))
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const totalOut = filteredTransactions
    .filter((transaction) => !inboundTypes.includes(transaction.type))
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const allTypes = [...new Set(transactions.map((transaction) => transaction.type))];

  const renderContextCard = () => {
    if (!membership) {
      return (
        <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-600">Membership needed</p>
              <h2 className="mt-2 text-2xl font-black text-slate-900">Join a group to start savings activity</h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                Wallet top-ups can exist before membership, but savings, loan repayment, and borrowing flows only become active after you join an approved group.
              </p>
            </div>
            <button
              onClick={() => navigate('/groups')}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              <UserPlus size={16} />
              Join a group
            </button>
          </div>
        </div>
      );
    }

    if (isPendingMembership) {
      return (
        <div className="mb-6 rounded-3xl border border-blue-100 bg-blue-50 p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Pending approval</p>
              <h2 className="mt-2 text-2xl font-black text-slate-900">Your group request is awaiting admin review</h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                You can still review any wallet history already tied to your account, but savings and loan actions stay blocked until the group admin approves your request.
              </p>
            </div>
            <button
              onClick={() => navigate('/groups')}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-100"
            >
              <Clock3 size={16} />
              View membership status
            </button>
          </div>
        </div>
      );
    }

    if (isAdmin) {
      return (
        <div className="mb-6 rounded-3xl border border-purple-100 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-purple-500">Admin queue</p>
              <h2 className="mt-2 text-2xl font-black text-slate-900">{membership.group_name} transaction scope</h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                This feed shows transactions across your managed group. Use the approval queue to process join requests and loan requests before they affect the ledger.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center">
                <p className="text-2xl font-black text-slate-900">{adminQueue.pendingMemberships}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pending members</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center">
                <p className="text-2xl font-black text-slate-900">{adminQueue.pendingLoans}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pending loans</p>
              </div>
              <button
                onClick={() => navigate('/approvals')}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                <Crown size={16} />
                Open approvals
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="mb-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-500">My actions</p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">{membership.group_name} personal finance view</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
              Review your transaction history here, then jump straight into wallet funding, savings payments, loan repayment, or a new loan request.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate('/fund-wallet')}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800"
            >
              <Wallet size={14} />
              Fund wallet
            </button>
            <button
              onClick={() => navigate('/fund-wallet?action=pay&type=savings')}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-600"
            >
              <PiggyBank size={14} />
              Pay savings
            </button>
            {currentMember?.current_loan && (
              <button
                onClick={() => navigate('/fund-wallet?action=pay&type=loan_repayment')}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-800"
              >
                <Banknote size={14} />
                Repay loan
              </button>
            )}
            <button
              onClick={() => navigate('/loans?action=request')}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <CreditCard size={14} />
              Request loan
            </button>
          </div>
        </div>

        {currentMember && (
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total savings</p>
              <p className="mt-1 text-lg font-black text-emerald-600">{formatCurrency(currentMember.total_savings)}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Wallet balance</p>
              <p className="mt-1 text-lg font-black text-slate-900">{formatCurrency(currentMember.wallet_balance)}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Outstanding loan</p>
              <p className="mt-1 text-lg font-black text-rose-600">{formatCurrency(currentMember.outstanding_balance)}</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-slate-900">Transactions</h1>
              {isAdmin && (
                <span className="flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-xs font-black text-purple-700">
                  <Crown size={11} />
                  Admin View
                </span>
              )}
            </div>
            <p className="mt-1 font-medium text-slate-500">
              {isAdmin
                ? 'Transactions scoped to your managed group.'
                : membershipApproved
                  ? 'Your personal transaction history.'
                  : 'Wallet history and membership readiness.'}
            </p>
          </div>
          <button onClick={loadPage} className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm transition hover:bg-slate-50">
            <RefreshCw size={16} className="text-slate-500" />
          </button>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">
            {errorMessage}
          </div>
        )}

        {renderContextCard()}

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 text-center shadow-sm">
            <p className="text-2xl font-black text-slate-900">{filteredTransactions.length}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Transactions</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-center">
            <p className="text-2xl font-black text-emerald-700">{formatCurrency(totalIn)}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-emerald-400">Total inflow</p>
          </div>
          <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-center">
            <p className="text-2xl font-black text-red-600">{formatCurrency(totalOut)}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-red-400">Total outflow</p>
          </div>
        </div>

        <div className="mb-6 space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">Filters</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <select
              value={filterType}
              onChange={(event) => setFilterType(event.target.value)}
              className="rounded-xl border-2 border-slate-100 bg-white px-4 py-2.5 text-sm font-semibold outline-none focus:border-emerald-500"
            >
              <option value="all">All Types</option>
              {allTypes.map((type) => (
                <option key={type} value={type}>
                  {getTypeConfig(type).label}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="rounded-xl border-2 border-slate-100 px-4 py-2.5 text-sm font-semibold outline-none focus:border-emerald-500"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="rounded-xl border-2 border-slate-100 px-4 py-2.5 text-sm font-semibold outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-20 text-center text-slate-400 shadow-sm">
            <ArrowLeftRight size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold">No transactions found.</p>
            <p className="mt-1 text-sm text-slate-400">
              {membershipApproved
                ? isAdmin
                  ? 'Your group has no transactions in the selected range.'
                  : 'Your account has no transactions in the selected range.'
                : 'Once you start topping up or receive group approval, activity will appear here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className={`grid gap-4 border-b border-slate-100 bg-slate-50 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 ${isAdmin ? 'grid-cols-6' : 'grid-cols-5'}`}>
              {isAdmin && <span>Member</span>}
              <span>Date & Time</span>
              <span>Type</span>
              <span>Group</span>
              <span>Description</span>
              <span className="text-right">Amount</span>
            </div>
            <div className="divide-y divide-slate-50">
              {filteredTransactions.map((transaction) => {
                const config = getTypeConfig(transaction.type);
                const Icon = config.icon;
                const isInbound = inboundTypes.includes(transaction.type);
                return (
                  <div key={transaction.id} className={`grid items-center gap-4 px-6 py-4 transition hover:bg-slate-50/60 ${isAdmin ? 'grid-cols-6' : 'grid-cols-5'}`}>
                    {isAdmin && (
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-800">{transaction.user_name}</p>
                      </div>
                    )}
                    <div className="text-xs font-bold text-slate-700">{formatDate(transaction.created_at)}</div>
                    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-black ${config.bg} ${config.text}`}>
                      <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${config.dot}`} />
                      {config.label}
                    </span>
                    <p className="truncate text-xs font-semibold text-slate-500">{transaction.group_name || '-'}</p>
                    <p className="truncate text-xs text-slate-400">{transaction.description || '-'}</p>
                    <div className="flex items-center justify-end gap-1.5">
                      <Icon size={13} className={isInbound ? 'text-emerald-500' : 'text-red-400'} />
                      <p className={`text-sm font-black ${isInbound ? 'text-emerald-600' : 'text-red-500'}`}>
                        {isInbound ? '+' : '-'}
                        {formatCurrency(transaction.amount)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Transactions;
