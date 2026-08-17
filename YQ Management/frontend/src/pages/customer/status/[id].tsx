import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { fetchApi, getBackendUrl } from '../../../lib/api';
import { io } from 'socket.io-client';
import { Clock, Users, ArrowRight, XCircle, CheckCircle2 } from 'lucide-react';

export default function CustomerLiveStatus() {
  const router = useRouter();
  const { id: tokenId } = router.query;
  const [liveData, setLiveData] = useState<any>(null);

  const { data: initialData, isLoading, error } = useQuery({
    queryKey: ['token-status', tokenId],
    queryFn: () => fetchApi(`/token/${tokenId}/status`),
    enabled: !!tokenId,
    retry: false,
  });

  useEffect(() => {
    if (initialData && !liveData) {
      setLiveData(initialData);
    }
  }, [initialData]);

  useEffect(() => {
    if (!tokenId) return;

    const baseUrl = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || getBackendUrl()) : getBackendUrl();
    const socket = io(baseUrl);

    const refreshStatus = () => {
      fetchApi(`/token/${tokenId}/status`)
        .then(data => setLiveData(data))
        .catch(console.error);
    };

    socket.on('queue_status_changed', refreshStatus);
    socket.on('token_serving', refreshStatus);
    socket.on('token_completed', refreshStatus);
    socket.on('token_missed', refreshStatus);

    // Initial check just in case
    refreshStatus();

    return () => {
      socket.disconnect();
    };
  }, [tokenId]);

  if (isLoading || !liveData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-gray-900 dark:text-white">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 font-medium text-gray-500">Loading your status...</p>
      </div>
    );
  }

  if (error && !liveData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex items-center justify-center p-6 text-gray-900 dark:text-white">
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-xl max-w-sm w-full text-center border border-gray-100 dark:border-zinc-800">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Token Not Found</h1>
          <p className="text-gray-500 text-sm">The token you are looking for does not exist or has expired.</p>
        </div>
      </div>
    );
  }

  const { token, position, estimatedWaitTime } = liveData;
  const isAppointment = token.isAppointment;
  const isDone = token.status === 'COMPLETED' || token.status === 'MISSED';
  const isServing = token.status === 'SERVING';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-white font-sans selection:bg-indigo-500/30">
      <Head>
        <title>Live Status | {token.customerName}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <main className="max-w-md mx-auto min-h-screen flex flex-col bg-white dark:bg-zinc-900 shadow-2xl relative overflow-hidden">
        
        {/* Header decoration */}
        <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-indigo-500/20 to-transparent dark:from-indigo-500/10 pointer-events-none" />

        <div className="p-6 pt-12 flex-1 flex flex-col z-10">
          <div className="text-center mb-10 animate-in slide-in-from-top-4 duration-500">
            <h1 className="text-2xl font-bold mb-1">Hello, {token.customerName}</h1>
            <p className="text-gray-500 dark:text-zinc-400">Here is your live queue status.</p>
          </div>

          <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none mb-8 animate-in zoom-in-95 duration-500 delay-100">
            
            <div className="flex justify-between items-start mb-8">
              <div>
                <div className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Ticket Number</div>
                <div className="text-4xl font-black font-mono tracking-tight text-indigo-600 dark:text-indigo-400">
                  {token.displayId || token.id.substring(0,8).toUpperCase()}
                </div>
              </div>
              <div className="text-right">
                <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  {isAppointment ? 'Appointment' : 'Walk-in'}
                </div>
              </div>
            </div>

            {isServing ? (
              <div className="bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-500 rounded-2xl p-6 text-center animate-pulse">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <h2 className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mb-1">It's your turn!</h2>
                <p className="text-emerald-600 dark:text-emerald-500 font-medium">Please proceed to the service desk.</p>
              </div>
            ) : isDone && token.status !== 'REJECTED' ? (
              <div className="bg-gray-100 dark:bg-zinc-800 rounded-2xl p-6 text-center">
                <h2 className="text-xl font-bold mb-1">Visit Ended</h2>
                <p className="text-gray-500 dark:text-zinc-400 text-sm">Your visit has been marked as {token.status.toLowerCase()}.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {isAppointment ? (
                  <div className="col-span-2 space-y-4">
                    <div className="bg-gray-50 dark:bg-zinc-900 rounded-2xl p-5 border border-gray-100 dark:border-zinc-800">
                      <div className="flex items-center gap-3 mb-2">
                        <Clock className="w-5 h-5 text-gray-400" />
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Scheduled For</div>
                      </div>
                      <div className="text-2xl font-bold">
                        {token.scheduledFor ? new Date(token.scheduledFor).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                      </div>
                      {token.status === 'PENDING_APPROVAL' && (
                        <p className="text-sm text-amber-500 mt-3 font-medium bg-amber-50 dark:bg-amber-500/10 p-2 rounded-lg border border-amber-200 dark:border-amber-900/50 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                          Waiting for staff approval
                        </p>
                      )}
                      {token.status === 'REJECTED' && (
                        <p className="text-sm text-red-500 mt-3 font-medium bg-red-50 dark:bg-red-500/10 p-2 rounded-lg border border-red-200 dark:border-red-900/50 flex items-center gap-2">
                          <XCircle className="w-4 h-4" />
                          Appointment Declined
                        </p>
                      )}
                      {(token.status === 'SCHEDULED' || token.status === 'CONFIRMED') && !token.checkedIn && (
                        <p className="text-sm text-emerald-500 mt-3 font-medium bg-emerald-50 dark:bg-emerald-500/10 p-2 rounded-lg border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          Approved. Please arrive 5 mins early
                        </p>
                      )}
                      {token.checkedIn && (
                        <p className="text-sm text-emerald-500 mt-3 font-medium bg-emerald-50 dark:bg-emerald-500/10 p-2 rounded-lg border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          Checked In
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="bg-gray-50 dark:bg-zinc-900 rounded-2xl p-5 border border-gray-100 dark:border-zinc-800 flex flex-col justify-center">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-indigo-500" />
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Position</div>
                      </div>
                      <div className="text-4xl font-bold">{position || '—'}</div>
                      <div className="text-xs text-gray-400 mt-1">in line ahead of you</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-zinc-900 rounded-2xl p-5 border border-gray-100 dark:border-zinc-800 flex flex-col justify-center">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-emerald-500" />
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Est. Wait</div>
                      </div>
                      <div className="text-3xl font-bold">~{estimatedWaitTime || 0}<span className="text-base font-medium text-gray-500 ml-1">min</span></div>
                      <div className="text-xs text-gray-400 mt-1">based on current speed</div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="mt-auto animate-in fade-in duration-500 delay-300">
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-900 dark:text-indigo-200">
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center shrink-0">
                <span className="font-serif italic font-bold">i</span>
              </div>
              <p className="text-sm font-medium leading-relaxed">
                Keep this page open to watch your status update live. We'll refresh automatically as the line moves.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
