import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';

import Sidebar from './Sidebar';
import { clearSession } from '../hooks/useAuth';

const DashboardLayout = ({ children }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="ml-64 flex-1 overflow-auto">
        <div className="sticky top-0 z-10 flex justify-end border-b border-slate-200/80 bg-slate-50/95 px-6 py-4 backdrop-blur">
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-600 shadow-sm transition hover:border-red-300 hover:bg-red-50"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
