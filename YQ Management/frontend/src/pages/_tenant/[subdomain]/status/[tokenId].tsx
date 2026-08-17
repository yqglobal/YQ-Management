import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../../../lib/api';
import { t } from '../../../../lib/i18n';
import { Bell, MapPin, Clock, Info, XCircle, CalendarCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { subdomain, tokenId } = context.params as { subdomain: string, tokenId: string };
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
  
  try {
    const tenantRes = await fetch(`${baseUrl}/tenant/public/${subdomain}`);
    if (!tenantRes.ok) return { notFound: true };
    const tenant = await tenantRes.json();
    return { props: { tenant, tokenId } };
  } catch (error) {
    return { notFound: true };
  }
};

export default function TenantStatusPage({ tenant, tokenId }: { tenant: any, tokenId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const primaryColor = tenant.branding?.primaryColor || '#4f46e5';

  const { data: statusData, isLoading, error } = useQuery<any, any>({
    queryKey: ['token-status', tokenId],
    queryFn: () => fetchApi(`/token/${tokenId}/status`),
    enabled: !!tokenId,
  });

  const cancelMutation = useMutation({
    mutationFn: () => fetchApi(`/token/${tokenId}/cancel`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['token-status', tokenId] });
    }
  });

  const checkInMutation = useMutation({
    // Using the new public check-in endpoint
    mutationFn: () => fetchApi(`/token/${tokenId}/customer-checkin`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['token-status', tokenId] });
    }
  });

  const queueId = statusData?.token?.queueId;

  useEffect(() => {
    if (!queueId) return;
    
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
    const socket = io(backendUrl);

    socket.on('connect', () => {
      socket.emit('joinQueueRoom', queueId);
    });

    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: ['token-status', tokenId] });
    };

    socket.on('queue_status_changed', refresh);
    socket.on('token_joined', refresh);
    socket.on('token_serving', refresh);
    socket.on('token_completed', refresh);
    socket.on('token_missed', refresh);

    return () => {
      socket.disconnect();
    };
  }, [queueId, tokenId, queryClient]);

  // Client-side timer to re-evaluate if check-in is allowed based on time difference
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col p-6 items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  if (error || !statusData) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">Token not found</div>;
  }

  const { token, position, estimatedWaitTime, isScheduled } = statusData;
  const isServing = token.status === 'SERVING';
  const isCompleted = token.status === 'COMPLETED' || token.status === 'MISSED';
  const lang = token.language || 'en';

  // Determine if check-in is allowed (within 30 mins of scheduled time)
  let canCheckIn = false;
  if (isScheduled && !token.checkedIn && token.scheduledFor) {
    const scheduledTime = new Date(token.scheduledFor).getTime();
    const currentTime = now.getTime();
    const diffMins = (scheduledTime - currentTime) / 60000;
    // Allow check-in if within 30 minutes before, or if they are late
    if (diffMins <= 30) {
      canCheckIn = true;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col p-6 relative overflow-hidden">
      <Head>
        <title>Live Status | {tenant.name}</title>
      </Head>

      <div 
        className={`absolute top-0 right-0 w-[500px] h-[500px] rounded-full mix-blend-multiply filter blur-[150px] pointer-events-none z-0 transition-colors duration-1000 opacity-20`}
        style={isServing ? { backgroundColor: '#10b981' } : isCompleted ? { backgroundColor: '#9ca3af' } : { backgroundColor: primaryColor }}
      ></div>

      <div className="w-full max-w-md mx-auto z-10 flex-1 flex flex-col">
        
        {/* Header */}
        <header className="flex items-center justify-between py-4 mb-6">
          <div className="flex items-center gap-2">
            {tenant.branding?.logoUrl ? (
              <img src={tenant.branding.logoUrl} alt={tenant.name} className="h-8 object-contain" />
            ) : (
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs shadow-lg"
                style={{ backgroundColor: primaryColor }}
              >
                {tenant.name.substring(0, 2).toUpperCase()}
              </div>
            )}
            <span className="font-bold text-gray-900 tracking-wide">Live Status</span>
          </div>
        </header>

        {/* Main Status Card */}
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", bounce: 0.4 }}
          className={`bg-white border rounded-3xl p-8 text-center mb-6 transition-all duration-500 shadow-xl ${isServing ? 'border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.3)]' : 'border-gray-100'}`}
        >
          
          <motion.div layout className="text-sm font-medium text-gray-500 uppercase tracking-widest mb-1">{t(lang, 'statusTitle')}</motion.div>
          <motion.div layout className={`text-2xl font-bold mb-8 ${isServing ? 'text-emerald-500' : isCompleted ? 'text-gray-500' : 'text-gray-900'}`}>
            {isServing ? t(lang, 'itIsYourTurn') : token.status === 'MISSED' ? t(lang, 'tokenCancelled') : isCompleted ? t(lang, 'tokenCompleted') : t(lang, 'waitingInLine')}
          </motion.div>

          <motion.div layout 
            key={token.id}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-6xl font-bold mb-2 font-mono tracking-wider"
            style={{ color: primaryColor }}
          >
            {token.displayId || (token.id ? token.id.substring(0, 5).toUpperCase() : '---')}
          </motion.div>
          <motion.p layout className="text-sm text-gray-500 font-medium mb-8">Hi, {token.customerName}</motion.p>

          <AnimatePresence mode="wait">
            {isScheduled && !token.checkedIn && (
              <motion.div 
                key="scheduled-alert"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="border rounded-2xl p-6 relative overflow-hidden"
                style={{ backgroundColor: `${primaryColor}10`, borderColor: `${primaryColor}30` }}
              >
                <CalendarCheck className="w-8 h-8 mx-auto mb-3" style={{ color: primaryColor }} />
                <p className="font-medium mb-2" style={{ color: primaryColor }}>Appointment Confirmed</p>
                <p className="text-sm mb-4" style={{ color: `${primaryColor}90` }}>
                  Scheduled for {new Date(token.scheduledFor).toLocaleString()}
                </p>
                
                {token.queue?.requireManualCheckIn ? (
                  canCheckIn ? (
                    <button 
                      onClick={() => checkInMutation.mutate()}
                      disabled={checkInMutation.isPending}
                      className="w-full py-3 text-white rounded-xl font-bold transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <MapPin className="w-4 h-4" />
                      {checkInMutation.isPending ? 'Checking In...' : 'I Have Arrived (Check In)'}
                    </button>
                  ) : (
                    <p className="text-xs text-gray-600 mt-2 p-2 bg-white/50 rounded-lg">
                      Check-in will be available 30 minutes before your scheduled time.
                    </p>
                  )
                ) : (
                  <p className="text-xs" style={{ color: `${primaryColor}90` }}>
                    You will be automatically placed in the live queue 15 minutes before your time.
                  </p>
                )}
              </motion.div>
            )}

            {!isServing && !isCompleted && (!isScheduled || token.checkedIn) && (
              <motion.div 
                key="waiting-stats"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="grid grid-cols-2 gap-4"
              >
                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 flex flex-col items-center justify-center">
                  <MapPin className="w-5 h-5 text-gray-400 mb-2" />
                  <motion.div 
                    key={position}
                    initial={{ scale: 1.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-3xl font-bold text-gray-900 mb-1"
                  >
                    #{position}
                  </motion.div>
                  <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">{t(lang, 'yourPosition')}</div>
                </div>
                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 flex flex-col items-center justify-center">
                  <Clock className="w-5 h-5 text-gray-400 mb-2" />
                  <motion.div 
                    key={estimatedWaitTime}
                    initial={{ scale: 1.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-3xl font-bold text-gray-900 mb-1"
                  >
                    ~{estimatedWaitTime}m
                  </motion.div>
                  <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">{t(lang, 'estimatedWait')}</div>
                </div>
              </motion.div>
            )}

            {isServing && (
              <motion.div 
                key="serving-alert"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6"
              >
                <p className="text-emerald-700 font-medium mb-2">{t(lang, 'proceedToCounter')}</p>
                <p className="text-sm text-emerald-600/70">Show this screen to the operator</p>
              </motion.div>
            )}

            {isCompleted && (
              <motion.div 
                key="completed-alert"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-gray-100 rounded-2xl p-6"
              >
                <p className="text-gray-600 font-medium">{t(lang, 'tokenCompleted')}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Info Box */}
        <AnimatePresence>
          {!isServing && !isCompleted && (!isScheduled || token.checkedIn) && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3"
            >
              <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900 mb-1">Keep this page open</p>
                <p className="text-xs text-blue-700/80 leading-relaxed">
                  We will update your position in real-time. You'll also receive a WhatsApp message when it's your turn.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!isServing && !isCompleted && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="mt-6 flex justify-center"
            >
              <button 
                onClick={() => {
                  if (confirm(t(lang, 'cancelConfirm') as string)) {
                    cancelMutation.mutate();
                  }
                }}
                disabled={cancelMutation.isPending}
                className="flex items-center gap-2 text-red-500 hover:text-red-400 font-medium transition-colors"
              >
                <XCircle className="w-5 h-5" />
                {cancelMutation.isPending ? 'Cancelling...' : t(lang, 'leaveQueue')}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
