import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck, Users, TrendingUp, ArrowRight, Wallet,
  CheckCircle, Menu, X, Zap, Globe, Star
} from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">

      {/* ─── NAVIGATION ──────────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-6 md:px-16 py-4 bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm">
        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <Wallet className="text-white" size={18} />
          </div>
          <span className="text-xl font-black text-slate-800 tracking-tighter">MICROSAVE</span>
        </div>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-10 font-semibold text-slate-500 text-[15px]">
          <a href="#features"    className="hover:text-emerald-500 transition-colors">Features</a>
          <a href="#impact"      className="hover:text-emerald-500 transition-colors">Impact</a>
          <a href="#get-started" className="hover:text-emerald-500 transition-colors">Get Started</a>
        </div>

        {/* Desktop auth buttons */}
        <div className="hidden md:flex items-center gap-4">
          <button onClick={() => navigate('/login')}
            className="px-6 py-2.5 rounded-xl font-bold text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all">
            Sign In
          </button>
          <button onClick={() => navigate('/register')}
            className="bg-emerald-500 text-white px-7 py-2.5 rounded-xl font-bold hover:bg-emerald-600 transition-all shadow-md">
            Sign Up
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-xl hover:bg-slate-100 transition-colors"
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={22} className="text-slate-700" /> : <Menu size={22} className="text-slate-700" />}
        </button>
      </nav>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-b border-slate-100 px-6 py-4 space-y-3 shadow-lg z-40 relative">
          <a href="#features"    onClick={() => setMenuOpen(false)} className="block font-semibold text-slate-700 py-2 hover:text-emerald-500">Features</a>
          <a href="#impact"      onClick={() => setMenuOpen(false)} className="block font-semibold text-slate-700 py-2 hover:text-emerald-500">Impact</a>
          <a href="#get-started" onClick={() => setMenuOpen(false)} className="block font-semibold text-slate-700 py-2 hover:text-emerald-500">Get Started</a>
          <div className="flex gap-3 pt-2">
            <button onClick={() => navigate('/login')}
              className="flex-1 py-2.5 rounded-xl font-bold text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all text-sm">
              Sign In
            </button>
            <button onClick={() => navigate('/register')}
              className="flex-1 py-2.5 rounded-xl font-bold text-white bg-emerald-500 hover:bg-emerald-600 transition-all text-sm">
              Sign Up
            </button>
          </div>
        </div>
      )}

      {/* ─── HERO ─────────────────────────────────────────────────────────── */}
      <header className="px-6 py-16 md:py-28 max-w-6xl mx-auto flex flex-col items-center text-center">
        <div className="inline-block px-4 py-1.5 mb-6 bg-blue-50 text-blue-700 rounded-full text-xs font-black uppercase tracking-widest">
          Financial Inclusion for All
        </div>
        <h1 className="text-5xl md:text-7xl font-black leading-tight mb-6 text-slate-900">
          Grow your wealth <br />
          <span className="text-blue-700 underline decoration-blue-100 decoration-8 underline-offset-4">with your community.</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-500 mb-10 max-w-2xl font-medium leading-relaxed">
          MicroSave digitizes traditional savings groups. Pool your money securely,
          access instant micro-loans, and build a financial future with people you trust.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <button onClick={() => navigate('/register')}
            className="bg-blue-700 text-white px-10 py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-2 hover:bg-blue-800 transition-all shadow-xl">
            Start Saving Now <ArrowRight size={22} />
          </button>
          <button onClick={() => navigate('/login')}
            className="bg-white border-2 border-slate-200 px-10 py-5 rounded-2xl font-black text-lg hover:border-blue-700 transition-all">
            Sign In
          </button>
        </div>
      </header>

      {/* ─── FEATURES ─────────────────────────────────────────────────────── */}
      <section id="features" className="px-6 py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">Everything you need to thrive</h2>
            <p className="text-slate-500 font-medium">Simple tools designed for community-led financial growth.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-10">
            <div className="bg-white p-10 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
              <div className="w-16 h-16 bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-center mb-8">
                <Users size={32} />
              </div>
              <h3 className="text-xl font-black mb-4">Digital Ajo/Esusu</h3>
              <p className="text-slate-500 leading-relaxed font-medium">
                Ditch the manual ledgers. Track every contribution in real-time with full transparency for all members.
              </p>
            </div>
            <div className="bg-white p-10 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
              <div className="w-16 h-16 bg-green-100 text-green-700 rounded-2xl flex items-center justify-center mb-8">
                <TrendingUp size={32} />
              </div>
              <h3 className="text-xl font-black mb-4">Instant Micro-Loans</h3>
              <p className="text-slate-500 leading-relaxed font-medium">
                Borrow from the community pool with zero paperwork. Approved by your peers, funded by the group.
              </p>
            </div>
            <div className="bg-white p-10 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
              <div className="w-16 h-16 bg-purple-100 text-purple-700 rounded-2xl flex items-center justify-center mb-8">
                <ShieldCheck size={32} />
              </div>
              <h3 className="text-xl font-black mb-4">Unmatched Security</h3>
              <p className="text-slate-500 leading-relaxed font-medium">
                Protected by AI-driven monitoring and secure encryption. Your hard-earned money is always safe.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── IMPACT ───────────────────────────────────────────────────────── */}
      <section id="impact" className="px-6 py-20 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">Our Impact in Numbers</h2>
            <p className="text-slate-500 font-medium">Real people, real savings, real results.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-16">
            <div className="text-center p-10 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl border border-emerald-100">
              <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/25">
                <Globe size={28} className="text-white" />
              </div>
              <p className="text-4xl font-black text-emerald-700 mb-2">₦2B+</p>
              <p className="text-slate-600 font-bold">Total Savings Managed</p>
              <p className="text-slate-400 text-sm font-medium mt-1">across all groups combined</p>
            </div>
            <div className="text-center p-10 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl border border-blue-100">
              <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/25">
                <Users size={28} className="text-white" />
              </div>
              <p className="text-4xl font-black text-blue-700 mb-2">5,000+</p>
              <p className="text-slate-600 font-bold">Active Members</p>
              <p className="text-slate-400 text-sm font-medium mt-1">saving together every day</p>
            </div>
            <div className="text-center p-10 bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl border border-purple-100">
              <div className="w-14 h-14 bg-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-600/25">
                <Star size={28} className="text-white" />
              </div>
              <p className="text-4xl font-black text-purple-700 mb-2">98%</p>
              <p className="text-slate-600 font-bold">Loan Repayment Rate</p>
              <p className="text-slate-400 text-sm font-medium mt-1">community trust at its best</p>
            </div>
          </div>

          {/* Testimonial */}
          <div className="bg-slate-900 rounded-3xl p-10 md:p-14 text-white text-center max-w-3xl mx-auto">
            <Zap size={32} className="mx-auto mb-5 text-emerald-400" />
            <p className="text-xl md:text-2xl font-bold leading-relaxed mb-6 text-slate-100">
              "MicroSave helped our market women group go from paper ledgers to a fully digital system. We've saved ₦4.5M together in 8 months!"
            </p>
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-400 rounded-full flex items-center justify-center font-black text-white">H</div>
              <div className="text-left">
                <p className="font-black text-white text-sm">Halimah Omoakin</p>
                <p className="text-slate-400 text-xs">Group Admin · Market Women Alpha</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── GET STARTED ──────────────────────────────────────────────────── */}
      <section id="get-started" className="px-6 py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">Get started in 3 simple steps</h2>
            <p className="text-slate-500 font-medium">From zero to your first group savings — in under 5 minutes.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 mb-14">
            {[
              {
                step: '01', color: 'bg-blue-700', light: 'bg-blue-50', text: 'text-blue-700',
                title: 'Create your account',
                desc: 'Sign up with your name, phone, and occupation. It takes less than 60 seconds.',
                icon: Users,
              },
              {
                step: '02', color: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-700',
                title: 'Join or create a group',
                desc: 'Browse existing savings groups or create your own. The group admin approves your request.',
                icon: ShieldCheck,
              },
              {
                step: '03', color: 'bg-purple-600', light: 'bg-purple-50', text: 'text-purple-700',
                title: 'Save, borrow & grow',
                desc: 'Make contributions, apply for group loans, and track everything in real time.',
                icon: TrendingUp,
              },
            ].map(({ step, color, light, text, title, desc, icon: Icon }) => (
              <div key={step} className="relative bg-white rounded-3xl border border-slate-100 p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
                <div className={`absolute -top-4 -left-2 w-10 h-10 ${color} rounded-xl flex items-center justify-center text-white font-black text-xs shadow-lg`}>
                  {step}
                </div>
                <div className={`w-14 h-14 ${light} rounded-2xl flex items-center justify-center mb-6 mt-2`}>
                  <Icon size={28} className={text} />
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-3">{title}</h3>
                <p className="text-slate-500 leading-relaxed font-medium text-sm">{desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center">
            <button onClick={() => navigate('/register')}
              className="bg-blue-700 text-white px-12 py-5 rounded-2xl font-black text-xl hover:bg-blue-800 transition-all shadow-xl inline-flex items-center gap-3">
              Create Free Account <ArrowRight size={22} />
            </button>
            <p className="text-slate-400 text-sm font-medium mt-4">No credit card required. Completely free to join.</p>
          </div>
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────────────────────────── */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-4xl mx-auto bg-blue-700 rounded-[2.5rem] p-12 text-center text-white shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 left-0 w-32 h-32 bg-blue-600 rounded-full -translate-x-16 -translate-y-16 opacity-50"></div>
          <div className="absolute bottom-0 right-0 w-48 h-48 bg-blue-800 rounded-full translate-x-16 translate-y-16 opacity-30"></div>
          <h2 className="text-3xl md:text-5xl font-black mb-6 relative z-10">Ready to join the revolution?</h2>
          <p className="text-blue-100 mb-10 text-lg font-medium relative z-10">Join 5,000+ members building financial freedom together.</p>
          <button onClick={() => navigate('/register')}
            className="bg-white text-blue-700 px-12 py-5 rounded-2xl font-black text-xl hover:bg-slate-50 transition-colors shadow-lg relative z-10">
            Create Your Account
          </button>
        </div>
      </section>

      {/* ─── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="px-6 py-12 border-t border-slate-100 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center">
            <Wallet className="text-white" size={14} />
          </div>
          <span className="font-black text-slate-700 tracking-tight">MICROSAVE</span>
        </div>
        <p className="text-slate-400 font-bold text-sm tracking-widest uppercase">
          © 2026 MicroSave Financial Tech. Built for Empowerment.
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;