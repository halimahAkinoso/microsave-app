import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Clock3,
  CreditCard,
  Crown,
  PiggyBank,
  Plus,
  RefreshCw,
  Shield,
  Users,
  Wallet,
  X,
  XCircle,
} from "lucide-react";

import DashboardLayout from "../components/DashboardLayout";
import { apiFetch } from "../services/api";

const formatCurrency = (value) => `NGN ${Number(value || 0).toLocaleString()}`;

const Toast = ({ message, type, onClose }) => (
  <div
    className={`fixed right-5 top-5 z-50 flex max-w-sm items-start gap-3 rounded-2xl px-5 py-4 text-sm shadow-2xl ${
      type === "error" ? "bg-red-500 text-white" : "bg-emerald-500 text-white"
    }`}
  >
    {type === "error" ? (
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

const CreateGroupModal = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({
    name: "",
    description: "",
    savings_amount: "",
    savings_period: "monthly",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const updateField = (field, value) =>
    setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await apiFetch("/groups", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          savings_amount: Number(form.savings_amount || 0),
        }),
      });
      await onCreated();
      onClose();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-black text-slate-900">Create savings group</h2>
            <p className="text-xs text-slate-400">The creator becomes the sole group admin.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
              Group name
            </label>
            <input
              required
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              className="w-full rounded-xl border-2 border-slate-100 px-4 py-3 text-sm outline-none focus:border-emerald-500"
              placeholder="Example: Ilupeju Traders Circle"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              className="w-full resize-none rounded-xl border-2 border-slate-100 px-4 py-3 text-sm outline-none focus:border-emerald-500"
              rows={3}
              placeholder="What is the purpose of this group?"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Savings target
              </label>
              <input
                type="number"
                min="0"
                value={form.savings_amount}
                onChange={(event) => updateField("savings_amount", event.target.value)}
                className="w-full rounded-xl border-2 border-slate-100 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                placeholder="5000"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Period
              </label>
              <select
                value={form.savings_period}
                onChange={(event) => updateField("savings_period", event.target.value)}
                className="w-full rounded-xl border-2 border-slate-100 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-emerald-500 py-3 font-bold text-white transition hover:bg-emerald-600 disabled:opacity-60"
          >
            {saving ? "Creating..." : "Create group"}
          </button>
        </form>
      </div>
    </div>
  );
};

const MemberActionButtons = ({ canRepayLoan = false }) => {
  const navigate = useNavigate();

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <button
        onClick={() => navigate("/fund-wallet")}
        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
      >
        <Wallet size={14} />
        Fund wallet
      </button>
      <button
        onClick={() => navigate("/fund-wallet?action=pay&type=savings")}
        className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-600"
      >
        <PiggyBank size={14} />
        Pay savings
      </button>
      {canRepayLoan && (
        <button
          onClick={() => navigate("/fund-wallet?action=pay&type=loan_repayment")}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-800"
        >
          <Banknote size={14} />
          Repay loan
        </button>
      )}
      <button
        onClick={() => navigate("/loans?action=request")}
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
    <section className="space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
              My profile
            </p>
            <h3 className="mt-2 text-xl font-black text-slate-900">{member.name}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {member.occupation || "Member"}
              {member.phone ? ` | ${member.phone}` : ""}
            </p>
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-emerald-700">
            {member.role}
          </span>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Total savings
            </p>
            <p className="mt-1 text-lg font-black text-emerald-600">
              {formatCurrency(member.total_savings)}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Wallet balance
            </p>
            <p className="mt-1 text-lg font-black text-slate-900">
              {formatCurrency(member.wallet_balance)}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Outstanding loan
            </p>
            <p className="mt-1 text-lg font-black text-rose-600">
              {formatCurrency(member.outstanding_balance)}
            </p>
          </div>
        </div>

        {currentLoan ? (
          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-blue-500">
                  Current loan
                </p>
                <p className="mt-1 text-sm font-black text-slate-900">
                  {currentLoan.purpose || "Loan request"}
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-wide text-blue-700">
                {currentLoan.status}
              </span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Loan amount
                </p>
                <p className="mt-1 text-base font-black text-slate-900">
                  {formatCurrency(currentLoan.amount)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Remaining
                </p>
                <p className="mt-1 text-base font-black text-rose-600">
                  {formatCurrency(currentLoan.remaining_balance)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Progress
                </p>
                <p className="mt-1 text-base font-black text-emerald-600">
                  {currentLoan.repayment_progress}%
                </p>
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
          <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
            No current loan on this membership.
          </div>
        )}

        <MemberActionButtons canRepayLoan={Boolean(currentLoan)} />
      </div>
    </section>
  );
};

const GroupCard = ({ group, myMembership, onRefresh, onNotify }) => {
  const [expanded, setExpanded] = useState(false);
  const [members, setMembers] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [workingAction, setWorkingAction] = useState("");

  const viewerMembership = group.viewer_membership;
  const isAdmin = viewerMembership?.role === "admin" && viewerMembership?.join_status === "approved";
  const isMyGroup =
    myMembership?.group_id === group.id && myMembership?.join_status === "approved";
  const hasLockedMembership =
    myMembership && ["approved", "pending"].includes(myMembership.join_status);
  const canJoin =
    !hasLockedMembership &&
    (!viewerMembership || viewerMembership.join_status === "rejected");

  const pendingLoans = useMemo(
    () => loans.filter((loan) => loan.status === "pending"),
    [loans]
  );
  const onLoanMembers = useMemo(
    () => loans.filter((loan) => ["active", "overdue"].includes(loan.status)),
    [loans]
  );
  const personalMember = members.find((member) => member.is_self) || members[0] || null;

  const loadDetails = async () => {
    if (!isMyGroup && !isAdmin) {
      return;
    }

    setLoadingDetails(true);
    try {
      const [memberList, loanList, requests] = await Promise.all([
        apiFetch("/members"),
        apiFetch("/loans"),
        isAdmin ? apiFetch(`/groups/${group.id}/join-requests`) : Promise.resolve([]),
      ]);
      setMembers(Array.isArray(memberList) ? memberList : []);
      setLoans(Array.isArray(loanList) ? loanList : []);
      setJoinRequests(Array.isArray(requests) ? requests : []);
    } catch (error) {
      onNotify(error.message, "error");
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    if (expanded) {
      loadDetails();
    }
  }, [expanded]);

  const handleJoin = async () => {
    setWorkingAction("join");
    try {
      const response = await apiFetch(`/groups/${group.id}/join`, { method: "POST" });
      onNotify(response.message, "success");
      await onRefresh();
    } catch (error) {
      onNotify(error.message, "error");
    } finally {
      setWorkingAction("");
    }
  };

  const handleRequestDecision = async (memberId, action) => {
    setWorkingAction(`${action}-${memberId}`);
    try {
      const response = await apiFetch(`/groups/${group.id}/join-requests/${memberId}`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });
      onNotify(response.message, "success");
      await loadDetails();
      await onRefresh();
    } catch (error) {
      onNotify(error.message, "error");
    } finally {
      setWorkingAction("");
    }
  };

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
      <div className="p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
              <Shield size={22} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">{group.name}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {group.description || "No description yet."}
              </p>
              <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-amber-600">
                <Crown size={12} />
                <span>{group.admin_name}</span>
              </div>
            </div>
          </div>

          {isAdmin ? (
            <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-white">
              Admin
            </span>
          ) : viewerMembership?.join_status === "pending" ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-amber-700">
              Pending
            </span>
          ) : isMyGroup ? (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-emerald-700">
              Member
            </span>
          ) : null}
        </div>

        <div className="mb-5 grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Members
            </p>
            <p className="mt-1 text-xl font-black text-slate-900">{group.member_count}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Balance
            </p>
            <p className="mt-1 text-sm font-black text-emerald-600">
              {formatCurrency(group.balance)}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Savings target
            </p>
            <p className="mt-1 text-sm font-black text-slate-700">
              {formatCurrency(group.savings_amount)}/{group.savings_period}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setExpanded((current) => !current)}
            className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
          >
            {expanded ? "Hide details" : "Open group"}
          </button>

          {canJoin && (
            <button
              onClick={handleJoin}
              disabled={workingAction === "join"}
              className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-600 disabled:opacity-60"
            >
              {workingAction === "join" ? "Requesting..." : "Request to join"}
            </button>
          )}

          {!canJoin && !viewerMembership && hasLockedMembership && (
            <span className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-500">
              One active group flow only
            </span>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/70 px-6 py-5">
          {loadingDetails ? (
            <div className="flex justify-center py-8">
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
            </div>
          ) : isAdmin ? (
            <div className="space-y-6">
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <Clock3 size={14} className="text-amber-600" />
                  <h3 className="text-xs font-black uppercase tracking-wide text-amber-700">
                    Membership requests ({joinRequests.length})
                  </h3>
                </div>

                {joinRequests.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-4 text-sm text-slate-400">
                    No pending membership requests.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {joinRequests.map((request) => (
                      <div
                        key={request.id}
                        className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-sm font-black text-amber-700">
                          {request.name?.slice(0, 1) || "U"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-900">{request.name}</p>
                          <p className="truncate text-xs text-slate-400">
                            {request.occupation || "Member"}
                            {request.phone ? ` | ${request.phone}` : ""}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRequestDecision(request.id, "approve")}
                            disabled={workingAction === `approve-${request.id}`}
                            className="rounded-lg bg-emerald-100 p-2 text-emerald-700 transition hover:bg-emerald-200 disabled:opacity-60"
                          >
                            <CheckCircle2 size={15} />
                          </button>
                          <button
                            onClick={() => handleRequestDecision(request.id, "reject")}
                            disabled={workingAction === `reject-${request.id}`}
                            className="rounded-lg bg-red-100 p-2 text-red-700 transition hover:bg-red-200 disabled:opacity-60"
                          >
                            <XCircle size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h3 className="mb-3 text-xs font-black uppercase tracking-wide text-slate-600">
                  Loan requests ({pendingLoans.length})
                </h3>
                {pendingLoans.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-4 text-sm text-slate-400">
                    No pending loan requests.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingLoans.map((loan) => (
                      <div
                        key={loan.id}
                        className="rounded-2xl border border-amber-200 bg-white p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-black text-slate-900">
                              {loan.borrower_name}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {loan.purpose || "No purpose provided"}
                            </p>
                          </div>
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-amber-700">
                            Pending
                          </span>
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-4">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                              Amount
                            </p>
                            <p className="mt-1 text-sm font-black text-slate-900">
                              {formatCurrency(loan.amount)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                              Saved
                            </p>
                            <p className="mt-1 text-sm font-black text-emerald-600">
                              {formatCurrency(loan.eligibility?.total_saved)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                              Minimum savings
                            </p>
                            <p className="mt-1 text-sm font-black text-slate-900">
                              {formatCurrency(loan.eligibility?.required_savings)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                              Decision
                            </p>
                            <p className="mt-1 text-sm font-black text-amber-700">
                              {loan.eligibility?.eligible ? "Eligible" : "Review needed"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h3 className="mb-3 text-xs font-black uppercase tracking-wide text-slate-600">
                  Members on loan ({onLoanMembers.length})
                </h3>
                {onLoanMembers.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-4 text-sm text-slate-400">
                    No active or overdue loans.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {onLoanMembers.map((loan) => (
                      <div key={loan.id} className="rounded-2xl border border-slate-100 bg-white p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-black text-slate-900">{loan.borrower_name}</p>
                            <p className="mt-1 text-xs text-slate-400">
                              {loan.purpose || "Loan"}
                            </p>
                          </div>
                          <span className="rounded-full bg-blue-100 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-blue-700">
                            {loan.status}
                          </span>
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                              Loan amount
                            </p>
                            <p className="mt-1 text-sm font-black text-slate-900">
                              {formatCurrency(loan.amount)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                              Remaining
                            </p>
                            <p className="mt-1 text-sm font-black text-rose-600">
                              {formatCurrency(loan.remaining_balance)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                              Progress
                            </p>
                            <p className="mt-1 text-sm font-black text-emerald-600">
                              {loan.repayment_progress}%
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${loan.repayment_progress}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h3 className="mb-3 text-xs font-black uppercase tracking-wide text-slate-600">
                  Approved members ({members.length})
                </h3>
                {members.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-4 text-sm text-slate-400">
                    No approved members yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="rounded-2xl border border-slate-100 bg-white p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-black text-slate-900">{member.name}</p>
                              {member.role === "admin" && (
                                <span className="rounded-full bg-slate-900 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-white">
                                  Admin
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-slate-400">
                              {member.occupation || "Member"}
                              {member.phone ? ` | ${member.phone}` : ""}
                            </p>
                          </div>
                          {member.current_loan ? (
                            <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-blue-700">
                              On loan
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500">
                              No loan
                            </span>
                          )}
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-4">
                          <div className="rounded-2xl bg-slate-50 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                              Savings
                            </p>
                            <p className="mt-1 text-sm font-black text-emerald-600">
                              {formatCurrency(member.total_savings)}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-slate-50 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                              Current loan
                            </p>
                            <p className="mt-1 text-sm font-black text-slate-900">
                              {formatCurrency(member.current_loan?.amount || 0)}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-slate-50 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                              Outstanding
                            </p>
                            <p className="mt-1 text-sm font-black text-rose-600">
                              {formatCurrency(member.outstanding_balance)}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-slate-50 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                              Progress
                            </p>
                            <p className="mt-1 text-sm font-black text-slate-900">
                              {member.current_loan?.repayment_progress || 0}%
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          ) : isMyGroup && personalMember ? (
            <PersonalMemberCard member={personalMember} />
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
              Join this group to unlock member details, wallet actions, payments, and loan requests.
            </div>
          )}
        </div>
      )}
    </article>
  );
};

const MembershipOnboarding = ({ membership, onCreateGroup }) => {
  const navigate = useNavigate();

  if (membership?.join_status === "pending") {
    return (
      <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-6">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-600">
          Membership pending
        </p>
        <h2 className="mt-2 text-2xl font-black text-slate-900">
          Your join request is waiting for admin approval
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          You already requested access to <strong>{membership.group_name}</strong>. Once approved,
          your account will unlock savings, wallet payments, loan requests, and group chat.
        </p>
      </div>
    );
  }

  if (membership?.join_status === "approved") {
    return null;
  }

  return (
    <div className="mb-6 rounded-3xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white p-6">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">
        Group onboarding
      </p>
      <h2 className="mt-2 text-2xl font-black text-slate-900">
        Join a group before using savings and loan features
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
        Choose one existing group below and request membership, or create your own group and
        become the admin. Your savings, loans, and repayments will be attached to the
        approved group.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          onClick={onCreateGroup}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-600"
        >
          <Plus size={16} />
          Create group
        </button>
        <button
          onClick={() => navigate("/dashboard")}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
        >
          <Shield size={16} />
          View dashboard
        </button>
      </div>
    </div>
  );
};

const Groups = () => {
  const [groups, setGroups] = useState([]);
  const [myMembership, setMyMembership] = useState(null);
  const [adminRequests, setAdminRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [processingRequestId, setProcessingRequestId] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 4000);
  };

  const loadPage = async () => {
    setLoading(true);
    try {
      const [groupList, membershipResponse] = await Promise.all([
        apiFetch("/groups"),
        apiFetch("/groups/my-membership"),
      ]);
      setGroups(groupList);
      setMyMembership(membershipResponse.membership);
      if (
        membershipResponse.membership?.role === "admin" &&
        membershipResponse.membership?.join_status === "approved"
      ) {
        const pending = await apiFetch(
          `/groups/${membershipResponse.membership.group_id}/join-requests`
        ).catch(() => []);
        setAdminRequests(Array.isArray(pending) ? pending : []);
      } else {
        setAdminRequests([]);
      }
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, []);

  const canCreateGroup = !myMembership;
  const isAdmin =
    myMembership?.role === "admin" && myMembership?.join_status === "approved";

  const handleAdminRequestDecision = async (memberId, action) => {
    if (!myMembership?.group_id) {
      return;
    }
    setProcessingRequestId(memberId);
    try {
      const response = await apiFetch(
        `/groups/${myMembership.group_id}/join-requests/${memberId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ action }),
        }
      );
      showToast(response.message, "success");
      await loadPage();
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setProcessingRequestId(null);
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
      {showCreateModal && (
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          onCreated={loadPage}
        />
      )}

      <div className="mx-auto max-w-7xl px-8 py-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900">Groups</h1>
            <p className="mt-1 text-slate-500">
              Members can belong to only one active group. Admins manage membership and loan approvals.
            </p>
            {myMembership && (
              <p className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-700">
                Current membership: {myMembership.group_name} ({myMembership.role})
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={loadPage}
              className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              <RefreshCw size={16} />
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              disabled={!canCreateGroup}
              className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={16} />
              Create group
            </button>
          </div>
        </div>

        <MembershipOnboarding
          membership={myMembership}
          onCreateGroup={() => setShowCreateModal(true)}
        />

        {isAdmin && (
          <section className="mb-6 rounded-3xl border border-amber-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-amber-100 px-6 py-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-600">
                  Admin approvals
                </p>
                <h2 className="mt-2 text-xl font-black text-slate-900">
                  Membership requests
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Approve or reject people asking to join {myMembership.group_name}. This same queue is also available on Members and Approvals.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-amber-700">
                  {adminRequests.length} pending
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
              {adminRequests.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                  No membership requests are waiting for approval.
                </div>
              ) : (
                <div className="space-y-3">
                  {adminRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-sm font-black text-amber-700">
                        {request.name?.slice(0, 1) || "U"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-slate-900">
                          {request.name}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          {request.occupation || "Member"}
                          {request.phone ? ` | ${request.phone}` : ""}
                          {request.email ? ` | ${request.email}` : ""}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAdminRequestDecision(request.id, "approve")}
                          disabled={processingRequestId === request.id}
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-600 disabled:opacity-60"
                        >
                          <CheckCircle2 size={14} />
                          Approve
                        </button>
                        <button
                          onClick={() => handleAdminRequestDecision(request.id, "reject")}
                          disabled={processingRequestId === request.id}
                          className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                        >
                          <XCircle size={14} />
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {!canCreateGroup && myMembership?.join_status === "approved" && (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
            Group creation is disabled because this account already has an approved group.
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-20 text-center text-slate-400">
            <Users size={42} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold">No groups available yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {groups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                myMembership={myMembership}
                onRefresh={loadPage}
                onNotify={showToast}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Groups;

