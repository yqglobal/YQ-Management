import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import Image from 'next/image';
const QRCode = dynamic(() => import('react-qr-code'), { ssr: false });
import { Sun, Moon, Download, Maximize2, X } from 'lucide-react';
import { toPng } from 'html-to-image';

const baseUrl = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000') : 'http://localhost:3000';

export default function StatusPage() {
  const router = useRouter();
  const { subdomain, tokens } = router.query;
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  const [localTokens, setLocalTokens] = useState<string>('');
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryPhone, setRecoveryPhone] = useState('');
  const [recoveryOtp, setRecoveryOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);
  const [expandedVisit, setExpandedVisit] = useState<AnyFixMe | null>(null);

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
    if (router.query.recover === 'true') {
      setRecoveryMode(true);
    }
  }, [router.query.recover]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDark = document.documentElement.classList.contains('dark');
      setTheme(isDark ? 'dark' : 'light');
      
      const storedTokens = JSON.parse(localStorage.getItem('qmova_active_tokens') || '[]');
      if (storedTokens.length > 0) {
        setLocalTokens(storedTokens.join(','));
      }
    }
  }, []);

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
      const res = await fetch(`${baseUrl}/tenant/by-domain/${subdomain}`);
      if (!res.ok) throw new Error('Tenant not found');
      return res.json();
    },
    enabled: !!subdomain,
  });

  const activeTokens = tokens || localTokens;
  const [visits, setVisits] = useState<AnyFixMe[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const query = activeTokens ? `?tokens=${activeTokens}` : '';
    let es: EventSource | null = null;
    let loadingTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (es) {
        es.close();
      }

      es = new EventSource(`${baseUrl}/public-visit/stream${query}`, {
        withCredentials: true, // Crucial for sending HTTP-Only cookies
      });

      es.onmessage = (event) => {
        // Ignore SSE heartbeat/ping messages sent by the backend to keep the connection alive
        if (event.data === ':heartbeat' || event.data?.startsWith(':')) return;
        try {
          const data = JSON.parse(event.data);
          setVisits(data);
          setIsLoading(false);
        } catch (err) {
          console.error('Failed to parse SSE data', err);
        }
      };

      es.onerror = () => {
        // EventSource auto-reconnects (CONNECTING state). Only fail loading indicator
        // if we haven't received any data yet (prevents flashing during normal reconnects).
        if (loadingTimer) clearTimeout(loadingTimer);
        loadingTimer = setTimeout(() => setIsLoading(false), 4000);
      };
    };

    connect();

    // Page Visibility API: when the user returns to this tab after it was backgrounded,
    // browsers may have throttled or killed the SSE connection entirely.
    // Force-reconnect to get an immediate data refresh.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        connect();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (es) es.close();
      if (loadingTimer) clearTimeout(loadingTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeTokens]);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');
    setIsRecovering(true);
    try {
      const res = await fetch(`${baseUrl}/public-visit/request-recovery-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: recoveryPhone, tenantId: tenant?.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to send OTP');
      }
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
      const res = await fetch(`${baseUrl}/public-visit/recover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Ensure cookies are sent
        body: JSON.stringify({ phone: recoveryPhone, tenantId: tenant?.id, otp: recoveryOtp }),
      });
      if (!res.ok) throw new Error('Invalid OTP');
      const data = await res.json();
      
      if (data.tokens && data.tokens.length > 0) {
        localStorage.setItem('qmova_active_tokens', JSON.stringify(data.tokens));
        setLocalTokens(data.tokens.join(','));
        setRecoveryMode(false);
        // EventSource will automatically re-run because activeTokens changes
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
          <button onClick={() => setRecoveryMode(false)} className="mb-6 flex items-center text-sm font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
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

  if (!visits.length) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center p-6 text-slate-900 dark:text-zinc-100">
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl p-8 max-w-sm w-full text-center shadow-lg">
          <div className="w-16 h-16 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-[32px] text-gray-400">confirmation_number</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight mb-2">No Tickets Found</h1>
          <p className="text-gray-500 mb-8">We couldn't find any active tickets for this link.</p>
          
          <div className="space-y-3">
            <button 
              onClick={() => router.push(`/booking`)}
              className="w-full py-4 rounded-xl font-bold text-white transition-all hover:opacity-90 shadow-md"
              style={{ backgroundColor: primaryColor }}
            >
              Go to Booking
            </button>
            <button 
              onClick={() => setRecoveryMode(true)}
              className="w-full py-4 rounded-xl font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-zinc-800 transition-colors hover:bg-gray-200 dark:hover:bg-zinc-700"
            >
              Find My Tickets
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex flex-col items-center">
      <Head>
        <title>{tenant?.name ? `${tenant.name} | Ticket Status` : 'Ticket Status'}</title>
      </Head>

      {/* Header */}
      <header className="w-full max-w-md sticky top-0 z-50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-gray-200 dark:border-zinc-800 p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <Image src={logoUrl} alt={tenant?.name} width={140} height={32} className="h-8 w-auto object-contain" priority />
          ) : !isBrandingEnabled ? (
            <>
              <Image src="/qmova-light-logo.png" alt="Qmova" width={140} height={32} className="h-8 w-auto max-w-[140px] object-contain dark:hidden" priority />
              <Image src="/qmova-dark-logo.png" alt="Qmova" width={140} height={32} className="h-8 w-auto max-w-[140px] object-contain hidden dark:block" priority />
            </>
          ) : (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: primaryColor }}>
              {tenant?.name?.substring(0, 2).toUpperCase() || 'YQ'}
            </div>
          )}
          <span className="font-bold text-lg">{tenant?.name}</span>
        </div>
        <button 
          onClick={toggleTheme} 
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-gray-500 dark:text-gray-400"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </header>

      <main className="w-full max-w-md p-4 sm:p-6 flex-1 flex flex-col items-center relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 w-full space-y-6">
          <div className="text-center mb-2">
            <h2 className="text-xl font-bold">Your Boarding Passes</h2>
            <p className="text-sm text-gray-500">Bookmark this page to track your status</p>
          </div>
          
          {visits.map((visit: AnyFixMe) => {
            const isDone = visit.currentState === 'COMPLETED' || visit.currentState === 'NO_SHOW' || visit.currentState === 'CANCELLED';
            const isServing = visit.currentState === 'SERVING';
            const isAppointment = visit.isScheduled || visit.appointmentId != null || visit.scheduledTime != null;
            
            return (
              <div key={visit.id} id={`ticket-${visit.id}`} className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full shadow-lg relative overflow-hidden border border-gray-100 dark:border-zinc-800">
                <div className="absolute top-0 left-0 right-0 h-2" style={{ backgroundColor: primaryColor }} />
                
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg">{visit.service?.name}</h3>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">{isAppointment ? 'Appointment' : 'Walk-in'}</p>
                  </div>
                  <div className="text-right">
                     <span className="uppercase tracking-widest text-[10px] font-bold text-gray-400 block">Ticket</span>
                     <div className="font-mono text-xl font-extrabold">{visit.displayId || visit.id.substring(0,6).toUpperCase()}</div>
                  </div>
                </div>

                <div className="flex justify-center mb-4 relative">
                  <div className="p-3 bg-white border border-gray-100 rounded-2xl shadow-sm relative group cursor-pointer" onClick={() => setExpandedVisit(visit)}>
                    <QRCode value={visit.id} size={100} style={{ height: "auto", maxWidth: "100%", width: "100%" }} />
                    <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Maximize2 className="text-white w-6 h-6" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-center gap-2 mb-4">
                  <button 
                    onClick={() => downloadTicket(`ticket-${visit.id}`, `Ticket-${visit.displayId || visit.id.substring(0,6)}.png`)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-sm font-bold rounded-xl transition-colors"
                  >
                    <Download className="w-4 h-4" /> Download
                  </button>
                  <button 
                    onClick={() => setExpandedVisit(visit)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-sm font-bold rounded-xl transition-colors"
                  >
                    <Maximize2 className="w-4 h-4" /> Expand
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

                {!isDone && !isServing && (
                  <div className="flex justify-between items-center bg-gray-50 dark:bg-zinc-950 p-4 rounded-xl border border-gray-100 dark:border-zinc-800">
                    {isAppointment ? (
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Scheduled For</p>
                        <p className="font-bold">{visit.scheduledTime ? new Date(visit.scheduledTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}</p>
                      </div>
                    ) : (
                      <>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Status</p>
                          <p className="font-bold capitalize">{visit.currentState.toLowerCase()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500 uppercase">Started Waiting</p>
                          <p className="font-bold">{visit.waitingStart ? new Date(visit.waitingStart).toLocaleTimeString([], { timeStyle: 'short' }) : '—'}</p>
                        </div>
                      </>
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

                {isDone && (
                  <div className="bg-gray-100 dark:bg-zinc-800 rounded-xl p-3 text-center mt-4">
                    <p className="text-gray-600 dark:text-gray-300 font-bold text-sm">Ticket {visit.currentState.toLowerCase()}</p>
                  </div>
                )}
              </div>
            );
          })}
          <button 
            onClick={() => router.push(`/booking`)}
            className="w-full py-4 rounded-xl font-bold text-primary bg-primary/10 transition-colors hover:bg-primary/20"
            style={{ color: primaryColor, backgroundColor: `${primaryColor}15` }}
          >
            Book Another Service
          </button>
        </motion.div>

        {expandedVisit && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setExpandedVisit(null)}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-zinc-900 rounded-3xl p-8 max-w-sm w-full relative shadow-2xl flex flex-col items-center text-center"
            >
              <button 
                onClick={() => setExpandedVisit(null)}
                className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-zinc-800 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h2 className="text-2xl font-bold mb-1">{expandedVisit.service?.name}</h2>
              <p className="text-gray-500 uppercase tracking-widest text-xs font-bold mb-6">
                Ticket: <span className="font-mono text-gray-900 dark:text-gray-100 text-sm ml-1">{expandedVisit.displayId || expandedVisit.id.substring(0,6).toUpperCase()}</span>
              </p>
              
              <div className="p-4 bg-white border border-gray-100 rounded-3xl shadow-sm mb-6 w-full flex justify-center">
                <QRCode value={expandedVisit.id} size={200} style={{ height: "auto", maxWidth: "100%", width: "100%" }} />
              </div>
              
              <p className="text-sm text-gray-500 mb-6">Show this QR code to the staff at {expandedVisit.location?.name || 'the service desk'}.</p>
              
              <button 
                onClick={() => downloadTicket(`ticket-${expandedVisit.id}`, `Ticket-${expandedVisit.displayId || expandedVisit.id.substring(0,6)}.png`)}
                className="w-full py-4 rounded-xl font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                style={{ backgroundColor: primaryColor }}
              >
                <Download className="w-5 h-5" /> Save Ticket to Device
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
              <Image src="/qmova-light-logo.png" alt="Qmova" width={60} height={18} className="h-[18px] w-auto object-contain dark:hidden" />
              <Image src="/qmova-dark-logo.png" alt="Qmova" width={60} height={18} className="h-[18px] w-auto object-contain hidden dark:block" />
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
