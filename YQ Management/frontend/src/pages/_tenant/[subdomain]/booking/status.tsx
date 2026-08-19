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

  const { data: visits = [], isLoading } = useQuery({
    queryKey: ['public-status', tokens],
    queryFn: async () => {
      if (!tokens) return [];
      const res = await fetch(`${baseUrl}/public-visit/status-multiple?tokens=${tokens}`);
      if (!res.ok) throw new Error('Failed to fetch status');
      return res.json();
    },
    enabled: !!tokens,
    refetchInterval: 10000, // Refresh every 10 seconds to get queue updates
  });

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

  if (!visits.length) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center p-6 text-slate-900 dark:text-zinc-100">
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-8 max-w-sm w-full text-center shadow-lg">
          <h1 className="text-xl font-bold mb-2">No Tickets Found</h1>
          <p className="text-gray-500 mb-6">We couldn't find any active tickets for this link.</p>
          <button 
            onClick={() => router.push(`/booking`)}
            className="w-full py-3 rounded-xl font-bold text-white transition-all hover:opacity-90"
            style={{ backgroundColor: primaryColor }}
          >
            Go to Booking
          </button>
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
