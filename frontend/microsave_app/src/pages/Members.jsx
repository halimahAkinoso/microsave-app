import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  ChevronDown,
  Clock3,
  CreditCard,
  Crown,
  PiggyBank,
  RefreshCw,
  UserCheck,
  Users,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';

import DashboardLayout from '../components/DashboardLayout';
import { apiFetch } from '../services/api';
import { getStoredSession } from '../hooks/useAuth';

const formatCurrency = (value) => `NGN ${Number(value || 0).toLocaleString()}`;

const Toast = ({ message, type, onClose }) => (
  <div
    className={`fixed right-5 top-5 z-50 flex max-w-sm items-start gap-3 rounded-2xl px-5 py-4 shadow-2xl ${
      type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
    }`}
  >
    {type === 'success' ? (
      <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0" />
    ) : (
      <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
    )}
    <p className="flex-1 text-sm font-semibold">{message}</p>
    <button onClick={onClose}>
      <X size={16} className="opacity-80 hover:opacity-100" />
    </button>
  </div>
);

const MemberActionButtons = ({ canRepayLoan = false }) => {
  const navigate = useNavigate();

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <button
        onClick={() => navigate('/fund-wallet')}
        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
      >
        <Wallet size={14} />
        Fund wallet
      </button>
      <button
        onClick={() => navigate('/fund-wallet?action=pay&type=savings')}
        className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-600"
      >
        <PiggyBank size={14} />
        Pay savings
      </button>
      {canRepayLoan && (
        <button
          onClick={() => navigate('/fund-wallet?action=pay&type=loan_repayment')}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-800"
        >
          <Banknote size={14} />
          Repay loan
        </button>
      )}
      <button
        onClick={() => navigate('/loans?action=request')}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
      >
        <CreditCard size={14} />
        Request loan
      </button>
    </div>
  );
};

const PersonalMemberCard = ({ member }) => {
  const currentLoan = member?.current_loan;

  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
            My membership record
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-900">{member.name}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {member.occupation || 'Member'}
            {member.phone ? ` | ${member.phone}` : ''}
          </p>
        </div>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-emerald-700">
          {member.role}
        </span>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total savings</p>
          <p className="mt-1 text-lg font-black text-emerald-600">{formatCurrency(member.total_savings)}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Wallet balance</p>
          <p className="mt-1 text-lg font-black text-slate-900">{formatCurrency(member.wallet_balance)}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Outstanding loan</p>
          <p className="mt-1 text-lg font-black text-rose-600">{formatCurrency(member.outstanding_balance)}</p>
        </div>
      </div>

      {currentLoan ? (
        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-blue-500">Current loan</p>
              <p className="mt-1 text-sm font-black text-slate-900">{currentLoan.purpose || 'Loan request'}</p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-wide text-blue-700">
              {currentLoan.status}
            </span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Loan amount</p>
              <p className="mt-1 text-sm font-black text-slate-900">{formatCurrency(currentLoan.amount)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Remaining</p>
              <p className="mt-1 text-sm font-black text-rose-600">{formatCurrency(currentLoan.remaining_balance)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Progress</p>
              <p className="mt-1 text-sm font-black text-emerald-600">{currentLoan.repayment_progress}%</p>
            </div>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${currentLoan.repayment_progress}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
          You do not have a current loan on this membership.
        </div>
      )}

      <MemberActionButtons canRepayLoan={Boolean(currentLoan)} />
    </section>
  );
};

const AdminMemberCard = ({ member, isCurrentUser, onRoleChange, updatingRole }) => {
  const currentLoan = member.current_loan;
  const isAdminMember = member.role === 'admin';

  return (
    <article className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-black text-slate-900">{member.name}</h3>
            {isAdminMember && <Crown size={14} className="text-amber-500" />}
            {isCurrentUser && (
              <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-blue-700">
                You
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {member.occupation || 'Member'}
            {member.phone ? ` | ${member.phone}` : ''}
          </p>
        </div>

        {isAdminMember ? (
          <span className="rounded-full bg-slate-900 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white">
            Admin
          </span>
        ) : (
          <div className="relative">
            <select
              value={member.role}
              disabled={updatingRole === member.id}
              onChange={(event) => onRoleChange(member.id, event.target.value)}
              className="appearance-none rounded-xl bg-slate-100 px-3 py-1.5 pr-7 text-xs font-bold text-slate-600 outline-none transition hover:bg-slate-200 disabled:opacity-50"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <ChevronDown size={11} className="pointer-events-none absolute right-2 top-2 text-slate-400" />
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Savings</p>
          <p className="mt-1 text-sm font-black text-emerald-600">{formatCurrency(member.total_savings)}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Current loan</p>
          <p className="mt-1 text-sm font-black text-slate-900">{formatCurrency(currentLoan?.amount || 0)}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Outstanding</p>
          <p className="mt-1 text-sm font-black text-rose-600">{formatCurrency(member.outstanding_balance)}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Progress</p>
          <p className="mt-1 text-sm font-black text-slate-900">{currentLoan?.repayment_progress || 0}%</p>
        </div>
      </div>

      {currentLoan ? (
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-slate-400">
            <span>{currentLoan.purpose || 'Loan request'}</span>
            <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-blue-700">
              {currentLoan.status}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${currentLoan.repayment_progress}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          No current loan on this member.
        </div>
      )}
    </article>
  );
};

const Members = () => {
  const [members, setMembers] = useState([]);
  const [membership, setMembership] = useState(null);
  const [joinRequests, setJoinRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingRole, setUpdatingRole] = useState(null);
  const [processingId, setProcessingId] = useState('');
  const [toast, setToast] = useState(null);

  const currentUserId = getStoredSession()?.user?.id;
  const isAdmin = membership?.role === 'admin' && membership?.join_status === 'approved';

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 4000);
  };

  const loadPage = async () => {
    setLoading(true);
    try {
      const membershipResponse = await apiFetch('/groups/my-membership');
      setMembership(membershipResponse.membership);

      if (membershipResponse.membership?.join_status === 'approved') {
        const requestTasks = [apiFetch('/members')];
        if (membershipResponse.membership.role === 'admin') {
          requestTasks.push(apiFetch(`/groups/${membershipResponse.membership.group_id}/join-requests`));
        }

        const [memberList, pendingJoinRequests = []] = await Promise.all(requestTasks);
        setMembers(Array.isArray(memberList) ? memberList : []);
        setJoinRequests(Array.isArray(pendingJoinRequests) ? pendingJoinRequests : []);
      } else {
        setMembers([]);
        setJoinRequests([]);
      }
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, []);

  const adminCount = useMemo(() => members.filter((member) => member.role === 'admin').length, [members]);
  const onLoanCount = useMemo(
    () => members.filter((member) => Boolean(member.current_loan)).length,
    [members]
  );
  const personalMember = members.find((member) => member.user_id === currentUserId) || null;

  const handleRoleChange = async (memberId, newRole) => {
    setUpdatingRole(memberId);
    try {
      const response = await apiFetch(`/members/${memberId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      showToast(response.message, 'success');
      await loadPage();
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setUpdatingRole(null);
    }
  };

  const handleMembershipDecision = async (memberId, action) => {
    if (!membership?.group_id) return;
    setProcessingId(`member-${memberId}`);
    try {
      const response = await apiFetch(`/groups/${membership.group_id}/join-requests/${memberId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      });
      showToast(response.message, 'success');
      await loadPage();
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setProcessingId('');
    }
  };

  return (
    <DashboardLayout>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-slate-900">Members</h1>
              {isAdmin && (
                <span className="flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-xs font-black text-purple-700">
                  <Crown size={11} />
                  Admin View
                </span>
              )}
            </div>
            <p className="mt-1 font-medium text-slate-500">
              {membership ? `${membership.group_name} member records.` : 'Join a group to view members.'}
            </p>
          </div>
          <button
            onClick={loadPage}
            className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm transition hover:bg-slate-50"
          >
            <RefreshCw size={15} className="text-slate-500" />
          </button>
        </div>

        {!membership && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-700">
            You need an approved group membership before this page becomes available.
          </div>
        )}

        {membership && (
          <>
            {isAdmin && (
              <section className="mb-6 rounded-3xl border border-amber-200 bg-white shadow-sm">
                <div className="flex items-center justify-between gap-4 border-b border-amber-100 px-6 py-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <Clock3 size={16} className="text-amber-600" />
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-600">
                        Membership approvals
                      </p>
                    </div>
                    <h2 className="mt-2 text-xl font-black text-slate-900">Pending join requests</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Review and approve new members directly from the Members page.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-amber-700">
                      {joinRequests.length} pending
                    </span>
                    <a
                      href="/approvals"
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                    >
                      <Users size={14} />
                      Full queue
                    </a>
                  </div>
                </div>
                <div className="px-6 py-5">
                  {joinRequests.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                      No pending membership requests.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {joinRequests.map((request) => (
                        <div key={request.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-sm font-black text-slate-900">{request.name}</p>
                              <p className="mt-1 text-xs text-slate-400">
                                {request.occupation || 'Member'}
                                {request.phone ? ` | ${request.phone}` : ''}
                                {request.email ? ` | ${request.email}` : ''}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleMembershipDecision(request.id, 'approve')}
                                disabled={processingId === `member-${request.id}`}
                                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-600 disabled:opacity-60"
                              >
                                <CheckCircle2 size={14} />
                                Approve
                              </button>
                              <button
                                onClick={() => handleMembershipDecision(request.id, 'reject')}
                                disabled={processingId === `member-${request.id}`}
                                className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                              >
                                <XCircle size={14} />
                                Reject
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-100 bg-white p-5 text-center shadow-sm">
                <p className="text-3xl font-black text-slate-900">{members.length}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Visible records</p>
              </div>
              <div className="rounded-2xl border border-purple-100 bg-purple-50 p-5 text-center">
                <p className="text-3xl font-black text-purple-700">{adminCount}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-purple-400">Admins</p>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 text-center">
                <p className="text-3xl font-black text-blue-700">{onLoanCount}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-blue-400">Currently on loan</p>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
              </div>
            ) : isAdmin ? (
              members.length === 0 ? (
                <div className="py-20 text-center text-slate-400">
                  <Users size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-semibold">No members found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {members.map((member) => (
                    <AdminMemberCard
                      key={member.id}
                      member={member}
                      isCurrentUser={member.user_id === currentUserId}
                      onRoleChange={handleRoleChange}
                      updatingRole={updatingRole}
                    />
                  ))}
                </div>
              )
            ) : personalMember ? (
              <PersonalMemberCard member={personalMember} />
            ) : (
              <div className="py-20 text-center text-slate-400">
                <UserCheck size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-semibold">No member record found.</p>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Members;
