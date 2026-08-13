import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Users,
  LogOut,
  Activity,
  Package,
  TrendingUp,
  Mail,
  ChevronDown,
  Menu,
  X,
  Bell,
  Sliders,
  Inbox,
} from 'lucide-react';

import { useTheme } from './ThemeProvider';
import { useAuth } from './AuthContext';
import { fetchApi } from '../lib/api';
import NotificationsModal, { useNotifications } from './NotificationsModal';

interface SuperAdminLayoutProps {
  children: React.ReactNode;
  pageTitle?: string;
  pageSubtitle?: string;
}

export default function SuperAdminLayout({
  children,
  pageTitle,
  pageSubtitle,
}: SuperAdminLayoutProps) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { unreadCount } = useNotifications();

  const navItems = [
    { label: 'Overview', href: '/super-admin', icon: LayoutDashboard },
    { label: 'System Control', href: '/super-admin/system-control', icon: Sliders },
    { label: 'Businesses', href: '/super-admin/tenants', icon: Building2 },
    { label: 'Plans', href: '/super-admin/plans', icon: Package },
    { label: 'Subscriptions', href: '/super-admin/subscriptions', icon: CreditCard },
    { label: 'Inquiries', href: '/super-admin/inquiries', icon: Inbox },
    { label: 'Analytics', href: '/super-admin/analytics', icon: TrendingUp },
    { label: 'Users', href: '/super-admin/users', icon: Users },
    { label: 'Notifications', href: '/super-admin/communication', icon: Mail },
    { label: 'Tenant Dashboard', href: '/dashboard', icon: Activity },
  ];

  const isActive = (path: string) => {
    if (path === '/super-admin') {
      return router.pathname === '/super-admin';
    }
    return router.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    try {
      await fetchApi('/auth/logout', { method: 'POST' });
    } catch { /* ignore */ }
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white flex overflow-hidden transition-colors font-sans">
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-950 flex flex-col transition-transform duration-200 lg:relative lg:z-auto lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-950 shrink-0">
          <Link href="/super-admin" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-black text-white text-base shadow-[0_0_12px_rgba(99,102,241,0.4)] tracking-tighter">
              Q
            </div>
            <span className="font-extrabold text-xl tracking-tight text-zinc-900 dark:text-white">Qmova <span className="text-xs uppercase px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold ml-1">God Mode</span></span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                  active
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 font-medium border border-indigo-200 dark:border-indigo-500/30'
                    : 'text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white border border-transparent'
                }`}
              >
                <item.icon className={`w-5 h-5 ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-zinc-500'}`} />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-white/10">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-xs shadow-[0_0_8px_rgba(99,102,241,0.3)]">
              {(user?.email || 'SA')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">Super Admin</p>
              <p className="text-xs text-gray-400 dark:text-zinc-500 truncate">{user?.email || 'admin'}</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:hidden fixed inset-0 bg-zinc-950/40 dark:bg-black/80 backdrop-blur-md z-40" onClick={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col h-screen relative">
        <header className="h-16 flex items-center justify-between px-6 border-b border-gray-200 dark:border-white/10 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md z-30 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            {(pageTitle || pageSubtitle) && (
              <div>
                {pageTitle && (
                  <h1 className="text-sm font-bold text-gray-900 dark:text-white">{pageTitle}</h1>
                )}
                {pageSubtitle && (
                  <p className="text-xs text-gray-400 dark:text-zinc-500">{pageSubtitle}</p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center border border-gray-200 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors relative"
              title="Notifications & System Alerts"
            >
              <Bell className="w-4 h-4 text-gray-500 dark:text-zinc-400" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
              )}
            </button>
            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center border border-gray-200 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
            >
              {theme === 'dark' ? (
                <span className="text-zinc-400 text-sm">☀️</span>
              ) : (
                <span className="text-gray-600 text-sm">🌙</span>
              )}
            </button>
            <button
              onClick={handleLogout}
              className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center border border-gray-200 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
              title="Log out"
            >
              <LogOut className="w-4 h-4 text-gray-500 dark:text-zinc-400" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 lg:p-8 z-10 relative">
          {children}
        </main>
        <NotificationsModal open={notifOpen} onClose={() => setNotifOpen(false)} />
      </div>
    </div>
  );
}
