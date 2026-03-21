import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, CreditCard, ArrowLeftRight,
  UserCheck, MessageSquare, Wallet, LogOut, ChevronRight, Bot, PiggyBank
} from 'lucide-react';

const navItems = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard'    },
  { to: '/groups',       icon: Users,            label: 'Groups'       },
  { to: '/loans',        icon: CreditCard,       label: 'Loans'        },
  { to: '/transactions', icon: ArrowLeftRight,   label: 'Transactions' },
  { to: '/fund-wallet',  icon: PiggyBank,        label: 'Fund Wallet'  },
  { to: '/members',      icon: UserCheck,        label: 'Members'      },
  { to: '/ai',           icon: Bot,              label: 'AI Assistant' },
  { to: '/chat',         icon: MessageSquare,    label: 'Group Chat'   },
];

const Sidebar = () => {
  const navigate = useNavigate();
  const userName = localStorage.getItem('user_name') || 'User';
  const userEmail = localStorage.getItem('user_email') || '';
  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <aside className="w-64 min-h-screen bg-slate-900 flex flex-col fixed left-0 top-0 z-20 shadow-2xl">
      {/* Logo */}
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

      {/* Navigation */}
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
                {isActive && <ChevronRight size={14} className="text-emerald-200" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Profile & Logout */}
      <div className="px-3 pb-5 border-t border-slate-700/50 pt-4">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 transition-all cursor-default mb-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-black shadow">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-bold truncate">{userName}</p>
            <p className="text-slate-500 text-[10px] truncate">{userEmail}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
