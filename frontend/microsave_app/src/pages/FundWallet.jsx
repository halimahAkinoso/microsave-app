import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import {
  Wallet, CreditCard, CheckCircle, AlertTriangle,
  RefreshCw, Banknote, PiggyBank, ArrowRight, Zap
} from 'lucide-react';

const API = 'http://localhost:8000';
const fmt = (n) => `₦${Number(n).toLocaleString()}`;

const DEMO_CARDS = [
  { number: '4084 0840 8408 4081', bank: 'GTBank', type: 'Visa' },
  { number: '5531 8866 5214 2950', bank: 'Access Bank', type: 'Mastercard' },
];
const QUICK_AMOUNTS = [1000, 2000, 5000, 10000, 20000, 50000];

// ── Wallet Balance Card ─────────────────────────────────────────────────────
const BalanceCard = ({ wallet }) => (
  <div className="bg-gradient-to-br from-slate-900 to-slate-700 rounded-3xl p-7 text-white shadow-2xl">
    <div className="flex items-center gap-3 mb-5">
      <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
        <Wallet size={20} className="text-white" />
      </div>
      <div>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Wallet Balance</p>
        <p className="text-white font-black text-sm">{wallet?.user_name || 'You'}</p>
      </div>
    </div>
    <p className="text-4xl font-black mb-1">{wallet ? fmt(wallet.balance) : '—'}</p>
    <p className="text-slate-400 text-xs font-medium">Available to spend</p>
    <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
      <div className="w-8 h-6 bg-yellow-400/80 rounded" />
      <p className="text-slate-400 text-xs font-mono">**** **** **** 4081</p>
    </div>
  </div>
);

// ── Shared Amount Picker ────────────────────────────────────────────────────
const AmountPicker = ({ amount, setAmount, placeholder = '0.00' }) => (
  <div>
    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Amount (₦)</label>
    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg">₦</span>
      <input
        type="number" min="1" value={amount}
        onChange={e => setAmount(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-4 py-4 border-2 border-slate-100 rounded-xl focus:border-emerald-500 outline-none text-xl font-black text-slate-900"
      />
    </div>
    <div className="flex flex-wrap gap-2 mt-3">
      {QUICK_AMOUNTS.map(a => (
        <button key={a} onClick={() => setAmount(String(a))}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
            Number(amount) === a ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-emerald-400'
          }`}>
          {fmt(a)}
        </button>
      ))}
    </div>
  </div>
);

// ── Stage: Processing ───────────────────────────────────────────────────────
const Processing = () => (
  <div className="text-center py-14">
    <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
    <h3 className="text-xl font-black text-slate-900 mb-2">Processing…</h3>
    <p className="text-slate-400 font-medium mb-6">Please wait.</p>
    <div className="space-y-2 max-w-xs mx-auto">
      {['Verifying details', 'Contacting bank', 'Authorizing'].map((s, i) => (
        <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2.5">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
          <p className="text-sm font-semibold text-slate-600">{s}</p>
        </div>
      ))}
    </div>
  </div>
);

// ── Stage: Success ──────────────────────────────────────────────────────────
const Success = ({ amount, label, newBalance, onAgain, onBack }) => (
  <div className="text-center py-10">
    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
      <CheckCircle size={40} className="text-emerald-500" />
    </div>
    <h3 className="text-2xl font-black text-slate-900 mb-2">Success! 🎉</h3>
    <p className="text-slate-500 font-medium mb-5">{fmt(amount)} {label}.</p>
    {newBalance != null && (
      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-6 py-4 mb-7 inline-block">
        <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider mb-1">New Wallet Balance</p>
        <p className="text-3xl font-black text-emerald-700">{fmt(newBalance)}</p>
      </div>
    )}
    <div className="flex gap-3 max-w-sm mx-auto">
      <button onClick={onAgain} className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all">
        Do it again
      </button>
      <button onClick={onBack} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all">
        Go Back
      </button>
    </div>
  </div>
);

// ── Stage: Error ────────────────────────────────────────────────────────────
const ErrorState = ({ msg, onRetry }) => (
  <div className="text-center py-10">
    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
      <AlertTriangle size={40} className="text-red-500" />
    </div>
    <h3 className="text-2xl font-black text-slate-900 mb-2">Failed</h3>
    <p className="text-slate-400 font-medium mb-7">{msg || 'Something went wrong. Please try again.'}</p>
    <button onClick={onRetry} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all">
      Try Again
    </button>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// TAB 1 — FUND WALLET (simulated card payment → tops up balance)
// ═══════════════════════════════════════════════════════════════════════════
const FundTab = ({ onSuccess, userId }) => {
  const [amount, setAmount] = useState('');
  const [cardIdx, setCardIdx] = useState(0);
  const [stage, setStage] = useState('form'); // form | processing | success | error
  const [newBalance, setNewBalance] = useState(null);

  const handleFund = async () => {
    if (!amount || Number(amount) <= 0) return;
    setStage('processing');
    await new Promise(r => setTimeout(r, 2500)); // simulate gateway
    try {
      const res = await fetch(`${API}/wallet/fund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, amount: Number(amount), description: 'Simulated card top-up' }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewBalance(data.new_balance);
        setStage('success');
        onSuccess(); // refresh wallet balance in parent
      } else {
        setStage('error');
      }
    } catch {
      setStage('error');
    }
  };

  if (stage === 'processing') return <Processing />;
  if (stage === 'success') return (
    <Success
      amount={amount} label="added to your wallet" newBalance={newBalance}
      onAgain={() => { setStage('form'); setAmount(''); }}
      onBack={() => { setStage('form'); setAmount(''); }}
    />
  );
  if (stage === 'error') return <ErrorState onRetry={() => setStage('form')} />;

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4">
        <Zap size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700 font-semibold">
          Add money to your wallet using your debit card. You can then use your balance to pay group contributions or repay loans.
        </p>
      </div>

      {/* Demo cards */}
      <div>
        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Select Card (Demo)</label>
        <div className="space-y-2">
          {DEMO_CARDS.map((c, i) => (
            <button key={i} onClick={() => setCardIdx(i)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                cardIdx === i ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 hover:border-slate-200'
              }`}>
              <CreditCard size={16} className={cardIdx === i ? 'text-emerald-600' : 'text-slate-400'} />
              <div>
                <p className="text-xs font-black text-slate-800 font-mono">{c.number}</p>
                <p className="text-[10px] text-slate-400">{c.bank} · {c.type}</p>
              </div>
              {cardIdx === i && <CheckCircle size={14} className="ml-auto text-emerald-500" />}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mt-2 font-semibold">
          ⚠️ Demo mode — no real money moves.
        </p>
      </div>

      <AmountPicker amount={amount} setAmount={setAmount} />

      <button onClick={handleFund} disabled={!amount || Number(amount) <= 0}
        className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/25">
        <PiggyBank size={20} />
        Fund {amount ? fmt(amount) : 'Wallet'}
      </button>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// TAB 2 — MAKE PAYMENT (deducts from wallet balance)
// ═══════════════════════════════════════════════════════════════════════════
const PayTab = ({ wallet, onSuccess, userId }) => {
  const [payType, setPayType] = useState('contribution'); // contribution | loan_repayment
  const [amount, setAmount] = useState('');
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [loans, setLoans] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState('');
  const [stage, setStage] = useState('form');
  const [newBalance, setNewBalance] = useState(null);
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    fetch(`${API}/groups`).then(r => r.json()).then(setGroups).catch(() => {});
    fetch(`${API}/loans?user_id=${userId}`).then(r => r.json())
      .then(data => setLoans(Array.isArray(data) ? data.filter(l => l.status !== 'completed') : []))
      .catch(() => {});
  }, [userId]);

  const canPay = amount && Number(amount) > 0 &&
    (payType === 'contribution' ? !!selectedGroup : !!selectedLoan);
  const insufficient = wallet && Number(amount) > 0 && Number(amount) > wallet.balance;

  const handlePay = async () => {
    if (!canPay || insufficient) return;
    setStage('processing');
    await new Promise(r => setTimeout(r, 1800));
    try {
      const loanObj = loans.find(l => l.id === Number(selectedLoan));
      const body = payType === 'contribution'
        ? { user_id: userId, amount: Number(amount), type: 'contribution', group_id: Number(selectedGroup), description: 'Group contribution' }
        : { user_id: userId, amount: Number(amount), type: 'loan_repayment', group_id: Number(loanObj?.group_id || 1), loan_id: Number(selectedLoan), description: 'Loan repayment' };

      const res = await fetch(`${API}/wallet/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setNewBalance(data.new_balance);
        setStage('success');
        onSuccess();
      } else {
        setErrMsg(data.detail || 'Payment failed.');
        setStage('error');
      }
    } catch {
      setErrMsg('Network error. Make sure the backend is running.');
      setStage('error');
    }
  };

  const payLabel = payType === 'contribution' ? 'paid as group contribution' : 'applied to your loan';

  if (stage === 'processing') return <Processing />;
  if (stage === 'success') return (
    <Success
      amount={amount} label={payLabel} newBalance={newBalance}
      onAgain={() => { setStage('form'); setAmount(''); }}
      onBack={() => { setStage('form'); setAmount(''); }}
    />
  );
  if (stage === 'error') return <ErrorState msg={errMsg} onRetry={() => setStage('form')} />;

  return (
    <div className="space-y-6">
      {/* Wallet balance check */}
      {wallet && (
        <div className={`flex items-center justify-between rounded-2xl px-5 py-3 border ${
          wallet.balance > 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'
        }`}>
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">Available Wallet Balance</p>
            <p className={`text-2xl font-black ${wallet.balance > 0 ? 'text-emerald-700' : 'text-amber-600'}`}>{fmt(wallet.balance)}</p>
          </div>
          {wallet.balance === 0 && (
            <p className="text-xs font-bold text-amber-600 bg-white border border-amber-200 rounded-xl px-3 py-2">Fund wallet first →</p>
          )}
        </div>
      )}

      {/* Payment type toggle */}
      <div>
        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Pay For</label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'contribution',   icon: '🏦', label: 'Group Contribution', desc: 'Pay monthly/weekly dues' },
            { value: 'loan_repayment', icon: '📋', label: 'Loan Repayment',     desc: 'Pay back a group loan'  },
          ].map(opt => (
            <button key={opt.value} onClick={() => { setPayType(opt.value); setSelectedGroup(''); setSelectedLoan(''); }}
              className={`p-4 rounded-2xl border-2 text-left transition-all ${
                payType === opt.value ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 hover:border-slate-200 bg-white'
              }`}>
              <p className="text-xl mb-1">{opt.icon}</p>
              <p className="text-sm font-black text-slate-800">{opt.label}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Conditional selector */}
      {payType === 'contribution' && (
        <div>
          <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Select Group</label>
          {groups.length === 0
            ? <p className="text-sm text-slate-400 font-medium">No groups found.</p>
            : <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl focus:border-emerald-500 outline-none text-sm font-semibold bg-white">
                <option value="">Choose a group…</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name} — contribution {fmt(g.contribution_amount)}/{g.contribution_period}</option>)}
              </select>
          }
          {selectedGroup && (
            <button
              onClick={() => {
                const g = groups.find(gr => gr.id === Number(selectedGroup));
                if (g) setAmount(String(g.contribution_amount));
              }}
              className="mt-2 text-xs font-bold text-emerald-600 hover:underline">
              ↑ Auto-fill contribution amount
            </button>
          )}
        </div>
      )}

      {payType === 'loan_repayment' && (
        <div>
          <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Select Loan</label>
          {loans.length === 0
            ? <p className="text-sm text-slate-400 font-medium">No active loans found for your account.</p>
            : <select value={selectedLoan} onChange={e => setSelectedLoan(e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl focus:border-emerald-500 outline-none text-sm font-semibold bg-white">
                <option value="">Choose a loan…</option>
                {loans.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.purpose || 'Loan'} [{l.borrower_name}] — {fmt(l.amount - l.amount_repaid)} remaining ({l.status})
                  </option>
                ))}
              </select>
          }
          {selectedLoan && (
            <button
              onClick={() => {
                const l = loans.find(ln => ln.id === Number(selectedLoan));
                if (l) setAmount(String(l.amount - l.amount_repaid));
              }}
              className="mt-2 text-xs font-bold text-emerald-600 hover:underline">
              ↑ Auto-fill remaining balance
            </button>
          )}
        </div>
      )}

      <AmountPicker amount={amount} setAmount={setAmount} />

      {/* Insufficient balance warning */}
      {insufficient && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <AlertTriangle size={15} className="text-red-500 flex-shrink-0" />
          <p className="text-sm font-bold text-red-600">
            Insufficient balance. You have {fmt(wallet.balance)} but need {fmt(amount)}. Fund your wallet first.
          </p>
        </div>
      )}

      <button onClick={handlePay}
        disabled={!canPay || insufficient || wallet?.balance === 0}
        className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-40 text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-700/25">
        <Banknote size={20} />
        Pay {amount ? fmt(amount) : 'Now'} from Wallet
      </button>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════
const FundWallet = () => {
  const [activeTab, setActiveTab] = useState('fund'); // fund | pay
  const [wallet, setWallet] = useState(null);
  const userId = Number(localStorage.getItem('user_id')) || 1;

  const loadWallet = async () => {
    const w = await fetch(`${API}/wallet/${userId}`).then(r => r.json()).catch(() => null);
    setWallet(w);
  };

  useEffect(() => { loadWallet(); }, []);

  return (
    <DashboardLayout>
      <div className="px-4 md:px-8 py-8 max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900">Wallet & Payments</h1>
            <p className="text-slate-500 font-medium mt-1">Fund your wallet, then use it to pay contributions or repay loans.</p>
          </div>
          <button onClick={loadWallet} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm">
            <RefreshCw size={16} className="text-slate-500" />
          </button>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">

          {/* Left: Balance + how it works */}
          <div className="lg:col-span-2 space-y-4">
            <BalanceCard wallet={wallet} />

            {/* How it works card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">How It Works</p>
              <div className="space-y-3">
                {[
                  { step: '1', label: 'Fund Wallet', desc: 'Add money using your debit card (simulated)', active: activeTab === 'fund' },
                  { step: '2', label: 'Make Payment', desc: 'Pay contributions or repay loans from balance', active: activeTab === 'pay' },
                ].map(s => (
                  <button key={s.step} onClick={() => setActiveTab(s.step === '1' ? 'fund' : 'pay')}
                    className={`w-full flex items-start gap-3 rounded-xl p-3 text-left transition-all border-2 ${
                      s.active ? 'border-emerald-500 bg-emerald-50' : 'border-transparent hover:bg-slate-50'
                    }`}>
                    <span className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-black ${
                      s.active ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>{s.step}</span>
                    <div>
                      <p className="text-sm font-black text-slate-800">{s.label}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{s.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                <ArrowRight size={13} className="text-emerald-500" />
                <p className="text-[11px] text-slate-400 font-medium">
                  Fund first → then pay. Your balance shows in real-time.
                </p>
              </div>
            </div>
          </div>

          {/* Right: Tab content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {/* Tab switcher */}
              <div className="grid grid-cols-2 border-b border-slate-100">
                <button onClick={() => setActiveTab('fund')}
                  className={`py-4 text-sm font-black transition-all ${
                    activeTab === 'fund'
                      ? 'bg-emerald-500 text-white'
                      : 'text-slate-500 hover:bg-slate-50'
                  }`}>
                  <PiggyBank size={16} className="inline mr-2" />
                  Fund Wallet
                </button>
                <button onClick={() => setActiveTab('pay')}
                  className={`py-4 text-sm font-black transition-all ${
                    activeTab === 'pay'
                      ? 'bg-blue-700 text-white'
                      : 'text-slate-500 hover:bg-slate-50'
                  }`}>
                  <Banknote size={16} className="inline mr-2" />
                  Make Payment
                </button>
              </div>

              {/* Tab body */}
              <div className="p-7">
                {activeTab === 'fund'
                  ? <FundTab userId={userId} onSuccess={loadWallet} />
                  : <PayTab userId={userId} wallet={wallet} onSuccess={loadWallet} />
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default FundWallet;
