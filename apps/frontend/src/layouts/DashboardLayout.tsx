import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { api } from '../api/client';
import { Button } from '@wphub/ui';
import {
  LayoutDashboard,
  Globe,
  Network,
  FolderOpen,
  Database,
  Sparkles,
  ShieldCheck,
  History,
  Cpu,
  FileText,
  Settings,
  User,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

export const DashboardLayout: React.FC = () => {
  const { user, profile, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const [isSitesExpanded, setIsSitesExpanded] = useState(true);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      clearAuth();
      navigate('/login');
    }
  };

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    {
      label: 'Sites',
      icon: Globe,
      isCollapsible: true,
      isExpanded: isSitesExpanded,
      onToggle: () => setIsSitesExpanded(!isSitesExpanded),
      children: [
        { label: 'All Sites', path: '/sites' },
        { label: 'Create Site', path: '/sites/create' },
      ],
    },
    { label: 'Domains', path: '/domains', icon: Network },
    { label: 'File Manager', path: '/file-manager', icon: FolderOpen },
    { label: 'Databases', path: '/databases', icon: Database },
    { label: 'Script Installer', path: '/script-installer', icon: Sparkles },
    { label: 'SSL Certificates', path: '/ssl', icon: ShieldCheck },
    { label: 'Backups', path: '/backups', icon: History },
    { label: 'Resource Usage', path: '/resource-usage', icon: Cpu },
    { label: 'Logs', path: '/logs', icon: FileText },
    { label: 'Settings', path: '/settings', icon: Settings },
    { label: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-20 shrink-0">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
            W
          </div>
          <span className="font-semibold text-lg tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            WPHub SaaS
          </span>
        </div>

        <nav className="flex-1 px-4 py-3 space-y-0.5 overflow-y-auto no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            if (item.isCollapsible) {
              return (
                <div key={item.label} className="space-y-0.5">
                  <button
                    onClick={item.onToggle}
                    className="w-full flex items-center justify-between px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 transition-all focus:outline-none"
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </div>
                    {item.isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  {item.isExpanded && (
                    <div className="pl-9 space-y-0.5">
                      {item.children.map((child) => (
                        <NavLink
                          key={child.path}
                          to={child.path}
                          className={({ isActive }) =>
                            `block px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              isActive
                                ? 'bg-indigo-600/10 text-indigo-400 border-l-2 border-indigo-500 pl-3'
                                : 'text-slate-400 hover:text-slate-200'
                            }`
                          }
                        >
                          {child.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <NavLink
                key={item.path}
                to={item.path || ''}
                className={({ isActive }) =>
                  `w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600/10 text-indigo-400 border-l-2 border-indigo-500 pl-3.5'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`
                }
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center justify-between gap-3 px-2 py-2 rounded-lg bg-slate-950/45 border border-slate-800/60 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-sm font-medium border border-slate-700">
                {profile?.firstName?.charAt(0) || user?.email.charAt(0).toUpperCase()}
              </div>
              <div className="max-w-[120px] truncate">
                <p className="text-xs font-semibold truncate">
                  {profile?.firstName ? `${profile.firstName}` : user?.email.split('@')[0]}
                </p>
                <p className="text-[10px] text-slate-500 truncate">{user?.role}</p>
              </div>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleLogout}
            className="w-full bg-slate-800 hover:bg-slate-700/80 text-slate-300 hover:text-slate-100 border border-slate-700/60 text-xs py-1.5"
          >
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Dashboard Wrapper */}
      <main className="flex-1 flex flex-col overflow-y-auto bg-slate-950/40 relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none"></div>

        <header className="h-16 border-b border-slate-800/80 px-8 flex items-center justify-between relative z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-indigo-500"></div>
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
              Workspace Console
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span>Server status:</span>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-semibold text-slate-300">Live</span>
            </div>
          </div>
        </header>

        <div className="flex-1 p-8 overflow-y-auto relative z-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
