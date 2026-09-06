import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi, ApiError } from '../lib/api';
import { MessageCircle } from 'lucide-react';

export function WhatsAppStatusIndicator() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['whatsapp-status'],
    queryFn: () => fetchApi('/whatsapp/status'),
    refetchInterval: (query: AnyFixMe) => (query.state.error ? false : 10000),
    retry: false,
  });

  const isAuthError = error instanceof ApiError && (error.status === 401 || error.status === 404);
  const isConnected = data?.state === 'open' || data?.state === 'CONNECTED';

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 animate-pulse">
        <div className="w-2 h-2 rounded-full bg-gray-400"></div>
        <span className="text-xs font-medium text-gray-500 dark:text-zinc-400">Checking WhatsApp...</span>
      </div>
    );
  }

  if (isAuthError) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700" title="WhatsApp service unconfigured or authentication required">
        <div className="w-2 h-2 rounded-full bg-gray-400"></div>
        <MessageCircle className="w-3.5 h-3.5 text-gray-500 dark:text-zinc-400" />
        <span className="text-xs font-medium text-gray-500 dark:text-zinc-400">Not Configured</span>
      </div>
    );
  }

  if (error || !isConnected) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20" title="WhatsApp is disconnected! Notifications will not be sent.">
        <div className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
        </div>
        <MessageCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
        <span className="text-xs font-medium text-red-600 dark:text-red-400">Disconnected</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20" title="WhatsApp connected successfully">
      <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
      <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Connected</span>
    </div>
  );
}
