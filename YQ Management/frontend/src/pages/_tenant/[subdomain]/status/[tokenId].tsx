import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { TenantSupportFooter } from '../../../../components/TenantSupportFooter';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../../../lib/api';
import { t } from '../../../../lib/i18n';
import { MapPin, Clock, Info, XCircle, CalendarCheck, Star, CheckCircle, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';

// ── Inline CSAT Rating Widget ─────────────────────────────────────────────────
function RatingWidget({ accessToken, lang }: { accessToken: string; lang: string }) {
  const [selected, setSelected] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || '';
      await fetch(`${apiBase}/public-visit/${accessToken}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: selected, feedbackText: comment.trim() || undefined }),
      });
      setSubmitted(true);
    } catch {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <motion.div
        key="rating-thanks"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center"
      >
        <div className="text-3xl mb-2">🙏</div>
        <p className="text-emerald-700 font-bold text-lg mb-1">Thank you for your feedback!</p>
        <p className="text-emerald-600 text-sm">Your response helps us improve our service.</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      key="rating-widget"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm"
    >
      <p className="text-gray-800 font-bold text-center mb-1">How was your experience?</p>
      <p className="text-gray-500 text-sm text-center mb-4">Rate your visit today</p>

      {/* Star selector */}
      <div className="flex justify-center gap-2 mb-4">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setSelected(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="transition-transform hover:scale-125 active:scale-95"
            aria-label={`Rate ${star} stars`}
          >
            <Star
              className={`w-9 h-9 transition-colors ${
                star <= (hovered || selected)
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>

      {/* Optional comment */}
      {selected > 0 && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={selected <= 3 ? 'What could we improve? (optional)' : 'Anything else to share? (optional)'}
            maxLength={500}
            rows={3}
            className="w-full border border-gray-200 rounded-xl p-3 text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 mb-3"
          />
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-60"
          >
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

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

export default function TenantStatusPage({ tenant, tokenId }: { tenant: AnyFixMe, tokenId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isBrandingEnabled = tenant?.planFeatures?.customBranding !== false && tenant?.branding?.enabled !== false;
  const primaryColor = isBrandingEnabled ? (tenant.branding?.primaryColor || '#4f46e5') : '#4f46e5';

  const { data: statusData, isLoading, error } = useQuery<AnyFixMe, AnyFixMe>({
    queryKey: ['token-status', tokenId],
    queryFn: () => fetchApi(`/public-visit/${tokenId}`),
    enabled: !!tokenId,
  });

  const cancelMutation = useMutation({
    mutationFn: () => fetchApi(`/visits/${tokenId}/cancel`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['token-status', tokenId] });
    }
  });

  const checkInMutation = useMutation({
    // Using the new public check-in endpoint
    mutationFn: () => fetchApi(`/visits/${tokenId}/checkin`, { method: 'POST' }),
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

  // Live EWT countdown — ticks every second, resets when estimatedWaitTime changes (via websocket)
  const [ewtSeconds, setEwtSeconds] = useState(0);
  useEffect(() => {
    if (!statusData) return;
    setEwtSeconds((statusData.estimatedWaitTime || 0) * 60);
  }, [statusData?.estimatedWaitTime]);
  useEffect(() => {
    if (ewtSeconds <= 0) return;
    const t = setInterval(() => setEwtSeconds(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [ewtSeconds > 0]);

  const fmtEwt = (secs: number) => {
    if (secs <= 0) return 'Any moment now';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };


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
            {!isBrandingEnabled ? (
              <>
                <Image src="/qmova-light-logo.png" alt="Qmova" width={140} height={32} className="h-8 w-auto max-w-[140px] object-contain dark:hidden" priority />
                <Image src="/qmova-dark-logo.png" alt="Qmova" width={140} height={32} className="h-8 w-auto max-w-[140px] object-contain hidden dark:block" priority />
              </>
            ) : tenant.branding?.logoUrl ? (
              <Image src={tenant.branding.logoUrl} alt={tenant.name} width={140} height={32} className="h-8 w-auto max-w-[140px] object-contain" priority />
            ) : (
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs shadow-lg shrink-0"
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
                    key={Math.floor(ewtSeconds / 60)}
                    initial={{ scale: 1.1, opacity: 0.5 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-3xl font-bold text-gray-900 mb-1 tabular-nums"
                  >
                    {fmtEwt(ewtSeconds)}
                  </motion.div>
                  <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Time remaining</div>
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

            {isCompleted && token.status === 'COMPLETED' && (
              <RatingWidget accessToken={token.accessToken || tokenId} lang={lang} />
            )}
            {isCompleted && token.status === 'MISSED' && (
              <motion.div
                key="missed-alert"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-amber-50 border border-amber-200 rounded-2xl p-6"
              >
                <p className="text-amber-700 font-semibold mb-1">You missed your turn</p>
                <p className="text-amber-600 text-sm">Please speak to a staff member if you still need assistance.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Wayfinding Journey */}
        {token?.visitSteps && token.visitSteps.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm mb-6"
          >
            <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-indigo-500" />
              Your Service Journey
            </h3>
            <div className="relative">
              {/* Vertical line connecting steps */}
              <div className="absolute left-[15px] top-4 bottom-8 w-0.5 bg-gray-100 z-0" />
              
              <div className="flex flex-col gap-6 relative z-10">
                {token.visitSteps.map((step: any, idx: number) => {
                  const isActive = step.status === 'ACTIVE' || step.status === 'UNLOCKED';
                  const isCompleted = step.status === 'COMPLETED';
                  const isSkipped = step.status === 'SKIPPED';
                  const isPending = step.status === 'PENDING' || step.status === 'LOCKED';
                  
                  return (
                    <div key={step.id} className={`flex gap-4 ${isSkipped ? 'opacity-40' : ''}`}>
                      <div className="shrink-0 mt-1 relative z-10 bg-white">
                        {isCompleted ? (
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-emerald-600" />
                          </div>
                        ) : isActive ? (
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center border-2 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.4)]">
                            <ArrowRight className="w-4 h-4 text-indigo-600" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-50 border-2 border-gray-200 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-gray-300" />
                          </div>
                        )}
                      </div>
                      
                      <div className={`flex-1 ${isActive ? '' : 'pt-1'}`}>
                        <div className="flex justify-between items-start mb-1">
                          <h4 className={`font-semibold ${isActive ? 'text-indigo-900' : isCompleted ? 'text-gray-900' : 'text-gray-500'}`}>
                            {step.name}
                          </h4>
                          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${isActive ? 'bg-indigo-100 text-indigo-700' : isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                            {step.status}
                          </span>
                        </div>
                        
                        {isActive && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            className="bg-indigo-50 rounded-xl p-4 mt-3 border border-indigo-100"
                          >
                            {step.templateStep?.locationDescription && (
                              <div className="flex items-start gap-2 text-indigo-900 font-medium mb-2">
                                <MapPin className="w-4 h-4 mt-0.5 text-indigo-500 shrink-0" />
                                <span>{step.templateStep.locationDescription}</span>
                              </div>
                            )}
                            {step.templateStep?.customerInstruction && (
                              <div className="flex items-start gap-2 text-indigo-800 text-sm">
                                <Info className="w-4 h-4 mt-0.5 text-indigo-500 shrink-0" />
                                <span>{step.templateStep.customerInstruction}</span>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

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

        <TenantSupportFooter tenant={tenant} />

        {/* Powered by Qmova */}
        {!isBrandingEnabled && (
        <div className="mt-8 pb-4 text-center z-10 relative">
          <a href="https://qmova.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <span>Powered by</span>
            <Image src="/qmova-light-logo.png" alt="Qmova" width={60} height={18} className="h-[18px] w-auto object-contain dark:hidden" />
            <Image src="/qmova-dark-logo.png" alt="Qmova" width={60} height={18} className="h-[18px] w-auto object-contain hidden dark:block" />
          </a>
        </div>
      )}
    </div>
  );
}
