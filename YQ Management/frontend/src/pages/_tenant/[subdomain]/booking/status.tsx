import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'react-qr-code';
import { Sun, Moon } from 'lucide-react';

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
  const [visits, setVisits] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Determine the query string for SSE, can be empty if relying purely on cookies
    const query = activeTokens ? `?tokens=${activeTokens}` : '';
    
    // We only connect if we have some token source (URL, LocalStorage, or assumed Cookie)
    // Actually, if it's purely cookie-based, activeTokens might be empty on first load.
    // That's fine, we will still try to connect and if the cookie exists, backend will find it.
    
    const es = new EventSource(`${baseUrl}/public-visit/stream${query}`, {
      withCredentials: true, // Crucial for sending HTTP-Only cookies
    });

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setVisits(data);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to parse SSE data', err);
      }
    };

    es.onerror = (err) => {
      console.error('SSE Error:', err);
      // Let EventSource handle auto-reconnects, but if we're still loading, fail gracefully after a delay
      setTimeout(() => setIsLoading(false), 3000); 
    };

    return () => {
      es.close();
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
    } catch (err: any) {
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
    } catch (err: any) {
      setRecoveryError(err.message);
    } finally {
      setIsRecovering(false);
    }
  };

  const primaryColor = tenant?.branding?.primaryColor || '#4f46e5';
  const logoUrl = tenant?.branding?.logoUrl;
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
            <img src={logoUrl} alt={tenant?.name} className="h-8 object-contain" />
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
          
          {visits.map((visit: any) => {
            const isDone = visit.currentState === 'COMPLETED' || visit.currentState === 'NO_SHOW' || visit.currentState === 'CANCELLED';
            const isServing = visit.currentState === 'SERVING';
            const isAppointment = visit.appointmentId != null || visit.scheduledTime != null;
            
            return (
              <div key={visit.id} className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full shadow-lg relative overflow-hidden border border-gray-100 dark:border-zinc-800">
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

                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-white border border-gray-100 rounded-2xl shadow-sm">
                    <QRCode value={visit.id} size={100} style={{ height: "auto", maxWidth: "100%", width: "100%" }} />
                  </div>
                </div>

                {isServing && (
                  <div className="bg-amber-100 dark:bg-amber-900/40 border border-amber-500 rounded-xl p-3 text-center mb-4 animate-pulse">
                    <p className="text-amber-700 dark:text-amber-400 font-bold text-sm">Please proceed to {visit.location?.name || 'the service desk'}</p>
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
        {!tenant?.branding && (
          <div className="mt-8 pb-4 text-center">
            <a href="https://qmova.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              <span>Powered by</span>
              <span className="font-bold text-gray-900 dark:text-white text-sm">Qmova</span>
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
