import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CheckCircle,
  CreditCard,
  PiggyBank,
  RefreshCw,
  Wallet,
  Zap,
} from 'lucide-react';

import DashboardLayout from '../components/DashboardLayout';
import { apiFetch } from '../services/api';

const formatCurrency = (value) => `NGN ${Number(value || 0).toLocaleString()}`;
const QUICK_AMOUNTS = [1000, 2000, 5000, 10000, 20000, 50000];
const PAYMENT_METHODS = [
  {
    value: 'bank_transfer',
    label: 'Bank Transfer',
    description: 'Redirect to Paystack and complete the wallet top-up with bank transfer.',
    icon: Wallet,
  },
  {
    value: 'card',
    label: 'Debit Card',
    description: 'Redirect to Paystack and pay with a bank card before the wallet is credited.',
    icon: CreditCard,
  },
  {
    value: 'ussd',
    label: 'USSD',
    description: 'Redirect to Paystack and complete the wallet top-up with USSD.',
    icon: Zap,
  },
];

const paymentMethodLabel = (value) =>
  PAYMENT_METHODS.find((method) => method.value === value)?.label || 'Selected method';

const BalanceCard = ({ wallet }) => (
  <div className="rounded-3xl bg-gradient-to-br from-slate-900 to-slate-700 p-7 text-white shadow-2xl">
    <div className="mb-5 flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 shadow-lg">
        <Wallet size={20} className="text-white" />
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Wallet Balance</p>
        <p className="text-sm font-black text-white">{wallet?.user_name || 'You'}</p>
      </div>
    </div>
    <p className="mb-1 text-4xl font-black">{wallet ? formatCurrency(wallet.balance) : '-'}</p>
    <p className="text-xs font-medium text-slate-400">Available to spend</p>
  </div>
);

const AmountPicker = ({ amount, setAmount }) => (
  <div>
    <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">Amount</label>
    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-slate-400">NGN</span>
      <input
        type="number"
        min="1"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        className="w-full rounded-xl border-2 border-slate-100 py-4 pl-16 pr-4 text-xl font-black text-slate-900 outline-none focus:border-emerald-500"
        placeholder="0"
      />
    </div>
    <div className="mt-3 flex flex-wrap gap-2">
      {QUICK_AMOUNTS.map((quickAmount) => (
        <button
          key={quickAmount}
          onClick={() => setAmount(String(quickAmount))}
          className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
            Number(amount) === quickAmount
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-emerald-400'
          }`}
        >
          {formatCurrency(quickAmount)}
        </button>
      ))}
    </div>
  </div>
);

const PaymentMethodPicker = ({ selected, onSelect }) => (
  <div>
    <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">Payment Method</label>
    <div className="grid gap-3 md:grid-cols-3">
      {PAYMENT_METHODS.map((method) => {
        const Icon = method.icon;
        const active = selected === method.value;
        return (
          <button
            key={method.value}
            onClick={() => onSelect(method.value)}
            className={`rounded-2xl border-2 p-4 text-left transition ${
              active ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 bg-white hover:border-slate-200'
            }`}
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
              <Icon size={18} />
            </div>
            <p className="text-sm font-black text-slate-900">{method.label}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{method.description}</p>
          </button>
        );
      })}
    </div>
  </div>
);

const Processing = ({ title = 'Processing...', message = 'Please wait.' }) => (
  <div className="py-14 text-center">
    <div className="mx-auto mb-6 h-16 w-16 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
    <h3 className="mb-2 text-xl font-black text-slate-900">{title}</h3>
    <p className="font-medium text-slate-400">{message}</p>
  </div>
);

const Success = ({ amount, label, newBalance, onReset }) => (
  <div className="py-10 text-center">
    <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
      <CheckCircle size={40} className="text-emerald-500" />
    </div>
    <h3 className="mb-2 text-2xl font-black text-slate-900">Success</h3>
    <p className="mb-5 font-medium text-slate-500">
      {formatCurrency(amount)} {label}.
    </p>
    {newBalance != null && (
      <div className="mb-7 inline-block rounded-2xl border border-emerald-100 bg-emerald-50 px-6 py-4">
        <p className="mb-1 text-xs font-bold uppercase tracking-wider text-emerald-600">New Wallet Balance</p>
        <p className="text-3xl font-black text-emerald-700">{formatCurrency(newBalance)}</p>
      </div>
    )}
    <button onClick={onReset} className="rounded-xl bg-emerald-500 px-8 py-3 font-bold text-white transition hover:bg-emerald-600">
      Continue
    </button>
  </div>
);

const ErrorState = ({ message, onRetry }) => (
  <div className="py-10 text-center">
    <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
      <AlertTriangle size={40} className="text-red-500" />
    </div>
    <h3 className="mb-2 text-2xl font-black text-slate-900">Failed</h3>
    <p className="mb-7 font-medium text-slate-400">{message || 'Something went wrong.'}</p>
    <button onClick={onRetry} className="rounded-xl bg-slate-900 px-8 py-3 font-bold text-white transition hover:bg-slate-800">
      Try Again
    </button>
  </div>
);

const FundTab = ({ onSuccess, callbackReference, clearCallbackReference }) => {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [stage, setStage] = useState('form');
  const [newBalance, setNewBalance] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [settledAmount, setSettledAmount] = useState(null);
  const [settledMethod, setSettledMethod] = useState('bank_transfer');

  useEffect(() => {
    if (!callbackReference) {
      return undefined;
    }

    let active = true;

    const verifyPayment = async () => {
      setStage('processing');
      setErrorMessage('');
      try {
        const data = await apiFetch(`/wallet/paystack/verify?reference=${encodeURIComponent(callbackReference)}`);
        if (!active) {
          return;
        }
        setSettledAmount(data.amount_added);
        setSettledMethod(data.payment_method);
        setNewBalance(data.new_balance);
        setStage('success');
        onSuccess();
      } catch (error) {
        if (!active) {
          return;
        }
        setErrorMessage(error.message);
        setStage('error');
      } finally {
        if (active) {
          clearCallbackReference();
        }
      }
    };

    verifyPayment();

    return () => {
      active = false;
    };
  }, [callbackReference, clearCallbackReference, onSuccess]);

  const handleFund = async () => {
    if (!amount || Number(amount) <= 0 || !paymentMethod) return;
    setStage('processing');
    setErrorMessage('');

    try {
      const callbackUrl = `${window.location.origin}/fund-wallet`;
      const data = await apiFetch('/wallet/paystack/initialize', {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(amount),
          payment_method: paymentMethod,
          callback_url: callbackUrl,
        }),
      });

      if (!data.authorization_url) {
        throw new Error('Paystack did not return an authorization URL.');
      }

      window.location.assign(data.authorization_url);
    } catch (error) {
      setErrorMessage(error.message);
      setStage('error');
    }
  };

  if (stage === 'processing') {
    return (
      <Processing
        title={callbackReference ? 'Verifying payment...' : 'Redirecting to Paystack...'}
        message={callbackReference ? 'Please wait while we confirm the payment and credit your wallet.' : 'Please complete the checkout on Paystack.'}
      />
    );
  }
  if (stage === 'success') {
    return (
      <Success
        amount={settledAmount ?? amount}
        label={`added to your wallet through ${paymentMethodLabel(settledMethod || paymentMethod)}`}
        newBalance={newBalance}
        onReset={() => {
          setAmount('');
          setPaymentMethod('bank_transfer');
          setSettledAmount(null);
          setSettledMethod('bank_transfer');
          setStage('form');
        }}
      />
    );
  }
  if (stage === 'error') {
    return <ErrorState message={errorMessage} onRetry={() => setStage('form')} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4">
        <Zap size={18} className="mt-0.5 flex-shrink-0 text-blue-600" />
        <p className="text-sm font-semibold text-blue-700">
          Choose a payment method, continue to Paystack checkout, then return here after successful payment to credit the wallet.
        </p>
      </div>
      <PaymentMethodPicker selected={paymentMethod} onSelect={setPaymentMethod} />
      <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Selected Method</p>
        <p className="mt-1 text-sm font-black text-slate-900">{paymentMethodLabel(paymentMethod)}</p>
      </div>
      <AmountPicker amount={amount} setAmount={setAmount} />
      <button
        onClick={handleFund}
        disabled={!amount || Number(amount) <= 0 || !paymentMethod}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-4 text-lg font-black text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-600 disabled:opacity-40"
      >
        <PiggyBank size={20} />
        Continue to Paystack for {amount ? formatCurrency(amount) : 'wallet funding'}
      </button>
    </div>
  );
};

const PayTab = ({ wallet, onSuccess, preferredType }) => {
  const [payType, setPayType] = useState('savings');
  const [amount, setAmount] = useState('');
  const [membership, setMembership] = useState(null);
  const [loans, setLoans] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState('');
  const [stage, setStage] = useState('form');
  const [newBalance, setNewBalance] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    apiFetch('/groups/my-membership')
      .then((response) => setMembership(response.membership))
      .catch(() => {});
    apiFetch('/loans')
      .then((data) => setLoans(Array.isArray(data) ? data.filter((loan) => ['active', 'overdue'].includes(loan.status)) : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (preferredType === 'savings' || preferredType === 'loan_repayment') {
      setPayType(preferredType);
    }
  }, [preferredType]);

  const canPay =
    amount &&
    Number(amount) > 0 &&
    (payType === 'savings' ? Boolean(membership?.group_id) : Boolean(selectedLoan));
  const insufficient = wallet && Number(amount) > 0 && Number(amount) > wallet.balance;

  const handlePayment = async () => {
    if (!canPay || insufficient) return;
    setStage('processing');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    try {
      const selectedLoanRecord = loans.find((loan) => loan.id === Number(selectedLoan));
      const payload =
        payType === 'savings'
          ? {
              amount: Number(amount),
              type: 'savings',
              group_id: Number(membership.group_id),
              description: 'Savings payment',
            }
          : {
              amount: Number(amount),
              type: 'loan_repayment',
              group_id: Number(selectedLoanRecord?.group_id),
              loan_id: Number(selectedLoan),
              description: 'Loan repayment',
            };

      const data = await apiFetch('/wallet/pay', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setNewBalance(data.new_balance);
      setStage('success');
      onSuccess();
    } catch (error) {
      setErrorMessage(error.message);
      setStage('error');
    }
  };

  if (stage === 'processing') return <Processing />;
  if (stage === 'success') {
    return (
      <Success
        amount={amount}
        label={payType === 'savings' ? 'paid into savings' : 'applied to your loan'}
        newBalance={newBalance}
        onReset={() => {
          setAmount('');
          setSelectedLoan('');
          setStage('form');
        }}
      />
    );
  }
  if (stage === 'error') return <ErrorState message={errorMessage} onRetry={() => setStage('form')} />;

  return (
    <div className="space-y-6">
      {wallet && (
        <div className={`flex items-center justify-between rounded-2xl border px-5 py-3 ${wallet.balance > 0 ? 'border-emerald-100 bg-emerald-50' : 'border-amber-100 bg-amber-50'}`}>
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">Available Wallet Balance</p>
            <p className={`text-2xl font-black ${wallet.balance > 0 ? 'text-emerald-700' : 'text-amber-600'}`}>{formatCurrency(wallet.balance)}</p>
          </div>
          {wallet.balance === 0 && <p className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-bold text-amber-600">Fund wallet first</p>}
        </div>
      )}

      <div>
        <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">Pay For</label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'savings', label: 'Savings Payment', icon: 'S' },
            { value: 'loan_repayment', label: 'Loan Repayment', icon: 'L' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => {
                setPayType(option.value);
                setSelectedLoan('');
              }}
              className={`rounded-2xl border-2 p-4 text-left transition ${payType === option.value ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}
            >
              <p className="mb-1 text-xl">{option.icon}</p>
              <p className="text-sm font-black text-slate-800">{option.label}</p>
            </button>
          ))}
        </div>
      </div>

      {payType === 'savings' && (
        <div className="rounded-2xl bg-slate-50 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Savings Target</p>
          <p className="mt-1 text-sm font-black text-slate-900">
            {membership?.group_name || 'No approved group'}
          </p>
          {membership && (
            <button
              onClick={() => apiFetch('/groups/my-membership').then((response) => setAmount(String(response.group?.savings_amount || ''))).catch(() => {})}
              className="mt-2 text-xs font-bold text-emerald-600 hover:underline"
            >
              Auto-fill group savings amount
            </button>
          )}
        </div>
      )}

      {payType === 'loan_repayment' && (
        <div>
          <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">Select Loan</label>
          {loans.length === 0 ? (
            <p className="text-sm font-medium text-slate-400">No repayable loans found.</p>
          ) : (
            <select
              value={selectedLoan}
              onChange={(event) => setSelectedLoan(event.target.value)}
              className="w-full rounded-xl border-2 border-slate-100 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-emerald-500"
            >
              <option value="">Choose a loan...</option>
              {loans.map((loan) => (
                <option key={loan.id} value={loan.id}>
                  {loan.purpose || 'Loan'} - {formatCurrency(loan.remaining_balance)} remaining
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <AmountPicker amount={amount} setAmount={setAmount} />

      {insufficient && (
        <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
          <AlertTriangle size={15} className="flex-shrink-0 text-red-500" />
          <p className="text-sm font-bold text-red-600">
            Insufficient balance. You have {formatCurrency(wallet.balance)} but need {formatCurrency(amount)}.
          </p>
        </div>
      )}

      <button
        onClick={handlePayment}
        disabled={!canPay || insufficient || wallet?.balance === 0}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 py-4 text-lg font-black text-white shadow-lg shadow-blue-700/25 transition hover:bg-blue-800 disabled:opacity-40"
      >
        <Banknote size={20} />
        Pay {amount ? formatCurrency(amount) : 'Now'} from Wallet
      </button>
    </div>
  );
};

const FundWallet = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('fund');
  const [wallet, setWallet] = useState(null);
  const preferredType = searchParams.get('type');
  const callbackReference = searchParams.get('reference') || searchParams.get('trxref');

  const loadWallet = async () => {
    const data = await apiFetch('/wallet/me').catch(() => null);
    setWallet(data);
  };

  const clearCallbackReference = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('reference');
    next.delete('trxref');
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    loadWallet();
  }, []);

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'pay') {
      setActiveTab('pay');
      const next = new URLSearchParams(searchParams);
      next.delete('action');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (callbackReference) {
      setActiveTab('fund');
    }
  }, [callbackReference]);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900">Wallet and Payments</h1>
            <p className="mt-1 font-medium text-slate-500">Fund your wallet through Paystack, then pay savings or loan repayments from your balance.</p>
          </div>
          <button onClick={loadWallet} className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm transition hover:bg-slate-50">
            <RefreshCw size={16} className="text-slate-500" />
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-2">
            <BalanceCard wallet={wallet} />
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <p className="mb-4 text-xs font-black uppercase tracking-widest text-slate-500">How It Works</p>
              <div className="space-y-3">
                {[
                  { step: '1', label: 'Choose payment method', desc: 'Select bank transfer, card, or USSD' },
                  { step: '2', label: 'Complete Paystack checkout', desc: 'Finish the payment securely on Paystack' },
                  { step: '3', label: 'Wallet gets credited', desc: 'Return here, verify the payment, then spend from wallet balance' },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-3 rounded-xl border-2 border-transparent p-3 hover:bg-slate-50">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-200 text-xs font-black text-slate-600">{item.step}</span>
                    <div>
                      <p className="text-sm font-black text-slate-800">{item.label}</p>
                      <p className="text-[11px] text-slate-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4">
                <ArrowRight size={13} className="text-emerald-500" />
                <p className="text-[11px] font-medium text-slate-400">Only verified Paystack payments increase the wallet balance.</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="grid grid-cols-2 border-b border-slate-100">
                <button
                  onClick={() => setActiveTab('fund')}
                  className={`py-4 text-sm font-black transition ${activeTab === 'fund' ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  <PiggyBank size={16} className="mr-2 inline" />
                  Fund Wallet
                </button>
                <button
                  onClick={() => setActiveTab('pay')}
                  className={`py-4 text-sm font-black transition ${activeTab === 'pay' ? 'bg-blue-700 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  <Banknote size={16} className="mr-2 inline" />
                  Make Payment
                </button>
              </div>
              <div className="p-7">
                {activeTab === 'fund' ? (
                  <FundTab
                    onSuccess={loadWallet}
                    callbackReference={callbackReference}
                    clearCallbackReference={clearCallbackReference}
                  />
                ) : (
                  <PayTab
                    wallet={wallet}
                    onSuccess={loadWallet}
                    preferredType={preferredType}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default FundWallet;
