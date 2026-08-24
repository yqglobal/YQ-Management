import React, { useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getBackendUrl } from '../../../lib/api';
import { io, Socket } from 'socket.io-client';
import { Clock, Users, XCircle, CheckCircle2, Loader2, RefreshCw, MapPin, Stethoscope } from 'lucide-react';

// The [id] in the URL is the Visit.accessToken (opaque UUID from QR code / WhatsApp link)
// This is NOT the Visit.id - it's the public-facing capability token
async function fetchVisitStatus(accessToken: string) {
  const baseUrl = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL || getBackendUrl())
    : getBackendUrl();

  const res = await fetch(`${baseUrl}/public-visit/${accessToken}`, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    if (res.status === 404) throw new Error('Visit not found');
    throw new Error('Failed to fetch visit status');
  }
  return res.json();
}

export default function CustomerLiveStatus() {
  const router = useRouter();
  const { id: accessToken } = router.query; // accessToken from URL
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['visit-status', accessToken],
    queryFn: () => fetchVisitStatus(accessToken as string),
    enabled: !!accessToken && typeof accessToken === 'string',
    retry: 1,
    staleTime: 5000,
  });

  // Stable refetch reference for socket callbacks
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  const triggerRefetch = useCallback(() => {
    refetchRef.current();
  }, []);

  // WebSocket subscription: join the visit room with the accessToken for validation
  useEffect(() => {
    if (!accessToken || !data?.id) return;

    const baseUrl = typeof window !== 'undefined'
      ? (process.env.NEXT_PUBLIC_API_URL || getBackendUrl())
      : getBackendUrl();

    const socket = io(baseUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      // Subscribe to this specific visit room - server validates accessToken
      socket.emit('subscribeToVisit', {
        visitId: data.id,
        accessToken: accessToken as string,
      });
    });

    // Listen to outbox event names (lowercase, from OutboxProcessorService)
    socket.on('visit_created', triggerRefetch);
    socket.on('visit_called', triggerRefetch);
    socket.on('visit_completed', triggerRefetch);
    socket.on('visit_missed', triggerRefetch);
    socket.on('visit_checked_in', triggerRefetch);
    socket.on('queue_status_changed', triggerRefetch);

    // Polling fallback: re-sync every 15s in case socket misses an event
    pollingRef.current = setInterval(() => {
      refetchRef.current();
    }, 15000);

    return () => {
      socket.disconnect();
      socketRef.current = null;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [accessToken, data?.id, triggerRefetch]);

  // ─── Loading State ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-gray-900 dark:text-white">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
        <p className="mt-4 font-medium text-gray-500 dark:text-zinc-400">Loading your status...</p>
      </div>
    );
  }

  // ─── Error State ────────────────────────────────────────────────────────────
  if (error && !data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex items-center justify-center p-6 text-gray-900 dark:text-white">
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-xl max-w-sm w-full text-center border border-gray-100 dark:border-zinc-800">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Visit Not Found</h1>
          <p className="text-gray-500 dark:text-zinc-400 text-sm mb-6">
            This link may have expired or is invalid. Please re-scan the QR code at the desk.
          </p>
          <button
            onClick={() => router.back()}
            className="text-sm text-indigo-600 dark:text-indigo-400 underline"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // ─── Map API response to display variables ──────────────────────────────────
  // Backend findOnePublic returns: { id, displayId, currentState, position, ewt, customer, service, location, tenant }
  const {
    displayId,
    currentState,
    position,
    ewt,
    customer,
    service,
    location,
    tenant,
  } = data;

  const customerName = customer?.name || 'Guest';
  const serviceName = service?.name || 'Service';
  const locationName = location?.name || '';
  const tenantName = tenant?.name || '';

  const isWaiting = currentState === 'WAITING' || currentState === 'CHECKED_IN';
  const isServing = currentState === 'IN_SERVICE';
  const isDone = ['COMPLETED', 'MISSED', 'NO_SHOW', 'CANCELLED'].includes(currentState);
  const isScheduled = currentState === 'SCHEDULED' || currentState === 'CREATED';

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-white font-sans selection:bg-indigo-500/30">
      <Head>
        <title>Queue Status | {customerName}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="robots" content="noindex" />
      </Head>

      <main className="max-w-md mx-auto min-h-screen flex flex-col bg-white dark:bg-zinc-900 shadow-2xl relative overflow-hidden">

        {/* Header gradient */}
        <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-indigo-500/20 to-transparent dark:from-indigo-500/10 pointer-events-none" />

        <div className="p-6 pt-12 flex-1 flex flex-col z-10">

          {/* Greeting */}
          <div className="text-center mb-8 animate-in slide-in-from-top-4 duration-500">
            {tenantName && (
              <p className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-2">
                {tenantName}
              </p>
            )}
            <h1 className="text-2xl font-bold mb-1">Hello, {customerName}</h1>
            <p className="text-gray-500 dark:text-zinc-400 text-sm">Your live queue status is below.</p>
          </div>

          {/* Main Status Card */}
          <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none mb-6 animate-in zoom-in-95 duration-500 delay-100">

            {/* Token & Service info */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <div className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                  Ticket Number
                </div>
                <div className="text-4xl font-black font-mono tracking-tight text-indigo-600 dark:text-indigo-400">
                  {displayId || (data.id as string)?.substring(0, 8).toUpperCase() || '—'}
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  {serviceName}
                </span>
              </div>
            </div>

            {/* ── Serving State ── */}
            {isServing && (
              <div className="bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-500 rounded-2xl p-6 text-center animate-pulse">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <h2 className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mb-1">
                  It's Your Turn!
                </h2>
                <p className="text-emerald-600 dark:text-emerald-500 font-medium">
                  Please proceed to the service desk now.
                </p>
              </div>
            )}

            {/* ── Done State ── */}
            {isDone && (
              <div className="bg-gray-100 dark:bg-zinc-800 rounded-2xl p-6 text-center">
                <h2 className="text-xl font-bold mb-2">Visit Ended</h2>
                <p className="text-gray-500 dark:text-zinc-400 text-sm">
                  Your visit has been marked as{' '}
                  <span className="font-semibold capitalize">{currentState?.toLowerCase().replace('_', ' ')}</span>.
                </p>
                {currentState === 'COMPLETED' && (
                  <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl">
                    <p className="text-emerald-700 dark:text-emerald-400 text-sm font-medium">
                      Thank you for visiting. We hope to see you again!
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── Scheduled State ── */}
            {isScheduled && (
              <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-800 rounded-2xl p-6 text-center">
                <Clock className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                <h2 className="text-lg font-bold text-amber-700 dark:text-amber-400 mb-1">
                  Appointment Scheduled
                </h2>
                <p className="text-amber-600 dark:text-amber-500 text-sm font-medium">
                  Please check in when you arrive.
                </p>
              </div>
            )}

            {/* ── Waiting State ── */}
            {isWaiting && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-zinc-900 rounded-2xl p-5 border border-gray-100 dark:border-zinc-800 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-indigo-500" />
                    <div className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                      Position
                    </div>
                  </div>
                  <div className="text-4xl font-bold text-gray-900 dark:text-white">
                    {typeof position === 'number' ? position : '—'}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-zinc-500 mt-1">
                    {position === 1 ? 'You are next!' : `people ahead`}
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-zinc-900 rounded-2xl p-5 border border-gray-100 dark:border-zinc-800 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-emerald-500" />
                    <div className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                      Est. Wait
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    ~{typeof ewt === 'number' ? ewt : 0}
                    <span className="text-base font-medium text-gray-500 dark:text-zinc-400 ml-1">min</span>
                  </div>
                  <div className="text-xs text-gray-400 dark:text-zinc-500 mt-1">
                    based on current speed
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Location Info */}
          {locationName && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 mb-4 animate-in fade-in duration-500 delay-200">
              <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="text-sm text-gray-600 dark:text-zinc-400 font-medium">{locationName}</span>
              {serviceName && (
                <>
                  <span className="text-gray-300 dark:text-zinc-600">·</span>
                  <Stethoscope className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-600 dark:text-zinc-400">{serviceName}</span>
                </>
              )}
            </div>
          )}

          {/* Info Banner */}
          <div className="mt-auto animate-in fade-in duration-500 delay-300">
            {isWaiting && (
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-900 dark:text-indigo-200 mb-4">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center shrink-0">
                  <span className="font-serif italic font-bold text-sm">i</span>
                </div>
                <p className="text-sm font-medium leading-relaxed">
                  Keep this page open to watch your status update live. You'll also receive a WhatsApp notification when it's almost your turn.
                </p>
              </div>
            )}

            {/* Manual refresh button */}
            <button
              onClick={triggerRefetch}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Tap to refresh
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
