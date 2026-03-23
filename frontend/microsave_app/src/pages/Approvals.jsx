import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  CreditCard,
  RefreshCw,
  Shield,
  Users,
  X,
  XCircle,
} from 'lucide-react';

import DashboardLayout from '../components/DashboardLayout';
import { apiFetch } from '../services/api';

const formatCurrency = (value) => `NGN ${Number(value || 0).toLocaleString()}`;

const Toast = ({ message, type, onClose }) => (
  <div
    className={`fixed right-5 top-5 z-50 flex max-w-sm items-start gap-3 rounded-2xl px-5 py-4 text-sm shadow-2xl ${
      type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
    }`}
  >
    {type === 'error' ? (
      <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
    ) : (
      <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0" />
    )}
    <p className="flex-1 font-semibold">{message}</p>
    <button onClick={onClose} className="opacity-80 hover:opacity-100">
      <X size={16} />
    </button>
  </div>
);

const Approvals = () => {
  const [membership, setMembership] = useState(null);
  const [joinRequests, setJoinRequests] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState('');
  const [toast, setToast] = useState(null);

  const isAdmin = membership?.role === 'admin' && membership?.join_status === 'approved';
  const pendingLoans = useMemo(
    () => loans.filter((loan) => loan.status === 'pending'),
    [loans]
  );

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 4000);
  };

  const loadPage = async () => {
    setLoading(true);
    try {
      const membershipResponse = await apiFetch('/groups/my-membership');
      setMembership(membershipResponse.membership);

      if (
        membershipResponse.membership?.role === 'admin' &&
        membershipResponse.membership?.join_status === 'approved'
      ) {
        const [pendingMembers, loanList] = await Promise.all([
          apiFetch(`/groups/${membershipResponse.membership.group_id}/join-requests`).catch(() => []),
          apiFetch('/loans').catch(() => []),
        ]);
        setJoinRequests(Array.isArray(pendingMembers) ? pendingMembers : []);
        setLoans(Array.isArray(loanList) ? loanList : []);
      } else {
        setJoinRequests([]);
        setLoans([]);
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

  const handleLoanDecision = async (loanId, action) => {
    setProcessingId(`loan-${loanId}`);
    try {
      const response = await apiFetch(`/loans/${loanId}/${action}`, {
        method: 'POST',
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
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="mx-auto max-w-7xl px-8 py-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900">Approvals</h1>
            <p className="mt-1 text-slate-500">
              Review membership and loan requests for your current group.
            </p>
            {membership && (
              <p className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-700">
                {membership.group_name} ({membership.role})
              </p>
            )}
          </div>

          <button
            onClick={loadPage}
            className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm transition hover:bg-slate-50"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {!isAdmin && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-700">
            Only group admins can access approvals.
          </div>
        )}

        {isAdmin && (
          <>
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white">
                    <Users size={20} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-500">
                      Membership queue
                    </p>
                    <p className="mt-1 text-2xl font-black text-slate-900">{joinRequests.length}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white">
                    <CreditCard size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-500">
                      Loan queue
                    </p>
                    <p className="mt-1 text-2xl font-black text-slate-900">{pendingLoans.length}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-3xl border border-slate-100 bg-white shadow-sm">
                <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
                  <Clock3 size={16} className="text-amber-600" />
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Membership Requests</h2>
                    <p className="text-xs text-slate-400">Approve people joining your group.</p>
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

              <section className="rounded-3xl border border-slate-100 bg-white shadow-sm">
                <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
                  <Shield size={16} className="text-blue-600" />
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Loan Requests</h2>
                    <p className="text-xs text-slate-400">Approve only after eligibility review.</p>
                  </div>
                </div>
                <div className="px-6 py-5">
                  {pendingLoans.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                      No pending loan requests.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pendingLoans.map((loan) => (
                        <div key={loan.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-sm font-black text-slate-900">{loan.borrower_name}</p>
                              <p className="mt-1 text-xs text-slate-400">{loan.purpose || 'No purpose provided'}</p>
                            </div>
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-amber-700">
                              Pending
                            </span>
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-4">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Amount</p>
                              <p className="mt-1 text-sm font-black text-slate-900">{formatCurrency(loan.amount)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Saved</p>
                              <p className="mt-1 text-sm font-black text-emerald-600">
                                {formatCurrency(loan.eligibility?.total_saved)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Minimum savings</p>
                              <p className="mt-1 text-sm font-black text-slate-900">
                                {formatCurrency(loan.eligibility?.required_savings)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Funds Available</p>
                              <p className="mt-1 text-sm font-black text-blue-700">
                                {formatCurrency(loan.eligibility?.group_balance)}
                              </p>
                            </div>
                          </div>

                          {!loan.eligibility?.eligible && (
                            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                              {loan.eligibility?.message}
                            </div>
                          )}

                          <div className="mt-4 flex gap-2">
                            <button
                              onClick={() => handleLoanDecision(loan.id, 'approve')}
                              disabled={processingId === `loan-${loan.id}`}
                              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-600 disabled:opacity-60"
                            >
                              <CheckCircle2 size={14} />
                              Approve
                            </button>
                            <button
                              onClick={() => handleLoanDecision(loan.id, 'decline')}
                              disabled={processingId === `loan-${loan.id}`}
                              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                            >
                              <XCircle size={14} />
                              Decline
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Approvals;
