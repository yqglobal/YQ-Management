import { getTenantUrl } from "../lib/utils";
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTheme } from './ThemeProvider';
import { Logo } from './Logo';
import { DashboardTour } from './DashboardTour';
import { WhatsAppStatusIndicator } from './WhatsAppStatusIndicator';
import { useAuth } from './AuthContext';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../lib/api';
import { usePlan } from '../hooks/usePlan';
import { toast } from 'sonner';
import { QueueMigrationModal } from './modals/QueueMigrationModal';
import { ServiceModal } from './modals/ServiceModal';
import { useSocket } from '../components/SocketProvider';

interface AdminLayoutProps {
  children: React.ReactNode;
  pageTitle?: string;
  pageSubtitle?: string;
  topNavLinks?: { label: string; href: string }[];
  settingsMode?: boolean;
  settingsNavLinks?: { label: string; href: string; icon?: React.ReactNode }[];
  noPadding?: boolean;
}

export default function AdminLayout({ children, pageTitle, pageSubtitle, topNavLinks = [], settingsMode = false, settingsNavLinks = [], noPadding = false }: AdminLayoutProps) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [activeLocationId, setActiveLocationId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const locationDropdownRef = useRef<HTMLDivElement>(null);
  const previewDropdownRef = useRef<HTMLDivElement>(null);

  // Listen for admin-toast custom events (dispatched from inline components without Sonner access)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.type === 'success') toast.success(detail.message);
      else if (detail?.type === 'error') toast.error(detail.message);
      else toast(detail?.message || '');
    };
    window.addEventListener('admin-toast', handler);
    return () => window.removeEventListener('admin-toast', handler);
  }, []);

  // Socket connection for notifications
  useEffect(() => {
    if (!socket || !user?.tenantId) return;
    
    const handleAppointment = (data: any) => {
      toast.success(`New Appointment!`, {
        description: `${data.appointment?.customerName || 'A customer'} booked an appointment.`,
        duration: 8000,
      });
    };

    const handleToken = (data: any) => {
      toast.info(`New Walk-in`, {
        description: `${data.token?.customerName || 'A customer'} joined the queue.`,
        duration: 5000,
      });
    };

    socket.on('APPOINTMENT_CREATED', handleAppointment);
    socket.on('TOKEN_JOINED', handleToken);

    return () => {
      socket.off('APPOINTMENT_CREATED', handleAppointment);
      socket.off('TOKEN_JOINED', handleToken);
    };
  }, [socket, user?.tenantId]);

  const { data: tenant } = useQuery({
    queryKey: ['tenant', 'me'],
    queryFn: () => fetchApi('/tenant/me').catch(() => null),
  });

  const { data: acceptedPolicies = [], isLoading: isLoadingPolicies } = useQuery({
    queryKey: ['policies', 'accepted'],
    queryFn: () => fetchApi('/policies/accepted').catch(() => []),
    enabled: !!user,
  });

  const hasAcceptedPolicies = isLoadingPolicies || !user || (acceptedPolicies.some((p: any) => p.policy.type === 'TERMS_OF_SERVICE') && acceptedPolicies.some((p: any) => p.policy.type === 'PRIVACY_POLICY'));

  const allLocations = tenant?.locations || [];
  const locations = (user?.role === 'SUPER_ADMIN' || user?.role === 'TENANT_ADMIN' || user?.role === 'ADMIN')
    ? allLocations
    : allLocations.filter((l: any) => user?.allowedLocationIds?.includes(l.id));

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('yq_active_location_id');
      if (saved) {
        setActiveLocationId(saved);
      } else if (locations.length > 0 && !activeLocationId) {
        setActiveLocationId(locations[0].id);
      }
    }
  }, [locations, activeLocationId]);

  const handleLocationSelect = (id: string) => {
    setActiveLocationId(id);
    localStorage.setItem('yq_active_location_id', id);
    setLocationOpen(false);
  };

  const activeLocation = locations.find((l: any) => l.id === activeLocationId) || locations[0];

  const navItems = [
    { label: 'Inbox', href: '/dashboard/inbox', icon: 'chat', pageId: 'inbox' },
    { label: 'Service Desk', href: '/dashboard/service-desk', icon: 'desktop_windows', pageId: 'service-desk' },
    { label: 'Scanner', href: '/dashboard/check-in', icon: 'qr_code_scanner', pageId: 'service-desk' },
    { label: 'Schedule', href: '/dashboard/appointments', icon: 'calendar_today', pageId: 'appointments' },
    { label: 'Queues', href: '/dashboard/queues', icon: 'list_alt', pageId: 'service-desk' },
    { label: 'Analytics', href: '/dashboard/analytics', icon: 'analytics', pageId: 'analytics' },
  ];

  const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.email?.toLowerCase() === 'yqbuddysa@gmail.com';
  const plan = usePlan();

  const bottomItems = [
    ...(isSuperAdmin ? [{ label: 'Super Admin', href: '/super-admin', icon: 'shield', adminOnly: true, pageId: 'super-admin' }] : []),
    { label: 'Settings', href: '/dashboard/settings', icon: 'settings', id: 'tour-settings-nav', adminOnly: true, pageId: 'settings' },
  ];

  const hasPageAccess = (pageId?: string) => {
    if (!pageId) return true;
    if (user?.role === 'SUPER_ADMIN' || user?.role === 'TENANT_ADMIN' || user?.role === 'ADMIN') return true;
    return user?.allowedPages?.includes(pageId) || user?.allowedPages?.includes('dashboard'); // dashboard access acts as a catch-all basic access if needed
  };

  const filteredNavItems = navItems.filter(item => hasPageAccess(item.pageId));
  const filteredBottomItems = bottomItems.filter(item => hasPageAccess(item.pageId));

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return router.pathname === '/dashboard';
    }
    return router.pathname.startsWith(path);
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(e.target as Node)) {
        setLocationOpen(false);
      }
      if (previewDropdownRef.current && !previewDropdownRef.current.contains(e.target as Node)) {
        setPreviewOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Strict enforcement: redirect to billing if plan is expired/pending payment
  useEffect(() => {
    if (!user) return; // Let AuthContext handle unauthenticated users
    // Super admins have no tenant subscription — never redirect them to billing
    const isSuperAdminUser = user?.role === 'SUPER_ADMIN' || user?.email?.toLowerCase() === 'yqbuddysa@gmail.com';
    if (isSuperAdminUser) return;
    if (!plan.isLoading && plan.status !== null && !plan.canAccess && !router.pathname.startsWith('/dashboard/settings/billing')) {
      router.replace('/dashboard/settings/billing');
    }
  }, [plan.isLoading, plan.status, plan.canAccess, router.pathname, user]);

  const [showQueueMigration, setShowQueueMigration] = useState(true);

  // Derive unlinked queues for the transition modal
  const hasQueuePermissions = user?.role === 'SUPER_ADMIN' || user?.role === 'TENANT_ADMIN' || user?.role === 'ADMIN';
  const unlinkedQueues = tenant?.queues?.filter((q: any) => !q.services || q.services.length === 0) || [];
  const services = tenant?.services || [];

  return (
    <div className="bg-canvas dark:bg-dark-canvas text-on-surface dark:text-white font-body-md min-h-screen flex flex-col antialiased">
      {!hasAcceptedPolicies && !!user?.workspaceId && user?.personalSettings?.onboardingCompleted !== false && user?.role !== 'SUPER_ADMIN' && <AdvancedPoliciesModal />}
      <DashboardTour />

      {/* Mobile overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[65] md:hidden" 
          onClick={() => setMobileOpen(false)} 
        />
      )}

      {/* TopAppBar */}
      <header className={`fixed top-0 right-0 bg-surface dark:bg-dark-card border-b border-border dark:border-dark-border flex flex-col justify-end transition-all duration-200 z-50 ${mobileOpen ? 'w-full' : 'w-full md:w-[calc(100%-256px)]'} ${settingsMode ? 'h-auto' : 'h-header-h'}`}>
        {settingsMode ? (
          /* ── Settings-specific header ── */
          <div className="flex flex-col">
            {/* Top row: back link + title + theme toggle */}
            <div className="flex items-center justify-between px-gutter h-14">
              <div className="flex items-center gap-3">
                <button onClick={() => setMobileOpen(true)} className="md:hidden text-on-surface-variant p-2 -ml-2 rounded-lg hover:bg-surface-container-low transition-colors flex items-center justify-center">
                  <span className="material-symbols-outlined">menu</span>
                </button>
                <Link href="/dashboard" className="flex items-center gap-1.5 text-on-surface-variant hover:text-primary transition-colors text-sm font-medium">
                  <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>
                <span className="text-border dark:text-dark-border">/</span>
                <span className="text-sm font-semibold text-on-surface dark:text-white">Settings</span>
              </div>
              <button
                onClick={toggleTheme}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors text-on-surface-variant"
                title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              >
                <span className="material-symbols-outlined text-[20px]">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
              </button>
            </div>
            {/* Bottom row: settings tabs */}
            <nav className="flex items-center gap-1 px-gutter overflow-x-auto scrollbar-none border-t border-border/50 dark:border-dark-border/50">
              {settingsNavLinks.map(link => {
                const active = router.pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${
                      active
                        ? 'text-primary dark:text-sky-400 border-primary dark:border-sky-400'
                        : 'text-on-surface-variant dark:text-outline border-transparent hover:text-on-surface dark:hover:text-white hover:border-border'
                    }`}
                  >
                    {link.icon && <span className={active ? 'text-primary dark:text-sky-400' : 'text-on-surface-variant dark:text-outline'}>{link.icon}</span>}
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        ) : (
          /* ── Normal dashboard header ── */
          <div className="flex items-center justify-between px-gutter h-full">
            <div className="flex items-center h-full gap-4 lg:gap-8">
              <button onClick={() => setMobileOpen(true)} className="md:hidden text-on-surface-variant p-2 -ml-2 rounded-lg hover:bg-surface-container-low transition-colors flex items-center justify-center">
                <span className="material-symbols-outlined">menu</span>
              </button>
              {topNavLinks.length === 0 ? (
                <span className="font-headline-sm text-headline-sm font-semibold text-primary dark:text-primary-fixed-dim hidden sm:block">
                  {pageTitle || tenant?.name || 'Dashboard'}
                </span>
              ) : (
                <h2 className="font-headline-sm text-headline-sm font-semibold text-primary dark:text-primary-fixed-dim">
                  {pageTitle || tenant?.name || 'Dashboard'}
                </h2>
              )}
              {topNavLinks.length > 0 && (
                <nav className="hidden lg:flex items-end h-full gap-6">
                  {topNavLinks.map(link => (
                    <Link key={link.href} href={link.href} className={`pb-4 transition-colors cursor-pointer font-body-md text-body-md ${
                      router.pathname === link.href ? 'text-primary dark:text-primary-fixed font-bold border-b-2 border-primary' : 'text-on-surface-variant dark:text-surface-variant hover:text-primary dark:hover:text-primary-fixed'
                    }`}>
                      {link.label}
                    </Link>
                  ))}
                </nav>
              )}
            </div>
            <div className="flex items-center gap-3 md:gap-4">
              <div className="relative hidden sm:block" ref={previewDropdownRef}>
                <button
                  onClick={() => setPreviewOpen(!previewOpen)}
                  className="bg-surface-container-low text-on-surface hover:bg-surface-container-high px-4 h-[38px] rounded-lg font-body-sm font-semibold transition-colors flex items-center gap-2 text-sm border border-border"
                >
                  <span className="material-symbols-outlined text-[16px]">visibility</span>
                  <span>Preview</span>
                </button>
                {previewOpen && (
                  <div className="absolute top-full right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-lg shadow-black/5 z-[100] py-1 animate-in fade-in" onClick={e => e.stopPropagation()}>
                    <div className="px-4 py-2 border-b border-border">
                      <p className="font-label-caps text-[10px] uppercase tracking-widest text-outline font-bold">Customer Views</p>
                    </div>
                    <a
                      href={`/tv/${tenant?.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-surface-container-low transition-colors text-on-surface"
                      onClick={() => setPreviewOpen(false)}
                    >
                      <span className="material-symbols-outlined text-[18px] text-primary">tv</span>
                      TV Display
                    </a>
                    <a
                      href={tenant?.subdomain ? getTenantUrl(tenant.subdomain, '/booking') : '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-surface-container-low transition-colors text-on-surface"
                      onClick={() => setPreviewOpen(false)}
                    >
                      <span className="material-symbols-outlined text-[18px] text-emerald-500">book_online</span>
                      Booking Page
                    </a>

                  </div>
                )}
              </div>
              <WhatsAppStatusIndicator />
              <div className="relative hidden sm:block" ref={locationDropdownRef}>
                <button 
                  onClick={() => setLocationOpen(!locationOpen)}
                  className="bg-primary text-on-primary px-4 h-[38px] rounded-lg font-body-sm font-semibold hover:bg-primary-container transition-colors flex items-center gap-2 text-sm"
                >
                  <span className="max-w-[110px] truncate">{activeLocation?.name || 'Facility'}</span>
                  <span className="material-symbols-outlined text-[16px]">expand_more</span>
                </button>
                {locationOpen && (
                  <div className="absolute top-full right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-lg shadow-black/5 z-[100] py-1 animate-in fade-in cursor-default" onClick={e => e.stopPropagation()}>
                    <div className="px-4 py-2 border-b border-border">
                      <p className="font-label-caps text-[10px] uppercase tracking-widest text-outline font-bold">Select Location</p>
                    </div>
                    {locations.length > 0 ? (
                      locations.map((loc: any) => (
                        <button 
                          key={loc.id}
                          onClick={() => handleLocationSelect(loc.id)} 
                          className={`w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-surface-container-low transition-colors flex items-center justify-between ${activeLocationId === loc.id ? 'text-primary' : 'text-on-surface-variant'}`}
                        >
                          {loc.name} {activeLocationId === loc.id && <span className="material-symbols-outlined text-[18px]">check</span>}
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-sm text-on-surface-variant">No locations found</div>
                    )}
                    <div className="border-t border-border mt-1 pt-1">
                      <Link href="/dashboard/settings/operations" className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-surface-container-low transition-colors text-on-surface-variant flex items-center gap-3">
                        <span className="material-symbols-outlined text-[18px]">settings</span> Manage Locations
                      </Link>
                    </div>
                  </div>
                )}
              </div>
              <div
                className="w-8 h-8 rounded-full overflow-hidden border border-border cursor-pointer flex items-center justify-center bg-primary/10 dark:bg-primary/20 text-primary font-bold text-xs relative select-none hover:ring-2 hover:ring-primary/40 transition-all"
                onClick={() => setProfileOpen(true)}
                title="Profile & Settings"
              >
                {user?.email ? user.email.substring(0, 2).toUpperCase() : '??'}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* SideNavBar */}
      <nav 
        aria-label="Main Navigation" 
        className={`fixed left-0 top-0 h-full w-sidebar-w bg-surface dark:bg-dark-canvas border-r border-border dark:border-dark-border flex flex-col py-gutter px-4 z-[70] transition-transform duration-300 md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="mb-8 px-4 flex flex-col mt-2">
          <div className="flex items-start gap-3">
            <div className="flex flex-col">
              <Logo width={140} height={22} />
              {!plan.isLoading && (plan.planName || plan.isTrialActive) && (
                <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-primary dark:text-primary mt-1 ml-1 opacity-80">
                  {plan.isTrialActive ? 'Trial' : plan.planName?.replace(' Plan', '')}
                </span>
              )}
            </div>
            <button onClick={() => setMobileOpen(false)} className="md:hidden ml-auto p-2 rounded-lg hover:bg-surface-container-low text-on-surface-variant">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-2 overflow-y-auto scrollbar-none">
          {filteredNavItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer active:opacity-80 font-body-md text-body-md ${
                  active 
                    ? 'text-primary dark:text-white font-semibold bg-surface-container-low dark:bg-white/10' 
                    : 'text-on-surface-variant dark:text-outline hover:bg-surface-container-low dark:hover:bg-white/5'
                }`}
              >
                <span className="material-symbols-outlined" style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
          {/* Onboarding Progress Tracker */}
          {(() => {
            if (!tenant) return null;

            const bookingShared = typeof window !== 'undefined' && !!localStorage.getItem('bookingPageShared');

            const bookingUrl = tenant.subdomain ? getTenantUrl(tenant.subdomain, '/booking') : '';

            const steps: { label: string; done: boolean; href?: string; onClick?: () => void; isButton?: boolean }[] = [
              { label: 'Add a Location', done: !!(tenant.locations && tenant.locations.length > 0), href: '/dashboard/settings/operations' },
              { label: 'Create a Service', done: !!(tenant.services && tenant.services.length > 0), href: '/dashboard/settings/operations' },
              { label: 'Set up a Queue', done: !!(tenant.queues && tenant.queues.length > 0), href: '/dashboard/queues' },
              { label: 'Connect WhatsApp', done: !!tenant.whatsappConnected, href: '/dashboard/settings/integrations' },
              {
                label: 'Share Booking Page',
                done: bookingShared,
                isButton: true,
                onClick: () => {
                  const url = bookingUrl || window.location.origin;
                  navigator.clipboard.writeText(url).then(() => {
                    localStorage.setItem('bookingPageShared', '1');
                    // Force re-render via router refresh trick
                    router.replace(router.asPath);
                  }).catch(() => {});
                  // toast is imported via sonner on consuming pages; use native alert fallback
                  const toastEvent = new CustomEvent('admin-toast', { detail: { message: 'Booking page link copied to clipboard!', type: 'success' } });
                  window.dispatchEvent(toastEvent);
                }
              },
            ];
            const doneCount = steps.filter(s => s.done).length;
            const allDone = doneCount === steps.length;
            
            // renderUpgradeCard logic removed here

            if (allDone) {
              return null; // Upgrade card moved down
            }

            return (
              <>
                <div className="px-2 pb-2 mt-4">
                  <div className="bg-surface-container-low dark:bg-zinc-900 border border-border dark:border-dark-border rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-on-surface dark:text-white uppercase tracking-wider">Setup</p>
                      <span className="text-xs font-mono text-primary font-semibold">{doneCount}/{steps.length}</span>
                    </div>
                    <div className="w-full h-1.5 bg-border dark:bg-dark-border rounded-full mb-3 overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${(doneCount / steps.length) * 100}%` }}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {steps.map((step, i) => {
                        const icon = (
                          <span className={`material-symbols-outlined text-[14px] shrink-0 ${
                            step.done ? 'text-emerald-500' : 'text-on-surface-variant'
                          }`} style={{ fontVariationSettings: step.done ? "'FILL' 1" : "'FILL' 0" }}>
                            {step.done ? 'check_circle' : 'radio_button_unchecked'}
                          </span>
                        );
                        const textClass = `flex items-center gap-2 text-xs py-1 transition-colors ${
                          step.done ? 'text-on-surface-variant' : 'text-on-surface dark:text-white hover:text-primary cursor-pointer'
                        }`;

                        if (step.isButton) {
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={step.onClick}
                              className={textClass + ' w-full text-left'}
                            >
                              {icon}
                              {step.label}
                              {!step.done && (
                                <span className="material-symbols-outlined text-[12px] text-outline ml-auto">content_copy</span>
                              )}
                            </button>
                          );
                        }
                        return (
                          <Link
                            key={i}
                            href={step.href!}
                            className={textClass}
                          >
                            {icon}
                            {step.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
          {/* Upgrade Card */}
          {/* Upgrade / Trial Card */}
          {(() => {
            const bookingShared = typeof window !== 'undefined' && !!localStorage.getItem('bookingPageShared');
            const steps = [
              { done: !!(tenant?.locations && tenant.locations.length > 0) },
              { done: !!(tenant?.services && tenant.services.length > 0) },
              { done: !!(tenant?.queues && tenant.queues.length > 0) },
              { done: !!tenant?.whatsappConnected },
              { done: bookingShared }
            ];
            const allDone = steps.filter(s => s.done).length === steps.length;

            if (plan.isLoading) return null;

            // Trial card: always show regardless of setup progress
            if (plan.status === 'TRIAL') {
              return (
                <div className="px-2 pb-2 mt-4">
                  <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-4 rounded-2xl text-white shadow-lg shadow-indigo-500/20 relative overflow-hidden group cursor-pointer transition-transform hover:-translate-y-0.5">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-2">
                        <span className="material-symbols-outlined text-[20px]">stars</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full backdrop-blur-md">Trial</span>
                      </div>
                      <h4 className="font-bold text-sm mb-1">Upgrade to Standard</h4>
                      <p className="text-xs text-white/80 mb-3">{plan.trialDaysLeft > 0 ? `${plan.trialDaysLeft} days left in trial` : 'Trial period ending'}</p>
                      <Link href="/dashboard/settings/billing" className="block w-full text-center bg-white text-indigo-600 font-bold text-xs py-2 rounded-lg hover:bg-indigo-50 transition-colors">
                        View Plans
                      </Link>
                    </div>
                  </div>
                </div>
              );
            }

            // All other cards only show after setup is complete
            if (!allDone) return null;

            return (
              <div className="px-2 pb-2 mt-4">
                {!plan.status && user?.role !== 'SUPER_ADMIN' && (
                  <div className="bg-surface-container-low dark:bg-zinc-900 border border-border dark:border-zinc-800 p-4 rounded-2xl shadow-sm relative overflow-hidden group cursor-pointer transition-transform hover:-translate-y-0.5 hover:border-primary">
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-2">
                        <span className="material-symbols-outlined text-[20px] text-primary">rocket_launch</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full">No Plan</span>
                      </div>
                      <h4 className="font-bold text-sm text-on-surface dark:text-white mb-1">Choose a Plan</h4>
                      <p className="text-xs text-on-surface-variant dark:text-zinc-400 mb-3">Subscribe to access features.</p>
                      <Link href="/dashboard/settings/billing" className="block w-full text-center bg-primary text-on-primary font-bold text-xs py-2 rounded-lg hover:bg-primary-container transition-colors">
                        View Plans
                      </Link>
                    </div>
                  </div>
                )}
                {plan.status === 'ACTIVE' && plan.planTier === 'standard' && (
                  <div className="bg-surface-container-low dark:bg-zinc-900 border border-border dark:border-zinc-800 p-4 rounded-2xl shadow-sm relative overflow-hidden group cursor-pointer transition-transform hover:-translate-y-0.5 hover:border-primary">
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-2">
                        <span className="material-symbols-outlined text-[20px] text-primary">rocket_launch</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full">Standard</span>
                      </div>
                      <h4 className="font-bold text-sm text-on-surface dark:text-white mb-1">Unlock Features</h4>
                      <p className="text-xs text-on-surface-variant dark:text-zinc-400 mb-3">Upgrade to access AI & Webhooks.</p>
                      <Link href="/dashboard/settings/billing" className="block w-full text-center bg-primary text-on-primary font-bold text-xs py-2 rounded-lg hover:bg-primary-container transition-colors">
                        Upgrade
                      </Link>
                    </div>
                  </div>
                )}
                {plan.status === 'PAST_DUE' && (
                  <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 p-4 rounded-2xl shadow-sm relative overflow-hidden group cursor-pointer transition-transform hover:-translate-y-0.5">
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-2">
                        <span className="material-symbols-outlined text-[20px] text-amber-600 dark:text-amber-500">credit_card_off</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">Past Due</span>
                      </div>
                      <h4 className="font-bold text-sm text-amber-900 dark:text-amber-400 mb-1">Grace Period</h4>
                      <p className="text-xs text-amber-700 dark:text-amber-400/80 mb-3">Please update payment method.</p>
                      <Link href="/dashboard/settings/billing" className="block w-full text-center bg-amber-500 text-white font-bold text-xs py-2 rounded-lg hover:bg-amber-600 transition-colors">
                        Fix Payment
                      </Link>
                    </div>
                  </div>
                )}
                {plan.status === 'PENDING_PAYMENT' && (
                  <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 p-4 rounded-2xl shadow-sm relative overflow-hidden group cursor-pointer transition-transform hover:-translate-y-0.5">
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-2">
                        <span className="material-symbols-outlined text-[20px] text-blue-600 dark:text-blue-400">pending</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">Processing</span>
                      </div>
                      <h4 className="font-bold text-sm text-blue-900 dark:text-blue-300 mb-1">Payment Pending</h4>
                      <p className="text-xs text-blue-700 dark:text-blue-400/80 mb-3">Your payment is being verified.</p>
                      <Link href="/dashboard/settings/billing" className="block w-full text-center bg-blue-600 text-white font-bold text-xs py-2 rounded-lg hover:bg-blue-700 transition-colors">
                        View Status
                      </Link>
                    </div>
                  </div>
                )}
                {(plan.status === 'EXPIRED' || plan.status === 'CANCELLED') && (
                  <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 p-4 rounded-2xl shadow-sm relative overflow-hidden group cursor-pointer transition-transform hover:-translate-y-0.5">
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-2">
                        <span className="material-symbols-outlined text-[20px] text-red-600 dark:text-red-400">warning</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">{plan.status === 'CANCELLED' ? 'Cancelled' : 'Expired'}</span>
                      </div>
                      <h4 className="font-bold text-sm text-red-900 dark:text-red-300 mb-1">Action Required</h4>
                      <p className="text-xs text-red-700 dark:text-red-400/80 mb-3">Please renew your subscription.</p>
                      <Link href="/dashboard/settings/billing" className="block w-full text-center bg-red-600 text-white font-bold text-xs py-2 rounded-lg hover:bg-red-700 transition-colors">
                        Renew Now
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        <div className="flex flex-col gap-2 pt-4 border-t border-border dark:border-dark-border">
          {filteredBottomItems.map((item) => {
            if (item.adminOnly && (!user || !['TENANT_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(user.role))) return null;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                id={item.id}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer active:opacity-80 font-body-md text-body-md ${
                  active 
                    ? 'text-primary dark:text-white font-semibold bg-surface-container-low dark:bg-white/10' 
                    : 'text-on-surface-variant dark:text-outline hover:bg-surface-container-low dark:hover:bg-white/5'
                }`}
              >
                <span className="material-symbols-outlined" style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <main className={`ml-0 md:ml-sidebar-w flex-1 flex flex-col bg-canvas dark:bg-dark-canvas relative min-w-0 ${settingsMode ? 'pt-[108px]' : 'pt-header-h'}`}>
        <div className={`flex-1 w-full min-w-0 relative flex flex-col ${noPadding ? '' : 'p-margin-mobile md:p-margin-desktop'}`}>
           {children}
        </div>
      </main>

      {/* Profile Panel overlay */}
      {profileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[200]"
            onClick={() => setProfileOpen(false)}
          />
          <div className="fixed top-0 right-0 h-full w-80 bg-surface dark:bg-dark-card border-l border-border dark:border-dark-border z-[201] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border dark:border-dark-border">
              <p className="text-sm font-semibold text-on-surface dark:text-white">Account</p>
              <button
                onClick={() => setProfileOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-low dark:hover:bg-white/10 transition-colors text-on-surface-variant"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Avatar + info */}
            <div className="px-6 py-6 border-b border-border dark:border-dark-border">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 dark:bg-primary/20 border-2 border-primary/30 flex items-center justify-center text-primary font-bold text-xl shrink-0">
                  {user?.email ? user.email.substring(0, 2).toUpperCase() : '??'}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-on-surface dark:text-white text-base truncate">
                    {user?.email?.split('@')[0] || 'Operator'}
                  </p>
                  <p className="text-xs text-on-surface-variant dark:text-zinc-400 truncate mt-0.5">{user?.email || ''}</p>
                  <span className="inline-flex items-center mt-1.5 px-2 py-0.5 rounded-full bg-primary/10 dark:bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider">
                    {user?.role || 'User'}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex-1 py-3 overflow-y-auto">
              <button
                onClick={() => { toggleTheme(); }}
                className="flex w-full items-center gap-3 px-6 py-3 text-sm text-on-surface-variant hover:bg-surface-container-low dark:hover:bg-white/5 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
                <span>{theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
              </button>

              <Link
                href="/dashboard/settings/profile"
                onClick={() => setProfileOpen(false)}
                className="flex w-full items-center gap-3 px-6 py-3 text-sm text-on-surface-variant hover:bg-surface-container-low dark:hover:bg-white/5 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">manage_accounts</span>
                <span>Profile Settings</span>
              </Link>

              <Link
                href="/dashboard/settings"
                onClick={() => setProfileOpen(false)}
                className="flex w-full items-center gap-3 px-6 py-3 text-sm text-on-surface-variant hover:bg-surface-container-low dark:hover:bg-white/5 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">settings</span>
                <span>Settings</span>
              </Link>
            </div>

            {/* Sign out */}
            <div className="px-6 py-4 border-t border-border dark:border-dark-border">
              <button
                onClick={() => { setProfileOpen(false); logout(); }}
                className="flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border dark:border-dark-border text-sm font-medium text-alert hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                Sign out
              </button>
            </div>
          </div>
        </>
      )}

      {showQueueMigration && hasQueuePermissions && unlinkedQueues.length > 0 && (
        <QueueMigrationModal
          unlinkedQueues={unlinkedQueues}
          services={services}
          tenantId={tenant?.id}
          onComplete={() => setShowQueueMigration(false)}
          onCreateService={() => setIsServiceModalOpen(true)}
        />
      )}

      {isServiceModalOpen && (
        <ServiceModal
          isOpen={isServiceModalOpen}
          onClose={() => setIsServiceModalOpen(false)}
        />
      )}
    </div>
  );
}

function AdvancedPoliciesModal() {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Check if content doesn't overflow on mount
  useEffect(() => {
    if (scrollRef.current) {
      if (scrollRef.current.scrollHeight <= scrollRef.current.clientHeight) {
        setHasScrolledToBottom(true);
      }
    }
  }, []);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 20) {
        setHasScrolledToBottom(true);
      }
    }
  };

  const handleAccept = async () => {
    if (!isChecked) return;
    setIsSubmitting(true);
    try {
      await fetchApi('/policies/accept', { method: 'POST', body: JSON.stringify({ type: 'TERMS_OF_SERVICE', version: '1.0' }) });
      await fetchApi('/policies/accept', { method: 'POST', body: JSON.stringify({ type: 'PRIVACY_POLICY', version: '1.0' }) });
      toast.success('Policies accepted');
      window.location.reload();
    } catch (e) {
      toast.error('Failed to accept policies');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 sm:p-6 animate-in fade-in zoom-in duration-300">
      <div className="bg-surface dark:bg-dark-card border border-border dark:border-dark-border rounded-3xl shadow-2xl max-w-3xl w-full flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-border dark:border-dark-border bg-surface-container-lowest dark:bg-black/20 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-[24px]">gavel</span>
            </div>
            <div>
              <h2 className="text-xl font-headline-sm font-bold tracking-tight text-on-surface dark:text-white">Legal & Privacy Agreements</h2>
              <p className="text-sm font-body-sm text-on-surface-variant dark:text-outline mt-1">
                Below are brief summaries. Please read the full policies via the provided links before proceeding.
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="p-6 sm:p-8 overflow-y-auto font-body-md text-on-surface-variant dark:text-outline leading-relaxed space-y-8 flex-1"
          style={{ scrollBehavior: 'smooth' }}
        >
          <section>
            <h3 className="text-lg font-bold text-on-surface dark:text-white mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">description</span>
                Terms of Service (Summary)
              </div>
              <Link href="/docs/legal/terms-of-service" target="_blank" className="text-sm text-primary hover:underline font-medium">Read Full Document &rarr;</Link>
            </h3>
            <div className="space-y-4 text-sm bg-surface-container-lowest dark:bg-black/10 p-5 rounded-2xl border border-border dark:border-dark-border">
              <p><strong>1. Acceptance of Terms:</strong> By accessing and using Qmova, you agree to be bound by these Terms of Service and all applicable laws and regulations.</p>
              <p><strong>2. Use License:</strong> Permission is granted to temporarily use the materials and services on Qmova for personal, non-commercial transitory viewing only.</p>
              <p><strong>3. Disclaimer:</strong> The materials on Qmova are provided on an 'as is' basis. We make no warranties, expressed or implied, and hereby disclaim and negate all other warranties including, without limitation, implied warranties or conditions of merchantability.</p>
              <p><strong>4. Limitations:</strong> In no event shall Qmova or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Qmova.</p>
              <p><strong>5. Governing Law:</strong> These terms and conditions are governed by and construed in accordance with the laws of the applicable jurisdiction.</p>
            </div>
          </section>
          
          <section>
            <h3 className="text-lg font-bold text-on-surface dark:text-white mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-500 text-[20px]">shield</span>
                Privacy Policy (Summary)
              </div>
              <Link href="/docs/legal/privacy-policy" target="_blank" className="text-sm text-primary hover:underline font-medium">Read Full Document &rarr;</Link>
            </h3>
            <div className="space-y-4 text-sm bg-surface-container-lowest dark:bg-black/10 p-5 rounded-2xl border border-border dark:border-dark-border">
              <p><strong>1. Information Collection:</strong> We collect information from you when you register on our site, place an order, subscribe to our newsletter, respond to a survey, or fill out a form.</p>
              <p><strong>2. Information Usage:</strong> Any of the information we collect from you may be used to personalize your experience, improve our website, improve customer service, process transactions, or send periodic emails.</p>
              <p><strong>3. Information Protection:</strong> We implement a variety of security measures to maintain the safety of your personal information when you enter, submit, or access your personal information.</p>
              <p><strong>4. Cookie Usage:</strong> Yes (Cookies are small files that a site or its service provider transfers to your computers hard drive through your Web browser (if you allow) that enables the sites or service providers systems to recognize your browser and capture and remember certain information).</p>
              <p><strong>5. Information Disclosure:</strong> We do not sell, trade, or otherwise transfer to outside parties your personally identifiable information. This does not include trusted third parties who assist us in operating our website, conducting our business, or servicing you, so long as those parties agree to keep this information confidential.</p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border dark:border-dark-border bg-surface-container-lowest dark:bg-black/20 shrink-0">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            
            <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
              <label className={`flex items-start sm:items-center justify-between w-full gap-4 cursor-pointer group ${!hasScrolledToBottom ? 'opacity-70' : ''}`}>
                <span className="text-sm font-medium text-on-surface dark:text-white">
                  I have read the full <Link href="/docs/legal/terms-of-service" target="_blank" className="text-primary hover:underline">Terms and Conditions</Link>, <Link href="/docs/legal/privacy-policy" target="_blank" className="text-primary hover:underline">Privacy Policy</Link>, and other legal notices.
                </span>
                <div className={`mt-0.5 sm:mt-0 w-6 h-6 shrink-0 rounded-md border-2 flex items-center justify-center transition-colors ${!hasScrolledToBottom ? 'bg-surface-container-highest/30 border-border dark:border-dark-border cursor-not-allowed' : isChecked ? 'bg-primary border-primary text-white' : 'bg-surface dark:bg-dark-canvas border-outline group-hover:border-primary'}`}>
                  {isChecked && <span className="material-symbols-outlined text-[16px] font-bold">check</span>}
                </div>
                <input 
                  type="checkbox" 
                  className="hidden" 
                  disabled={!hasScrolledToBottom || isSubmitting}
                  checked={isChecked}
                  onChange={(e) => setIsChecked(e.target.checked)}
                />
              </label>
            </div>

            <button 
              onClick={handleAccept}
              disabled={!isChecked || isSubmitting}
              className="w-full sm:w-auto px-8 h-[48px] bg-primary hover:bg-primary-container text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  Accept & Continue
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </>
              )}
            </button>

          </div>
          {!hasScrolledToBottom && (
            <p className="text-xs text-alert text-center sm:text-left mt-3 font-medium">
              * Please scroll to the bottom of the policies to enable the checkbox.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}