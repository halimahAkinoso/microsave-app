import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Plus,
  RefreshCw,
  X,
  XCircle,
} from "lucide-react";

import DashboardLayout from "../components/DashboardLayout";
import { apiFetch } from "../services/api";

const formatCurrency = (value) => `NGN ${Number(value || 0).toLocaleString()}`;

const statusConfig = {
  pending: { bg: "bg-amber-100", text: "text-amber-700", label: "Pending" },
  active: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Active" },
  overdue: { bg: "bg-red-100", text: "text-red-700", label: "Overdue" },
  completed: { bg: "bg-slate-100", text: "text-slate-600", label: "Completed" },
  declined: { bg: "bg-rose-100", text: "text-rose-700", label: "Declined" },
};

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

const RequestLoanModal = ({ membership, onClose, onCreated }) => {
  const [form, setForm] = useState({ amount: "", purpose: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await apiFetch("/loans", {
        method: "POST",
        body: JSON.stringify({
          group_id: membership.group_id,
          amount: Number(form.amount),
          purpose: form.purpose,
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
            <h2 className="text-lg font-black text-slate-900">Request loan</h2>
            <p className="text-xs text-slate-400">This request will go to your group admin for review.</p>
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

          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Borrowing from</p>
            <p className="mt-1 text-sm font-black text-slate-900">{membership.group_name}</p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
              Amount
            </label>
            <input
              type="number"
              min="1"
              required
              value={form.amount}
              onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
              className="w-full rounded-xl border-2 border-slate-100 px-4 py-3 text-sm outline-none focus:border-emerald-500"
              placeholder="50000"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
              Purpose
            </label>
            <textarea
              required
              rows={3}
              value={form.purpose}
              onChange={(event) => setForm((current) => ({ ...current, purpose: event.target.value }))}
              className="w-full resize-none rounded-xl border-2 border-slate-100 px-4 py-3 text-sm outline-none focus:border-emerald-500"
              placeholder="What will the loan be used for?"
            />
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            Admin review checks savings history, active loans, and available group balance before approval.
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-emerald-500 py-3 font-bold text-white transition hover:bg-emerald-600 disabled:opacity-60"
          >
            {saving ? "Submitting..." : "Submit request"}
          </button>
        </form>
      </div>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const config = statusConfig[status] || statusConfig.pending;
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

const Loans = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [membership, setMembership] = useState(null);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [toast, setToast] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [processingLoanId, setProcessingLoanId] = useState(null);

  const isAdmin = membership?.role === "admin" && membership?.join_status === "approved";
  const isMember = membership?.role === "member" && membership?.join_status === "approved";
  const hasOpenLoan = useMemo(
    () => loans.some((loan) => ["pending", "active", "overdue"].includes(loan.status)),
    [loans]
  );

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 4000);
  };

  const loadPage = async () => {
    setLoading(true);
    try {
      const [membershipResponse, loanList] = await Promise.all([
        apiFetch("/groups/my-membership"),
        apiFetch("/loans"),
      ]);
      setMembership(membershipResponse.membership);
      setLoans(loanList);
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, []);

  useEffect(() => {
    if (!membership) {
      return;
    }

    if (
      membership.role === "member" &&
      membership.join_status === "approved" &&
      searchParams.get("action") === "request" &&
      !hasOpenLoan
    ) {
      setShowRequestModal(true);
      setSearchParams({}, { replace: true });
    }
  }, [membership, searchParams, setSearchParams, hasOpenLoan]);

  const filteredLoans = useMemo(() => {
    if (filter === "all") {
      return loans;
    }
    return loans.filter((loan) => loan.status === filter);
  }, [filter, loans]);

  const counts = useMemo(
    () =>
      ["pending", "active", "overdue", "completed", "declined"].reduce(
        (summary, status) => ({
          ...summary,
          [status]: loans.filter((loan) => loan.status === status).length,
        }),
        {}
      ),
    [loans]
  );

  const handleApproval = async (loanId, action) => {
    setProcessingLoanId(loanId);
    try {
      const response = await apiFetch(`/loans/${loanId}/${action}`, {
        method: "POST",
      });
      showToast(response.message, "success");
      await loadPage();
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setProcessingLoanId(null);
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
      {showRequestModal && membership && (
        <RequestLoanModal
          membership={membership}
          onClose={() => setShowRequestModal(false)}
          onCreated={loadPage}
        />
      )}

      <div className="mx-auto max-w-7xl px-8 py-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900">Loans</h1>
            <p className="mt-1 text-slate-500">
              {isAdmin
                ? "Review loan requests for your group and apply the eligibility test before approval."
                : "Track your loan requests and repayment progress."}
            </p>
            {membership && (
              <p className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-700">
                {membership.group_name} ({membership.role})
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
            {isMember && (
              <button
                onClick={() => setShowRequestModal(true)}
                disabled={hasOpenLoan}
                className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus size={16} />
                {hasOpenLoan ? "Loan request locked" : "Request loan"}
              </button>
            )}
          </div>
        </div>

        {!membership && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-700">
            Join a group before accessing the loan workflow.
          </div>
        )}

        {isAdmin && counts.pending > 0 && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-700">
            {counts.pending} pending loan request{counts.pending > 1 ? "s" : ""} need admin review.
          </div>
        )}

        {isMember && hasOpenLoan && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-700">
            You already have an open loan or pending loan request. Complete or resolve it before applying for another loan.
          </div>
        )}

        <div className="mb-6 flex flex-wrap gap-2">
          {["all", "pending", "active", "overdue", "completed", "declined"].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wide transition ${
                filter === status
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {status === "all"
                ? `All (${loans.length})`
                : `${statusConfig[status].label} (${counts[status] || 0})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          </div>
        ) : filteredLoans.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-20 text-center text-slate-400">
            <CreditCard size={42} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold">No loans found for this view.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLoans.map((loan) => {
              const eligibility = loan.eligibility;
              const progress = loan.repayment_progress || 0;
              const processing = processingLoanId === loan.id;
              return (
                <article
                  key={loan.id}
                  className={`rounded-3xl border bg-white p-6 shadow-sm ${
                    loan.can_admin_review ? "border-amber-200 ring-1 ring-amber-100" : "border-slate-100"
                  }`}
                >
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-black text-slate-900">{loan.borrower_name}</h2>
                      <p className="text-sm text-slate-500">{loan.group_name}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {loan.purpose || "No purpose provided"}
                      </p>
                    </div>
                    <StatusBadge status={loan.status} />
                  </div>

                  <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Amount</p>
                      <p className="mt-1 text-lg font-black text-slate-900">{formatCurrency(loan.amount)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Repaid</p>
                      <p className="mt-1 text-lg font-black text-emerald-600">
                        {formatCurrency(loan.amount_repaid)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Remaining</p>
                      <p className="mt-1 text-lg font-black text-rose-600">
                        {formatCurrency(loan.remaining_balance)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Progress</p>
                      <p className="mt-1 text-lg font-black text-slate-900">{progress}%</p>
                    </div>
                  </div>

                  {loan.status !== "pending" && (
                    <div className="mb-5">
                      <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-slate-400">
                        <span>Repayment progress</span>
                        <span className="text-slate-700">{progress}%</span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {eligibility && (
                    <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                          Eligibility check
                        </p>
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ${
                            eligibility.eligible
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {eligibility.eligible ? "Pass" : "Review"}
                        </span>
                      </div>
                      <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                        <p>Savings: {formatCurrency(eligibility.total_saved)}</p>
                        <p>Minimum savings required: {formatCurrency(eligibility.required_savings)}</p>
                        <p>Group balance: {formatCurrency(eligibility.group_balance)}</p>
                        <p>Open loan or pending request: {eligibility.has_open_loan ? "Yes" : "No"}</p>
                      </div>
                      {!eligibility.eligible && (
                        <p className="mt-3 text-sm font-semibold text-amber-700">{eligibility.message}</p>
                      )}
                    </div>
                  )}

                  {loan.can_admin_review && (
                    <div className="flex gap-3 border-t border-slate-100 pt-4">
                      <button
                        onClick={() => handleApproval(loan.id, "approve")}
                        disabled={processing}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-white transition hover:bg-emerald-600 disabled:opacity-60"
                      >
                        <CheckCircle2 size={16} />
                        {processing ? "Processing..." : "Approve"}
                      </button>
                      <button
                        onClick={() => handleApproval(loan.id, "decline")}
                        disabled={processing}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-3 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                      >
                        <XCircle size={16} />
                        Decline
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Loans;
