import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../../../../lib/api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function GoogleBusinessSettings() {
  const [isConnecting, setIsConnecting] = useState(false);

  const { data: tenant } = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: () => fetchApi('/tenant/me'),
  });

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      if (!tenant?.id) return;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      window.location.href = `${apiUrl}/integrations/google/connect?tenantId=${tenant.id}`;
    } catch (error) {
      toast.error('Failed to initiate Google connection.');
      setIsConnecting(false);
    }
  };

  const isConnected = !!tenant?.googleBusinessConnected;

  return (
    <div className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-2xl p-6 sm:p-8 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">

        {/* Left Side: Info */}
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
            {/* Google "G" SVG Icon */}
            <svg viewBox="0 0 24 24" className="w-6 h-6" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
          </div>
          <div>
            <h2 className="font-headline-md text-headline-md text-on-surface dark:text-white tracking-tight font-semibold mb-1 flex items-center gap-2">
              Google Business Profile
              {isConnected && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium dark:bg-emerald-500/10 dark:text-emerald-400">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Connected
                </span>
              )}
            </h2>
            <p className="font-body-md text-on-surface-variant dark:text-zinc-400 max-w-xl">
              Connect your Google Business Profile to automatically add your Qmova booking link
              to your Google Maps and Search listing. Rank higher and let customers book directly from Google.
            </p>
          </div>
        </div>

        {/* Right Side: Action */}
        <div className="shrink-0 flex flex-col items-start sm:items-end gap-3">
          {isConnected ? (
            <button
              onClick={() => toast.info('Manage Google settings feature coming soon.')}
              className="flex items-center gap-2 px-5 py-2.5 bg-zinc-100 text-zinc-700 border border-zinc-200 hover:bg-zinc-200 rounded-xl font-semibold transition-all dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Manage Connection
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={isConnecting || !tenant?.id}
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-800 border border-gray-300 hover:bg-gray-50 rounded-xl font-semibold transition-all shadow-sm disabled:opacity-50"
            >
              {isConnecting ? (
                <Loader2 strokeWidth={1.5} className="w-5 h-5 animate-spin text-gray-500" />
              ) : (
                <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              {isConnecting ? 'Connecting...' : 'Connect Google'}
            </button>
          )}
        </div>
      </div>

      {/* Features List */}
      <div className="mt-6 pt-6 border-t border-border dark:border-dark-border grid sm:grid-cols-2 gap-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h4 className="font-semibold text-sm text-on-surface dark:text-white">Auto-add Appointments Link</h4>
            <p className="text-xs text-on-surface-variant dark:text-zinc-400 mt-1">Your Qmova booking link will be added to your Google Profile automatically.</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h4 className="font-semibold text-sm text-on-surface dark:text-white">Boost Local SEO</h4>
            <p className="text-xs text-on-surface-variant dark:text-zinc-400 mt-1">Drive more traffic directly from people searching for services in your area.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
