import React, { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, CreditCard, ArrowLeftRight,
  UserCheck, MessageSquare, Wallet, LogOut, ChevronRight, Bot, PiggyBank, CheckCircle2
} from 'lucide-react';
import { clearSession, getStoredSession } from '../hooks/useAuth';
import { apiFetch } from '../services/api';

const navItems = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard'    },
  { to: '/groups',       icon: Users,            label: 'Groups'       },
  { to: '/loans',        icon: CreditCard,       label: 'Loans'        },
  { to: '/transactions', icon: ArrowLeftRight,   label: 'Transactions' },
  { to: '/fund-wallet',  icon: PiggyBank,        label: 'Fund Wallet'  },
  { to: '/approvals',    icon: CheckCircle2,     label: 'Approvals'    },
  { to: '/members',      icon: UserCheck,        label: 'Members'      },
  { to: '/ai',           icon: Bot,              label: 'AI Assistant' },
  { to: '/chat',         icon: MessageSquare,    label: 'Group Chat'   },
];

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const session = getStoredSession();
  const userName = session?.user?.name || 'User';
  const userEmail = session?.user?.email || '';
  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const [badges, setBadges] = useState({});

  useEffect(() => {
    let active = true;

    const loadBadges = async () => {
      try {
        const membershipResponse = await apiFetch('/groups/my-membership');
        const membership = membershipResponse.membership;

        if (!active || membership?.role !== 'admin' || membership?.join_status !== 'approved') {
          if (active) {
            setBadges({});
          }
          return;
        }

        const [requests, loans] = await Promise.all([
          apiFetch(`/groups/${membership.group_id}/join-requests`).catch(() => []),
          apiFetch('/loans').catch(() => []),
        ]);

        if (!active) {
          return;
        }

        const pendingMemberships = Array.isArray(requests) ? requests.length : 0;
        const pendingLoans = Array.isArray(loans)
          ? loans.filter((loan) => loan.status === 'pending').length
          : 0;

        setBadges({
          '/groups': pendingMemberships,
          '/approvals': pendingMemberships + pendingLoans,
          '/members': pendingMemberships,
          '/loans': pendingLoans,
        });
      } catch {
        if (active) {
          setBadges({});
        }
      }
    };

    loadBadges();

    return () => {
      active = false;
    };
  }, [location.pathname]);

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  return (
    <aside className="w-64 min-h-screen bg-slate-900 flex flex-col fixed left-0 top-0 z-20 shadow-2xl">
      <div className="px-6 py-6 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <Wallet size={18} className="text-white" />
          </div>
          <div>
            <span className="font-black text-white tracking-tight text-lg">MICROSAVE</span>
            <p className="text-[10px] text-slate-400 font-medium -mt-1">Community Finance</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                isActive
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={18} className={isActive ? 'text-white' : 'text-slate-500 group-hover:text-emerald-400 transition-colors'} />
                <span className="flex-1">{label}</span>
                {badges[to] > 0 && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                    isActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {badges[to]}
                  </span>
                )}
                {isActive && <ChevronRight size={14} className="text-emerald-200" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-5 border-t border-slate-700/50 pt-4">
        <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-3 shadow-inner">
          <div className="flex items-center gap-3 px-2 py-1 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-black shadow">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-bold truncate">{userName}</p>
              <p className="text-slate-400 text-[10px] truncate">{userEmail}</p>
            </div>
          </div>

          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-2">
            <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-red-300">
              Account
            </p>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-between gap-3 rounded-xl bg-red-500 px-4 py-3 text-sm font-black text-white shadow-lg shadow-red-900/30 transition-all hover:bg-red-600"
            >
              <span className="flex items-center gap-3">
                <LogOut size={16} />
                Sign Out
              </span>
              <ChevronRight size={14} className="text-red-100" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
