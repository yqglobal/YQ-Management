import { fetchApi } from "../../../../lib/api";
/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import Image from 'next/image';
const QRCode = dynamic(() => import('react-qr-code'), { ssr: false });
import { Sun, Moon, Download, Maximize2, X, CheckCircle2, Calendar, Clock, MapPin } from 'lucide-react';
import { toPng } from 'html-to-image';

const baseUrl = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000') : 'http://localhost:3000';

// Helper functions for cookie and localStorage persistence
function getCookie(name: string): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[2]) : '';
}

function setCookie(name: string, value: string, days = 7) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function getStoredTokens(subdomain?: string): string[] {
  if (typeof window === 'undefined') return [];
  const tokensSet = new Set<string>();

  // 1. General localStorage
  try {
    const raw = localStorage.getItem('qmova_active_tokens');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) parsed.forEach(t => t && tokensSet.add(String(t).trim()));
    }
  } catch {}

  // 2. Tenant-specific localStorage
  if (subdomain) {
    try {
      const rawSub = localStorage.getItem(`qmova_active_tokens_${subdomain}`);
      if (rawSub) {
        const parsed = JSON.parse(rawSub);
        if (Array.isArray(parsed)) parsed.forEach(t => t && tokensSet.add(String(t).trim()));
      }
    } catch {}
  }

  // 3. Document cookie
  try {
    const cookieVal = getCookie('qmova_session');
    if (cookieVal) {
      cookieVal.split(',').forEach(t => t && tokensSet.add(t.trim()));
    }
  } catch {}

  return Array.from(tokensSet).filter(Boolean);
}

function persistTokens(tokens: string[], subdomain?: string) {
  if (typeof window === 'undefined' || !tokens || tokens.length === 0) return;
  const cleanTokens = Array.from(new Set(tokens.map(t => String(t).trim()))).filter(Boolean);
  if (cleanTokens.length === 0) return;

  try {
    const existing = getStoredTokens(subdomain);
    const merged = Array.from(new Set([...existing, ...cleanTokens]));

    localStorage.setItem('qmova_active_tokens', JSON.stringify(merged));
    if (subdomain) {
      localStorage.setItem(`qmova_active_tokens_${subdomain}`, JSON.stringify(merged));
    }
    setCookie('qmova_session', merged.join(','), 7);
  } catch (e) {
    console.error('Failed to persist tokens:', e);
  }
}

export default function StatusPage() {
  const router = useRouter();
  const { subdomain } = router.query;
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  const [activeTokens, setActiveTokens] = useState<string>('');
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryPhone, setRecoveryPhone] = useState('');
  const [recoveryOtp, setRecoveryOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);
  const [expandedVisit, setExpandedVisit] = useState<AnyFixMe | null>(null);
  const [visits, setVisits] = useState<AnyFixMe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [nowMs] = useState(() => Date.now());

  const downloadTicket = async (elementId: string, filename: string) => {
    const el = document.getElementById(elementId);
    if (!el) return;
    try {
      const dataUrl = await toPng(el, { cacheBust: true, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to download ticket', err);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDark = document.documentElement.classList.contains('dark');
      setTheme(isDark ? 'dark' : 'light');
    }
  }, []);

  const toggleTheme = () => {
    if (typeof window !== 'undefined') {
      const isDark = document.documentElement.classList.contains('dark');
      if (isDark) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
        setTheme('light');
      } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
        setTheme('dark');
      }
    }
  };

  // Fetch Tenant logic just to get branding/colors
  const { data: tenant } = useQuery({
    queryKey: ['tenant', subdomain],
    queryFn: async () => {
      if (!subdomain) return null;
      const res = await fetch(`${baseUrl}/tenant/public/${subdomain}`);
      if (!res.ok) throw new Error('Tenant not found');
      return res.json();
    },
    enabled: !!subdomain,
  });

  // 1. Resolve tokens from URL and device storage on router ready
  useEffect(() => {
    if (!router.isReady) return;

    if (router.query.recover === 'true') {
      setRecoveryMode(true);
      setIsLoading(false);
      setIsReady(true);
      return;
    }

    // A. Query tokens from URL
    let urlTokens: string[] = [];
    if (router.query.tokens) {
      if (typeof router.query.tokens === 'string') {
        urlTokens = router.query.tokens.split(',').map(s => s.trim()).filter(Boolean);
      } else if (Array.isArray(router.query.tokens)) {
        urlTokens = router.query.tokens.map(s => String(s).trim()).filter(Boolean);
      }
    }

    // B. Stored tokens from localStorage & cookie
    const storedTokens = getStoredTokens(subdomain as string);

    // C. Combine & deduplicate
    const combined = Array.from(new Set([...urlTokens, ...storedTokens])).filter(Boolean);

    if (combined.length > 0) {
      persistTokens(combined, subdomain as string);
      const tokenStr = combined.join(',');
      setActiveTokens(tokenStr);
      setRecoveryMode(false);

      // If URL was missing ?tokens= but we have tokens stored on this device, sync URL shallowly
      if (!router.query.tokens) {
        router.replace(
          {
            pathname: router.pathname,
            query: { ...router.query, tokens: tokenStr },
          },
          undefined,
          { shallow: true }
        );
      }
    } else {
      // Truly no tokens on device or URL
      setActiveTokens('');
      setRecoveryMode(true);
      setIsLoading(false);
    }
    setIsReady(true);
  }, [router.isReady, router.query.tokens, router.query.recover, subdomain]);

  // 2. Fetch and stream visits when activeTokens are available
  useEffect(() => {
    if (!isReady || !activeTokens) return;

    setIsLoading(true);
    let es: EventSource | null = null;
    let isCancelled = false;

    // Fast initial REST fetch for immediate rendering
    fetchApi(`/public-visit/status-multiple?tokens=${activeTokens}`)
      .then((data: AnyFixMe) => {
        if (!isCancelled && Array.isArray(data)) {
          if (data.length > 0) {
            setVisits(data);
            setIsLoading(false);
            setRecoveryMode(false);
          } else {
            setIsLoading(false);
            setRecoveryMode(true);
          }
        }
      })
      .catch((err) => {
        console.warn('Initial status-multiple fetch failed, SSE will stream:', err);
      });

    // Real-time SSE stream
    const connect = () => {
      if (es) {
        es.close();
      }

      es = new EventSource(`${baseUrl}/public-visit/stream?tokens=${activeTokens}`, {
        withCredentials: true,
      });

      es.onmessage = (event) => {
        if (event.data === ':heartbeat' || event.data?.startsWith(':')) return;
        try {
          const data = JSON.parse(event.data);
          if (Array.isArray(data)) {
            setVisits(data);
            setIsLoading(false);
            if (data.length > 0) {
              setRecoveryMode(false);
            }
          }
        } catch (err) {
          console.error('Failed to parse SSE data', err);
        }
      };

      es.onerror = () => {
        // SSE auto-reconnects
      };
    };

    connect();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        connect();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isCancelled = true;
      if (es) es.close();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeTokens, isReady]);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');
    setIsRecovering(true);
    try {
      await fetchApi(`/public-visit/request-recovery-otp`, {
        method: 'POST',
        body: JSON.stringify({ phone: recoveryPhone, tenantId: tenant?.id }),
      });
      setOtpSent(true);
    } catch (err: AnyFixMe) {
      setRecoveryError(err.message);
    } finally {
      setIsRecovering(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');
    setIsRecovering(true);
    try {
      const data = await fetchApi(`/public-visit/recover`, {
        method: 'POST',
        body: JSON.stringify({ phone: recoveryPhone, tenantId: tenant?.id, otp: recoveryOtp }),
      });
      
      if (data.tokens && data.tokens.length > 0) {
        persistTokens(data.tokens, subdomain as string);
        const tokenStr = data.tokens.join(',');
        setActiveTokens(tokenStr);
        setRecoveryMode(false);
        router.replace(
          {
            pathname: router.pathname,
            query: { ...router.query, tokens: tokenStr },
          },
          undefined,
          { shallow: true }
        );
      } else {
        setRecoveryError('No active tickets found for this number.');
      }
    } catch (err: AnyFixMe) {
      setRecoveryError(err.message);
    } finally {
      setIsRecovering(false);
    }
  };

  const isBrandingEnabled = tenant?.planFeatures?.customBranding !== false && tenant?.branding?.enabled !== false;
  const primaryColor = isBrandingEnabled ? (tenant?.branding?.primaryColor || '#4f46e5') : '#4f46e5';
  const logoUrl = isBrandingEnabled ? tenant?.branding?.logoUrl : null;
  const supportNumber = tenant?.customerCareNumber || tenant?.phone;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 rounded-full border-4 border-gray-200 dark:border-zinc-800 border-t-indigo-500 animate-spin" />
      </div>
    );
  }

  if (recoveryMode) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col items-center p-6 text-slate-900 dark:text-zinc-100">
        <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl p-8 shadow-xl mt-12">
          <button onClick={() => {
            if (visits.length === 0) {
              router.push('/booking');
            } else {
              setRecoveryMode(false);
            }
          }} className="mb-6 flex items-center text-sm font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[18px] mr-1">arrow_back</span>
            Back
          </button>
          
          <div className="text-center mb-8">
            <h1 className="text-2xl font-extrabold tracking-tight mb-2">Find My Tickets</h1>
            <p className="text-gray-500 dark:text-gray-400">Enter your phone number to recover access to your tickets</p>
          </div>

          {!otpSent ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300 uppercase tracking-wider">Phone Number <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold material-symbols-outlined">call</span>
                  <input 
                    type="tel" required placeholder="+1234567890" value={recoveryPhone} onChange={e => setRecoveryPhone(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 focus:border-primary focus:bg-white dark:focus:bg-zinc-900 transition-all font-bold"
                  />
                </div>
              </div>
              {recoveryError && <p className="text-red-500 text-sm font-medium bg-red-50 dark:bg-red-950/30 p-3 rounded-lg">{recoveryError}</p>}
              <button type="submit" disabled={isRecovering} className="w-full py-4 rounded-xl font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50" style={{ backgroundColor: primaryColor }}>
                {isRecovering ? 'Sending OTP...' : 'Send OTP via WhatsApp'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300 uppercase tracking-wider">OTP Code <span className="text-red-500">*</span></label>
                <input 
                  type="text" required placeholder="Enter 6-digit code" value={recoveryOtp} onChange={e => setRecoveryOtp(e.target.value)}
                  className="w-full px-4 py-4 rounded-xl border-2 border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 focus:border-primary focus:bg-white dark:focus:bg-zinc-900 transition-all font-bold tracking-widest text-center text-xl"
                />
              </div>
              {recoveryError && <p className="text-red-500 text-sm font-medium bg-red-50 dark:bg-red-950/30 p-3 rounded-lg">{recoveryError}</p>}
              <button type="submit" disabled={isRecovering} className="w-full py-4 rounded-xl font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50" style={{ backgroundColor: primaryColor }}>
                {isRecovering ? 'Verifying...' : 'Verify OTP'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }



  return (
    <div className="min-h-[100dvh] bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex flex-col items-center pt-[max(env(safe-area-inset-top),0rem)] pb-[max(env(safe-area-inset-bottom),1.5rem)]">
      <Head>
        <title>{tenant?.name ? `${tenant.name} | Ticket Status` : 'Ticket Status'}</title>
      </Head>

      {/* Header */}
      <header className="w-full max-w-md sticky top-0 z-50 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md border-b border-gray-200/80 dark:border-zinc-800/80 px-3.5 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          {logoUrl ? (
            <div className="flex items-center shrink-0">
              <Image src={logoUrl} alt={tenant?.name} width={72} height={18} className="h-[18px] sm:h-5 max-w-[90px] w-auto object-contain" priority />
            </div>
          ) : !isBrandingEnabled ? (
            <div className="flex items-center shrink-0">
              <Image src="/qmova-light-logo.webp" alt="Qmova" width={72} height={16} className="h-4 sm:h-[18px] w-auto object-contain dark:hidden" priority />
              <Image src="/qmova-dark-logo.webp" alt="Qmova" width={72} height={16} className="h-4 sm:h-[18px] w-auto object-contain hidden dark:block" priority />
            </div>
          ) : (
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0 tracking-wider" style={{ backgroundColor: primaryColor }}>
              {tenant?.name?.substring(0, 2).toUpperCase() || 'YQ'}
            </div>
          )}

          {/* Subtle elegant divider */}
          <span className="h-3.5 w-px bg-gray-200 dark:bg-zinc-700/80 shrink-0" aria-hidden="true" />

          {/* Tenant Name */}
          <h1 className="font-semibold text-xs sm:text-base tracking-tight text-gray-900 dark:text-zinc-100 truncate max-w-[140px] xs:max-w-[200px] sm:max-w-none">
            {tenant?.name}
          </h1>
        </div>
        <button 
          onClick={toggleTheme} 
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800/80 transition-colors text-gray-500 dark:text-gray-400 shrink-0 ml-2 active:scale-95"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </header>

      <main className="w-full max-w-md p-3.5 xs:p-4 sm:p-6 flex-1 flex flex-col items-center relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 w-full space-y-5 sm:space-y-6">
          <div className="text-center mb-1 sm:mb-2">
            <h2 className="text-lg sm:text-xl font-bold">Your Boarding Passes</h2>
            <p className="text-xs sm:text-sm text-gray-500">Bookmark this page to track your status</p>
          </div>
          
          {(() => {
            const pastVisits = visits.filter(v => ['COMPLETED', 'NO_SHOW', 'CANCELLED'].includes(v.currentState));
            const currentVisits = visits.filter(v => !['COMPLETED', 'NO_SHOW', 'CANCELLED'].includes(v.currentState));
            
            // Sort current visits: SERVING > WAITING/CHECKED_IN > Upcoming Appointments
            currentVisits.sort((a, b) => {
              const getPriority = (v: AnyFixMe) => {
                if (v.currentState === 'SERVING') return 1;
                if (v.currentState === 'WAITING' || v.currentState === 'CHECKED_IN') return 2;
                if (v.scheduledTime) return 3;
                return 4;
              };
              const pA = getPriority(a);
              const pB = getPriority(b);
              
              if (pA !== pB) return pA - pB;
              if (pA === 3 && a.scheduledTime && b.scheduledTime) {
                return new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime();
              }
              return 0;
            });

            const renderVisitCard = (visit: AnyFixMe, isPast: boolean) => {
              const isDone = isPast;
              const isServing = visit.currentState === 'SERVING';
              const isAppointment = visit.isScheduled || visit.appointmentId != null || visit.scheduledTime != null;
              
              // Determine if booking is "soon" (within 2 hours)
              const isSoon = isAppointment && visit.scheduledTime && !isDone && !isServing && 
                (new Date(visit.scheduledTime).getTime() - nowMs < 2 * 60 * 60 * 1000) &&
                (new Date(visit.scheduledTime).getTime() - nowMs > 0);

              const bookingDate = visit.scheduledTime
                ? new Date(visit.scheduledTime)
                : visit.waitingStart
                  ? new Date(visit.waitingStart)
                  : visit.createdAt
                    ? new Date(visit.createdAt)
                    : null;

              const bookingDateStr = bookingDate
                ? bookingDate.toLocaleDateString([], {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : null;

              const bookingTimeStr = bookingDate
                ? bookingDate.toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })
                : null;

              const completedDate = visit.completedAt ? new Date(visit.completedAt) : null;
              const completedTimeStr = completedDate
                ? completedDate.toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })
                : null;

              return (
                <div key={visit.id} id={`ticket-${visit.id}`} className={`bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 w-full shadow-lg relative overflow-hidden border ${isDone ? 'border-gray-200 dark:border-zinc-800 opacity-90' : 'border-gray-100 dark:border-zinc-800'}`}>
                  {!isDone && <div className="absolute top-0 left-0 right-0 h-1.5 sm:h-2" style={{ backgroundColor: primaryColor }} />}
                  
                  <div className="flex justify-between items-start mb-3.5 sm:mb-4">
                    <div className="flex-1 min-w-0 pr-2 sm:pr-3">
                      <h3 className="font-bold text-base sm:text-lg leading-snug truncate">{visit.service?.name}</h3>
                      <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-gray-500 mt-1">
                        <span className="uppercase tracking-wider font-semibold">{isAppointment ? 'Appointment' : 'Walk-in'}</span>
                        {bookingDateStr && <span>•</span>}
                        {bookingDateStr && (
                          <span className="flex items-center gap-1 font-medium text-gray-700 dark:text-gray-300">
                            <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            {bookingDateStr} at {bookingTimeStr}
                          </span>
                        )}
                        {visit.location?.name && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1 font-medium text-gray-500 truncate max-w-full">
                              <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                              <span className="truncate">{visit.location.name}</span>
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 mt-1.5">
                        {isSoon && (
                          <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400">
                            Happening Soon
                          </span>
                        )}
                        {isServing && (
                          <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                            Happening Now
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                       <span className="uppercase tracking-widest text-[9px] sm:text-[10px] font-bold text-gray-400 block">Ticket</span>
                       <div className="font-mono text-lg sm:text-xl font-extrabold">{visit.displayId || visit.id.substring(0,6).toUpperCase()}</div>
                    </div>
                  </div>

                  <div className="flex justify-center mb-3.5 sm:mb-4 relative">
                    {['COMPLETED'].includes(visit.currentState) ? (
                      <div className="flex flex-col items-center justify-center p-4 sm:p-6 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-500/20 rounded-xl sm:rounded-2xl w-full text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 strokeWidth={1.5} className="w-12 h-12 sm:w-16 sm:h-16 mb-2" />
                        <span className="font-bold text-base sm:text-lg">Service Completed</span>
                        <span className="text-xs sm:text-sm opacity-80 mt-0.5 text-center font-medium">Thank you for visiting</span>
                      </div>
                    ) : (
                      <div className="p-2.5 sm:p-3 bg-white border border-gray-100 rounded-xl sm:rounded-2xl shadow-sm relative group cursor-pointer" onClick={() => setExpandedVisit(visit)}>
                        <QRCode value={visit.id} size={100} style={{ height: "auto", maxWidth: "100%", width: "100%" }} />
                        <div className="absolute inset-0 bg-black/40 rounded-xl sm:rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Maximize2 className="text-white w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-center gap-1.5 sm:gap-2 mb-3.5 sm:mb-4">
                    <button 
                      onClick={() => downloadTicket(`ticket-${visit.id}`, `Ticket-${visit.displayId || visit.id.substring(0,6)}.png`)}
                      className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs sm:text-sm font-bold rounded-xl transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                      <span>Download</span>
                    </button>
                    <button 
                      onClick={() => setExpandedVisit(visit)}
                      className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs sm:text-sm font-bold rounded-xl transition-colors"
                    >
                      <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                      <span>Expand</span>
                    </button>
                  </div>

                  {isServing && (
                    <div className="bg-amber-100 dark:bg-amber-900/40 border border-amber-500 rounded-xl p-3 text-center mb-4 animate-pulse">
                      <p className="text-amber-700 dark:text-amber-400 font-bold text-sm">Please proceed to {visit.location?.name || 'the service desk'}</p>
                    </div>
                  )}
                  
                  {visit.queue?.status === 'PAUSED' && !isDone && !isServing && (
                    <div className="bg-orange-100 dark:bg-orange-900/40 border border-orange-500 rounded-xl p-3 text-center mb-4 animate-pulse">
                      <p className="text-orange-700 dark:text-orange-400 font-bold text-sm">Service temporarily paused. Operator is on a short break.</p>
                    </div>
                  )}

                  {!isServing && (
                    <div className="bg-gray-50 dark:bg-zinc-950 p-4 rounded-xl border border-gray-100 dark:border-zinc-800 space-y-2.5">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Status</p>
                          <p className={`font-bold capitalize ${isDone ? 'text-emerald-600 dark:text-emerald-400' : 'text-primary'}`}>
                            {visit.currentState.replace('_', ' ').toLowerCase()}
                          </p>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                            {isAppointment ? 'Scheduled For' : isDone ? 'Booking / Joined' : 'Started Waiting'}
                          </p>
                          <p className="font-bold text-sm text-gray-900 dark:text-gray-100">
                            {bookingDateStr ? `${bookingDateStr} • ${bookingTimeStr}` : '—'}
                          </p>
                        </div>
                      </div>

                      {isDone && completedTimeStr && (
                        <div className="pt-2 border-t border-gray-200/60 dark:border-zinc-800/80 flex justify-between items-center text-xs">
                          <span className="text-gray-500 font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3 text-gray-400" />
                            Completed At:
                          </span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {completedDate?.toLocaleDateString([], { month: 'short', day: 'numeric' }) === bookingDate?.toLocaleDateString([], { month: 'short', day: 'numeric' })
                              ? `Today at ${completedTimeStr}`
                              : `${completedDate?.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${completedTimeStr}`}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {!isDone && !isServing && !isAppointment && visit.position > 0 && (
                    <div className="flex justify-between items-center bg-gray-50 dark:bg-zinc-950 p-4 rounded-xl border border-gray-100 dark:border-zinc-800 mt-2">
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Live Position</p>
                        <p className="font-bold text-lg" style={{ color: primaryColor }}>#{visit.position}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 uppercase">Est. Wait</p>
                        <p className="font-bold">{visit.estimatedWaitTime} min</p>
                      </div>
                    </div>
                  )}

                  {/* Payment, Tax and Total Breakdown */}
                  {(() => {
                    const currency = (visit.service?.priceCurrency || visit.service?.currency || 'ZAR').toUpperCase();
                    const currSymbol = currency === 'ZAR' ? 'R' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
                    const basePriceCents = Number(visit.service?.basePrice || 0);
                    const guestsCount = 1 + (visit.accompanyingGuests || 0);

                    const invoice = visit.visitInvoice;
                    const succeededPayment = visit.bookingPayments?.find((p: AnyFixMe) => p.status === 'SUCCEEDED');
                    const isPaid = !!succeededPayment || invoice?.status === 'PAID';

                    const defaultTaxRate = currency === 'ZAR' ? 15 : currency === 'GBP' ? 20 : currency === 'EUR' ? 20 : currency === 'INR' ? 18 : 0;
                    const taxRate = tenant?.taxConfig?.defaultTaxRatePercent !== undefined ? Number(tenant.taxConfig.defaultTaxRatePercent) : defaultTaxRate;
                    const isTaxInclusive = tenant?.taxConfig?.taxInclusive !== undefined ? Boolean(tenant.taxConfig.taxInclusive) : (currency === 'ZAR');

                    const rawSubtotalCents = basePriceCents * guestsCount;
                    if (rawSubtotalCents <= 0 && !succeededPayment && !invoice) return null;

                    let netSubtotalCents = rawSubtotalCents;
                    let taxCents = 0;
                    let totalCents = rawSubtotalCents;

                    if (invoice) {
                      totalCents = invoice.total ?? rawSubtotalCents;
                      taxCents = invoice.totalTax ?? 0;
                      netSubtotalCents = invoice.subtotal ?? (totalCents - taxCents);
                    } else if (succeededPayment) {
                      totalCents = succeededPayment.amount ?? rawSubtotalCents;
                      if (taxRate > 0) {
                        if (isTaxInclusive) {
                          netSubtotalCents = Math.round(totalCents / (1 + taxRate / 100));
                          taxCents = totalCents - netSubtotalCents;
                        } else {
                          taxCents = Math.round(totalCents * (taxRate / 100));
                        }
                      }
                    } else if (taxRate > 0) {
                      if (isTaxInclusive) {
                        netSubtotalCents = Math.round(rawSubtotalCents / (1 + taxRate / 100));
                        taxCents = rawSubtotalCents - netSubtotalCents;
                        totalCents = rawSubtotalCents;
                      } else {
                        taxCents = Math.round(rawSubtotalCents * (taxRate / 100));
                        totalCents = rawSubtotalCents + taxCents;
                      }
                    }

                    const taxLabel = currency === 'ZAR'
                      ? `VAT (${taxRate}%${isTaxInclusive ? ' Included' : ''})`
                      : currency === 'INR'
                      ? `GST (${taxRate}%${isTaxInclusive ? ' Included' : ''})`
                      : `Tax (${taxRate}%${isTaxInclusive ? ' Included' : ''})`;

                    return (
                      <div className="bg-gray-50 dark:bg-zinc-950 p-4 rounded-xl border border-gray-100 dark:border-zinc-800 mt-2.5 space-y-2">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-200/60 dark:border-zinc-800/60">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Payment & Taxes</span>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            isPaid
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          }`}>
                            {isPaid ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" /> Paid Online
                              </>
                            ) : (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Pay at Counter
                              </>
                            )}
                          </span>
                        </div>

                        <div className="space-y-1 text-xs text-gray-600 dark:text-zinc-400">
                          <div className="flex justify-between">
                            <span>Service Base ({guestsCount} {guestsCount === 1 ? 'person' : 'guests'})</span>
                            <span className="font-medium text-gray-900 dark:text-zinc-200 font-mono">
                              {currSymbol}{(netSubtotalCents / 100).toFixed(2)}
                            </span>
                          </div>
                          {taxRate > 0 && (
                            <div className="flex justify-between">
                              <span>{taxLabel}</span>
                              <span className="font-medium text-gray-900 dark:text-zinc-200 font-mono">
                                {currSymbol}{(taxCents / 100).toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t border-gray-200/80 dark:border-zinc-800/80 flex justify-between items-baseline">
                          <span className="text-xs font-bold uppercase text-gray-900 dark:text-white">Total Amount</span>
                          <span className="text-lg font-black text-gray-900 dark:text-white font-mono">
                            {currSymbol}{(totalCents / 100).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {!isDone && visit.accessToken && (
                    <a
                      href={`/customer/status/${visit.accessToken}`}
                      className="mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-bold text-sm text-white transition-all hover:opacity-90 active:scale-[0.98] shadow-lg"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <span className="material-symbols-outlined text-[18px]">route</span>
                      Track Full Journey
                      <span className="text-white/70 text-xs font-normal">→</span>
                    </a>
                  )}
                </div>
              );
            };

            return (
              <>
                <div className="flex flex-col gap-6 w-full">
                  {currentVisits.map(v => renderVisitCard(v, false))}
                </div>

                {pastVisits.length > 0 && (
                  <div className="w-full mt-8">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="h-px bg-gray-200 dark:bg-zinc-800 flex-1"></div>
                      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Past Tickets</h3>
                      <div className="h-px bg-gray-200 dark:bg-zinc-800 flex-1"></div>
                    </div>
                    <div className="flex flex-col gap-6 w-full">
                      {pastVisits.map(v => renderVisitCard(v, true))}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
          <button 
            onClick={() => router.push(`/booking`)}
            className="w-full py-4 rounded-xl font-bold text-primary bg-primary/10 transition-colors hover:bg-primary/20"
            style={{ color: primaryColor, backgroundColor: `${primaryColor}15` }}
          >
            Book Another Service
          </button>
          
          <button 
            onClick={() => setRecoveryMode(true)}
            className="w-full py-4 rounded-xl font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-zinc-800 transition-colors hover:bg-gray-200 dark:hover:bg-zinc-700 mt-3"
          >
            Search tickets for another number
          </button>
        </motion.div>

        {expandedVisit && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 xs:p-4 sm:p-6" onClick={() => setExpandedVisit(null)}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl p-4 sm:p-8 max-w-sm w-full max-h-[92dvh] overflow-y-auto relative shadow-2xl flex flex-col items-center text-center"
            >
              <button 
                onClick={() => setExpandedVisit(null)}
                className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 p-1.5 sm:p-2 bg-gray-100 dark:bg-zinc-800 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              
              <h2 className="text-xl sm:text-2xl font-bold mb-1 truncate max-w-[240px]">{expandedVisit.service?.name}</h2>
              <p className="text-gray-500 uppercase tracking-widest text-[11px] sm:text-xs font-bold mb-2">
                Ticket: <span className="font-mono text-gray-900 dark:text-gray-100 text-xs sm:text-sm ml-1">{expandedVisit.displayId || expandedVisit.id.substring(0,6).toUpperCase()}</span>
              </p>
              {(() => {
                const expDate = expandedVisit.scheduledTime
                  ? new Date(expandedVisit.scheduledTime)
                  : expandedVisit.waitingStart
                    ? new Date(expandedVisit.waitingStart)
                    : expandedVisit.createdAt
                      ? new Date(expandedVisit.createdAt)
                      : null;
                if (!expDate) return null;
                return (
                  <div className="flex items-center justify-center gap-1.5 text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium mb-4 sm:mb-5 bg-gray-50 dark:bg-zinc-800/60 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border border-gray-100 dark:border-zinc-800">
                    <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="truncate">
                      {expDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} at {expDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                    </span>
                  </div>
                );
              })()}
              
              <div className="p-3 sm:p-4 bg-white border border-gray-100 rounded-2xl sm:rounded-3xl shadow-sm mb-4 sm:mb-6 w-full flex justify-center">
                {['COMPLETED'].includes(expandedVisit.currentState) ? (
                  <div className="flex flex-col items-center justify-center p-4 sm:p-6 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-500/20 rounded-xl sm:rounded-2xl w-full text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 strokeWidth={1.5} className="w-16 h-16 sm:w-24 sm:h-24 mb-3 sm:mb-4" />
                    <span className="font-bold text-xl sm:text-2xl text-center">Service Completed</span>
                  </div>
                ) : (
                  <div className="max-w-[160px] sm:max-w-[200px] w-full aspect-square flex items-center justify-center">
                    <QRCode value={expandedVisit.id} size={160} style={{ height: "auto", maxWidth: "100%", width: "100%" }} />
                  </div>
                )}
              </div>
              
              <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6">Show this QR code to the staff at {expandedVisit.location?.name || 'the service desk'}.</p>
              
              <button 
                onClick={() => downloadTicket(`ticket-${expandedVisit.id}`, `Ticket-${expandedVisit.displayId || expandedVisit.id.substring(0,6)}.png`)}
                className="w-full py-3 sm:py-4 rounded-xl font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 text-xs sm:text-sm"
                style={{ backgroundColor: primaryColor }}
              >
                <Download className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span>Save Ticket to Device</span>
              </button>
            </motion.div>
          </div>
        )}

        {/* Support Number Banner */}
        {supportNumber && (
          <div className="mt-auto pt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            Need help? Contact us: <br/>
            <a href={`tel:${supportNumber}`} className="font-bold hover:underline" style={{ color: primaryColor }}>
              {supportNumber}
            </a>
          </div>
        )}

        {/* Branding Fallback (Powered by Qmova) */}
        {!isBrandingEnabled && (
          <div className="mt-8 pb-4 text-center">
            <a href="https://qmova.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              <span>Powered by</span>
              <Image src="/qmova-light-logo.webp" alt="Qmova" width={60} height={18} className="h-[18px] w-auto object-contain dark:hidden" />
              <Image src="/qmova-dark-logo.webp" alt="Qmova" width={60} height={18} className="h-[18px] w-auto object-contain hidden dark:block" />
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
