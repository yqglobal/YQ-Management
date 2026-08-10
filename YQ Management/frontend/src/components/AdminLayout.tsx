import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  LayoutDashboard,
  List,
  Scan,
  History,
  QrCode,
  Users,
  Settings,
  LogOut,
  CreditCard,
  Menu,
  X,
  Bell,
  ChevronDown,
  Sun,
  Moon,
  Hash,
  Shield,
} from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { DashboardTour } from './DashboardTour';
import { WhatsAppStatusIndicator } from './WhatsAppStatusIndicator';
import { useAuth } from './AuthContext';
import { fetchApi } from '../lib/api';
import NotificationsModal, { useNotifications } from './NotificationsModal';

interface AdminLayoutProps {
  children: React.ReactNode;
  pageTitle?: string;
  pageSubtitle?: string;
}

export default function AdminLayout({ children, pageTitle, pageSubtitle }: AdminLayoutProps) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { unreadCount } = useNotifications();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const initials = user?.email ? user.email.substring(0, 2).toUpperCase() : '??';

  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    fetchApi('/queue').then((data: any) => {
      if (Array.isArray(data)) setQueueCount(data.length);
    }).catch(() => {});
  }, []);

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Queues', href: '/dashboard/queues', icon: List, id: 'tour-queues-nav' },
    { label: 'Scanner', href: '/dashboard/scanner', icon: Scan },
    { label: 'Analytics & Records', href: '/dashboard/history', icon: History },
    { label: 'QR Display', href: '/dashboard/display-picker', icon: QrCode },
  ];

  const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.email?.toLowerCase() === 'yqbuddysa@gmail.com';

  const bottomItems = [
    ...(isSuperAdmin ? [{ label: 'Super Admin', href: '/super-admin', icon: Shield, adminOnly: true }] : []),
    { label: 'Team Members', href: '/dashboard/settings/staff', icon: Users, adminOnly: true },
    { label: 'Billing & Plans', href: '/dashboard/settings/billing', icon: CreditCard, adminOnly: true },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings, id: 'tour-settings-nav', adminOnly: true },
  ];

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return router.pathname === '/dashboard';
    }
    return router.pathname.startsWith(path);
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menuItems = [
    {
      label: theme === 'dark' ? 'Light Mode' : 'Dark Mode',
      icon: theme === 'dark' ? Sun : Moon,
      onClick: () => {
        toggleTheme();
        setDropdownOpen(false);
      },
    },
    {
      label: 'Settings',
      icon: Settings,
      onClick: () => {
        router.push('/dashboard/settings');
        setDropdownOpen(false);
      },
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white flex overflow-hidden transition-colors">
      <DashboardTour />

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-[65] lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`w-64 bg-white dark:bg-zinc-950 border-r border-gray-200 dark:border-white/10 flex flex-col shrink-0 transition-transform duration-300 ease-in-out fixed inset-y-0 left-0 z-[70] lg:relative lg:z-auto lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-white/10 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-black text-white text-base shadow-[0_0_12px_rgba(99,102,241,0.4)] tracking-tighter">
              Q
            </div>
            <span className="font-extrabold text-xl tracking-tight text-zinc-900 dark:text-white">Qmova</span>
          </Link>
          <button onClick={() => setMobileOpen(false)} className="ml-auto lg:hidden p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
{navItems.map((item) => {
             const active = isActive(item.href);
             const isQueues = item.href === '/dashboard/queues';
             return (
               <Link
                 key={item.href}
                 href={item.href}
                 id={item.id}
                 onClick={() => setMobileOpen(false)}
                 className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                   active
                     ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 font-medium border border-indigo-200 dark:border-indigo-500/20'
                     : 'text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white border border-transparent'
                 }`}
               >
                 <item.icon className={`w-5 h-5 ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-zinc-500'}`} />
                 {item.label}
                 {isQueues && queueCount > 0 && (
                   <span className="ml-auto px-2 py-0.5 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-full">
                     {queueCount}
                   </span>
                 )}
               </Link>
             );
           })}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-white/10 space-y-1 shrink-0">
          {bottomItems.map((item) => {
            if (item.adminOnly && (!user || user.role !== 'TENANT_ADMIN')) return null;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                id={item.id}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  active
                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 font-medium border border-indigo-200 dark:border-indigo-500/20'
                    : 'text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white border border-transparent'
                }`}
              >
                <item.icon className={`w-5 h-5 ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-zinc-500'}`} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        <div className="absolute top-0 -right-64 w-[500px] h-[500px] bg-indigo-600/10 rounded-full mix-blend-screen filter blur-[150px] pointer-events-none z-0"></div>
        <div className="absolute bottom-0 -left-64 w-[500px] h-[500px] bg-purple-600/10 rounded-full mix-blend-screen filter blur-[150px] pointer-events-none z-0"></div>

        {/* Topbar */}
        <header className="h-16 flex items-center justify-between px-4 lg:px-6 border-b border-gray-200 dark:border-white/10 bg-white/70 dark:bg-black/40 backdrop-blur-xl z-[60] shrink-0 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors shrink-0">
              <Menu className="w-5 h-5" />
            </button>
            {(pageTitle || pageSubtitle) && (
              <div className="min-w-0">
                {pageTitle && <h1 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{pageTitle}</h1>}
                {pageSubtitle && <p className="text-[11px] text-gray-400 dark:text-zinc-500 truncate">{pageSubtitle}</p>}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <WhatsAppStatusIndicator />

            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="flex w-8 h-8 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-gray-500 dark:text-zinc-400 relative"
              title="Notifications & System Alerts"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 border-2 border-white dark:border-zinc-900 animate-pulse"></span>
              )}
            </button>

            {/* User Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-[11px] shadow-[0_0_8px_rgba(99,102,241,0.3)]">
                  {initials}
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-zinc-300 hidden lg:block">{user?.email?.split('@')[0] || 'Operator'}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-xl shadow-lg shadow-black/5 z-[999] py-1 animate-in fade-in slide-in-from-top-1">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-white/5">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user?.email || 'Operator'}</p>
                    <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">{user?.role || 'Member'}</p>
                  </div>

                  {menuItems.map((item) => (
                    <button
                      key={item.label}
                      onClick={item.onClick}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                    >
                      <item.icon className="w-4 h-4 text-gray-400" />
                      {item.label}
                    </button>
                  ))}

                  <div className="my-1 border-t border-gray-100 dark:border-white/5"></div>

                  <button
                    onClick={() => {
                      logout();
                      setDropdownOpen(false);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 z-10 relative">
          {children}
        </main>
        <NotificationsModal open={notifOpen} onClose={() => setNotifOpen(false)} />
      </div>
    </div>
  );
}