import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, User, Phone, Briefcase, Loader2, Wallet } from 'lucide-react';

const Register = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', occupation: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:8000/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (response.ok) {
        // Auto-login after register
        const formData = new URLSearchParams();
        formData.append('username', form.email);
        formData.append('password', form.password);

        const loginRes = await fetch('http://localhost:8000/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData,
        });
        const loginData = await loginRes.json();

        if (loginRes.ok) {
          localStorage.setItem('token', loginData.access_token);
          localStorage.setItem('user_id', loginData.user_id);
          localStorage.setItem('user_name', loginData.name);
          localStorage.setItem('user_email', loginData.email);
          navigate('/dashboard');
        } else {
          navigate('/login');
        }
      } else {
        setError(data.detail || 'Registration failed. Please try again.');
      }
    } catch (err) {
      setError('Cannot connect to server. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { key: 'name',       label: 'Full Name',         type: 'text',     icon: User,      placeholder: 'e.g. Halimah Omoakin',     required: true  },
    { key: 'email',      label: 'Email Address',      type: 'email',    icon: Mail,      placeholder: 'you@example.com',           required: true  },
    { key: 'password',   label: 'Password',           type: 'password', icon: Lock,      placeholder: '••••••••',                  required: true  },
    { key: 'phone',      label: 'Phone Number',       type: 'tel',      icon: Phone,     placeholder: '080 1234 5678',             required: false },
    { key: 'occupation', label: 'Occupation',         type: 'text',     icon: Briefcase, placeholder: 'e.g. Trader, Teacher…',    required: false },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <Wallet size={20} className="text-white" />
          </div>
          <span className="font-black text-white tracking-tight text-xl">MICROSAVE</span>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 p-10 shadow-2xl">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Create Account</h1>
            <p className="text-slate-500 mt-2 text-sm">Join the MicroSave community</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-medium rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            {fields.map(({ key, label, type, icon: Icon, placeholder, required }) => (
              <div key={key}>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  {label} {!required && <span className="text-slate-300 font-normal normal-case">(optional)</span>}
                </label>
                <div className="relative">
                  <Icon className="absolute left-3 top-3.5 text-slate-400" size={16} />
                  <input
                    type={type}
                    required={required}
                    className="w-full pl-9 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-emerald-500 focus:bg-white outline-none transition-all text-sm"
                    placeholder={placeholder}
                    value={form[key]}
                    onChange={set(key)}
                  />
                </div>
              </div>
            ))}

            <div className="pt-1">
              <p className="text-xs text-slate-400 mb-4 bg-slate-50 rounded-xl p-3">
                👑 After registering, you can <strong>create a savings group</strong> (and become its admin) or <strong>request to join</strong> an existing one.
              </p>
              <button
                type="submit" disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 shadow-lg shadow-emerald-500/25"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Create My Account'}
              </button>
            </div>
          </form>

          <p className="mt-6 text-center text-slate-500 text-sm">
            Already have an account?{' '}
            <button onClick={() => navigate('/login')} className="text-emerald-600 font-bold hover:underline">
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;