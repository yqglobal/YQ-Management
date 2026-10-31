import { toast } from 'sonner';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { getBackendUrl } from '../../../lib/api';
import { io, Socket } from 'socket.io-client';
import {
  Clock,
  Users,
  XCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  MapPin,
  Stethoscope,
  CreditCard,
  Star,
  FileText,
  Check,
  AlertCircle,
  SkipForward,
  Send,
  Sparkles,
  Download,
  Receipt,
  Sun,
  Moon,
  Share2,
  CalendarPlus,
  QrCode,
  X,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { useTheme } from '../../../components/ThemeProvider';
import { PaymentStep } from '../../../components/booking/PaymentStep';
import { ConfirmModal } from '../../../components/modals/ConfirmModal';
import { downloadInvoicePdf, formatMoney } from '../../../lib/invoicePdf';
import { downloadIcsCalendar } from '../../../lib/calendarExport';

interface TemplateStep {
  type: string;
  isOptional?: boolean;
  customerInstruction?: string | null;
  locationDescription?: string | null;
  floorNumber?: number | null;
  roomNumber?: string | null;
  buildingWing?: string | null;
  stepPrice?: number | null;
  stepPriceCurrency?: string | null;
  isPriceVariable?: boolean;
  customerView?: {
    title?: string;
    message?: string;
    showEta?: boolean;
    showQueuePosition?: boolean;
    showLocationHint?: boolean;
    locationHint?: string;
    showStaffName?: boolean;
    ctaLabel?: string;
    ctaUrl?: string;
    icon?: string;
    fields?: Array<{
      id: string;
      label: string;
      type?: 'text' | 'textarea' | 'select' | 'checkbox';
      placeholder?: string;
      required?: boolean;
      options?: string[];
    }>;
  } | null;
  notifyCustomerOnActivation?: boolean;
}

interface VisitStepItem {
  id: string;
  stepOrder: number;
  name: string;
  type?: string;
  status: 'LOCKED' | 'PENDING' | 'QUEUED' | 'ACTIVE' | 'UNLOCKED' | 'DONE' | 'SKIPPED' | 'EXPIRED' | 'DEFERRED';
  formData?: Record<string, unknown>;
  amountCharged?: number | null;
  paymentStatus?: string | null;
  templateStep?: TemplateStep;
}

async function fetchVisitStatus(accessToken: string) {
  const baseUrl =
    typeof window !== 'undefined'
      ? process.env.NEXT_PUBLIC_API_URL || getBackendUrl()
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
  const { id: accessToken } = router.query;
  const socketRef = useRef<Socket | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Theme & Modal states
  const { theme, toggleTheme } = useTheme();
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // CSAT Rating state
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [isSubmittingRating, setIsSubmittingRating] = useState<boolean>(false);
  const [ratingSubmittedLocally, setRatingSubmittedLocally] = useState<boolean>(false);

  // Form Step state
  const [formResponses, setFormResponses] = useState<Record<string, string>>({});
  const [isSubmittingForm, setIsSubmittingForm] = useState<boolean>(false);

  // Skip Step state
  const [isSkippingStep, setIsSkippingStep] = useState<boolean>(false);
  const [confirmSkipStepId, setConfirmSkipStepId] = useState<string | null>(null);

  // Cancel Appointment state
  const [showCancelAppointmentConfirm, setShowCancelAppointmentConfirm] = useState(false);
  const [isCancellingAppointment, setIsCancellingAppointment] = useState(false);

  const handleCancelAppointment = async () => {
    setIsCancellingAppointment(true);
    try {
      await fetch(`${getBackendUrl()}/public-visit/${accessToken}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelReason: 'Cancelled by customer' }),
      });
      toast.success('Appointment cancelled');
      setShowCancelAppointmentConfirm(false);
      refetchRef.current();
    } catch {
      toast.error('Failed to cancel appointment. Please try again.');
    } finally {
      setIsCancellingAppointment(false);
    }
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['visit-status', accessToken],
    queryFn: () => fetchVisitStatus(accessToken as string),
    enabled: !!accessToken && typeof accessToken === 'string',
    retry: 1,
    staleTime: 5000,
  });

  const refetchRef = useRef(refetch);
  useEffect(() => {
    refetchRef.current = refetch;
  }, [refetch]);

  const triggerRefetch = useCallback(() => {
    refetchRef.current();
  }, []);

  const visitId = data?.token?.id || data?.id;

  // WebSocket subscription: join visit room with token validation
  useEffect(() => {
    if (!accessToken || !visitId) return;

    const baseUrl =
      typeof window !== 'undefined'
        ? process.env.NEXT_PUBLIC_API_URL || getBackendUrl()
        : getBackendUrl();

    const socket = io(baseUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('subscribeToVisit', {
        visitId,
        accessToken: accessToken as string,
      });
    });

    // Listen to all outbox and step events
    socket.on('visit_created', triggerRefetch);
    socket.on('visit_called', triggerRefetch);
    socket.on('visit_completed', triggerRefetch);
    socket.on('visit_missed', triggerRefetch);
    socket.on('visit_cancelled', triggerRefetch);
    socket.on('visit_checked_in', triggerRefetch);
    socket.on('queue_status_changed', triggerRefetch);
    socket.on('step_activated', triggerRefetch);
    socket.on('visit_step_updated', triggerRefetch);
    socket.on('visit_updated', triggerRefetch);

    // Fallback polling every 15s
    pollingRef.current = setInterval(() => {
      refetchRef.current();
    }, 15000);

    return () => {
      socket.disconnect();
      socketRef.current = null;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [accessToken, visitId, triggerRefetch]);

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-gray-900 dark:text-white">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
        <p className="mt-4 font-medium text-gray-500 dark:text-zinc-400">Loading your status...</p>
      </div>
    );
  }

  // Error State
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
            className="text-sm text-indigo-600 dark:text-indigo-400 underline font-medium"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Variables mapping
  const { position, estimatedWaitTime: ewt } = data;
  const {
    displayId,
    currentState,
    customer,
    service,
    location,
    tenant,
    scheduledTime,
    visitSteps = [],
    rating: savedRating,
    feedbackText: savedFeedbackText,
  } = data.token || {};

  const customerName = customer?.name || 'Guest';
  const serviceName = service?.name || 'Service';
  const locationName = location?.name || '';
  const tenantName = tenant?.name || '';

  const isWaiting = currentState === 'WAITING' || currentState === 'CHECKED_IN';
  const isServing = currentState === 'IN_SERVICE';
  const isCompleted = currentState === 'COMPLETED';
  const isDone = ['COMPLETED', 'MISSED', 'NO_SHOW', 'CANCELLED'].includes(currentState);
  const isScheduled = currentState === 'SCHEDULED' || currentState === 'CREATED';
  const isQueuePaused = Boolean(
    data.isQueuePaused ||
      data.token?.queue?.status === 'PAUSED' ||
      data.token?.queue?.status === 'PAUSED_FOR_EMERGENCY'
  );

  const handleAddToCalendar = () => {
    if (!scheduledTime) return;
    const startDate = new Date(scheduledTime);
    const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);
    downloadIcsCalendar({
      title: `${serviceName} - ${tenantName || 'Appointment'}`,
      description: `Appointment reference ${displayId || 'Queue Ticket'} for ${customerName} at ${tenantName || 'qmova'}.`,
      location: locationName || tenantName || '',
      startDate,
      endDate,
      filename: `appointment-${displayId || 'qmova'}.ics`,
    });
    toast.success('Calendar event (.ics) downloaded');
  };

  const handleShare = async () => {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Live Status: ${customerName}`,
          text: `Track live visit status for ${customerName} at ${tenantName || 'qmova'}`,
          url,
        });
        return;
      } catch {
        // Fall back to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
      toast.success('Live tracking link copied to clipboard!');
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      toast.error('Could not copy link');
    }
  };

  // Active step in the journey
  const activeStep: VisitStepItem | undefined = visitSteps.find(
    (s: VisitStepItem) => s.status === 'ACTIVE' || s.status === 'UNLOCKED'
  );

  const isPaymentRequired =
    (activeStep?.templateStep?.type === 'PAYMENT' || activeStep?.type === 'PAYMENT') &&
    (!activeStep.paymentStatus || activeStep.paymentStatus === 'PENDING');
  const stripeAccountId = tenant?.paymentAccount?.connectedAccountId;

  const isFormStep =
    (activeStep?.templateStep?.type === 'FORM' || activeStep?.type === 'FORM') &&
    activeStep.status === 'ACTIVE';

  const isSkippable = Boolean(activeStep?.templateStep?.isOptional && activeStep?.status === 'ACTIVE');

  // Submit Form Handler
  const handleSubmitForm = async (stepId: string) => {
    if (!accessToken) return;
    setIsSubmittingForm(true);
    try {
      const baseUrl =
        typeof window !== 'undefined'
          ? process.env.NEXT_PUBLIC_API_URL || getBackendUrl()
          : getBackendUrl();

      const res = await fetch(`${baseUrl}/public-visit/${accessToken}/submit-form/${stepId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData: formResponses }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to submit form');
      }

      toast.success('Information submitted successfully!');
      setFormResponses({});
      triggerRefetch();
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Error submitting form. Please try again.');
    } finally {
      setIsSubmittingForm(false);
    }
  };

  // Skip Step Handler
  const handleSkipStep = async (stepId: string) => {
    if (!accessToken) return;
    setIsSkippingStep(true);
    try {
      const baseUrl =
        typeof window !== 'undefined'
          ? process.env.NEXT_PUBLIC_API_URL || getBackendUrl()
          : getBackendUrl();

      const res = await fetch(`${baseUrl}/public-visit/${accessToken}/skip-step/${stepId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to skip step');
      }

      toast.success('Step skipped successfully');
      setConfirmSkipStepId(null);
      triggerRefetch();
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Error skipping step');
    } finally {
      setIsSkippingStep(false);
    }
  };

  // Submit CSAT Rating Handler
  const handleSubmitRating = async () => {
    if (!accessToken || rating < 1) return;
    setIsSubmittingRating(true);
    try {
      const baseUrl =
        typeof window !== 'undefined'
          ? process.env.NEXT_PUBLIC_API_URL || getBackendUrl()
          : getBackendUrl();

      const res = await fetch(`${baseUrl}/public-visit/${accessToken}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          feedbackText: feedbackText.trim() || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to submit rating');
      }

      toast.success('Thank you for your feedback!');
      setRatingSubmittedLocally(true);
      triggerRefetch();
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to submit feedback');
    } finally {
      setIsSubmittingRating(false);
    }
  };

  // Step Progress Calculation
  const totalSteps = visitSteps.length;
  const completedStepsCount = visitSteps.filter(
    (s: VisitStepItem) => s.status === 'DONE' || s.status === 'SKIPPED'
  ).length;
  const progressPercent = totalSteps > 0 ? Math.round((completedStepsCount / totalSteps) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 font-sans selection:bg-indigo-500/20">
      <Head>
        <title>Live Queue Status | {customerName}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="robots" content="noindex" />
      </Head>

      <main className="max-w-md mx-auto min-h-screen flex flex-col bg-white dark:bg-zinc-900 shadow-2xl relative overflow-hidden transition-colors">
        {/* Subtle top ambient glow */}
        <div className="absolute top-0 left-0 right-0 h-56 bg-gradient-to-b from-indigo-500/15 via-indigo-500/5 to-transparent dark:from-indigo-600/10 pointer-events-none" />

        {/* Top Header with Tenant Brand, Location & Theme Switcher */}
        <header className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-200/60 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            {tenant?.logoUrl ? (
              <div className="relative w-10 h-10 rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-700 shadow-xs shrink-0 bg-white">
                <Image
                  src={tenant.logoUrl}
                  alt={tenantName || 'Tenant Logo'}
                  fill
                  className="object-contain p-1"
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center shadow-xs shrink-0 text-base">
                {(tenantName || 'Q')[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate leading-tight">
                {tenantName || 'Live Journey'}
              </h2>
              {locationName && (
                <p className="text-xs text-slate-500 dark:text-zinc-400 flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                  {locationName}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Live Indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              LIVE
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 transition-colors"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>
          </div>
        </header>

        <div className="p-5 flex-1 flex flex-col z-10 space-y-5">
          {/* Greeting & Customer Subheading */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 dark:text-zinc-400 uppercase tracking-wider">
                Live Status & Journey
              </p>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Hi, {customerName}
              </h1>
            </div>
            <button
              onClick={() => setShowQrModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800/80 text-indigo-600 dark:text-indigo-400 text-xs font-bold transition-all shadow-xs"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Show QR</span>
            </button>
          </div>

          {/* ── Main Status Card ── */}
          <div className="bg-white dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none">
            {/* Ticket & Badge header */}
            <div className="flex justify-between items-start mb-5">
              <div>
                <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest block mb-1">
                  Ticket Number
                </span>
                <span className="text-4xl font-black font-mono tracking-tight text-indigo-600 dark:text-indigo-400">
                  {displayId || (data.id as string)?.substring(0, 8).toUpperCase() || '—'}
                </span>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
                  {serviceName}
                </span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase border ${
                    currentState === 'WAITING'
                      ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                      : currentState === 'IN_SERVICE'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-pulse'
                      : currentState === 'SCHEDULED'
                      ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
                      : ['CANCELLED', 'MISSED', 'NO_SHOW'].includes(currentState)
                      ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
                      : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300'
                  }`}
                >
                  {currentState?.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* Queue Paused Notice */}
            {isQueuePaused && isWaiting && (
              <div className="mb-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div className="text-xs">
                  <h4 className="font-bold">Service Temporarily Paused</h4>
                  <p className="mt-0.5 text-amber-700/80 dark:text-amber-300/80 leading-relaxed">
                    The desk is on a short pause. Your spot (Position #{position || 1}) is safe and calling will resume shortly.
                  </p>
                </div>
              </div>
            )}

            {/* ── Serving State ── */}
            {isServing && (
              <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-2 border-emerald-500 rounded-2xl p-5 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2 animate-bounce">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h2 className="text-xl font-extrabold text-emerald-800 dark:text-emerald-300 mb-1">
                  It&apos;s Your Turn!
                </h2>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  Please proceed to the service desk or counter now.
                </p>
              </div>
            )}

            {/* ── Scheduled State ── */}
            {isScheduled && (
              <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 rounded-2xl p-5 text-center">
                <Clock className="w-9 h-9 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                <h3 className="text-base font-bold text-purple-900 dark:text-purple-200">
                  Appointment Scheduled
                </h3>
                {scheduledTime ? (
                  <div className="my-3 inline-block bg-white dark:bg-zinc-900 px-4 py-2 rounded-xl border border-purple-100 dark:border-purple-800 shadow-sm">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
                      Date & Time
                    </span>
                    <span className="text-base font-bold text-slate-800 dark:text-white">
                      {new Date(scheduledTime).toLocaleString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                    Please check in at the reception upon arrival.
                  </p>
                )}

                <div className="mt-3 pt-3 border-t border-purple-200/60 dark:border-purple-900/40">
                  <button
                    onClick={() => setShowCancelAppointmentConfirm(true)}
                    className="text-xs font-semibold text-red-500 hover:text-red-600 dark:text-red-400 transition-colors"
                  >
                    Cancel Appointment
                  </button>
                </div>
              </div>
            )}

            {/* ── Waiting Stats ── */}
            {isWaiting && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 dark:bg-zinc-900 rounded-2xl p-4 border border-slate-100 dark:border-zinc-800 flex flex-col justify-center">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Users className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider">
                      Position
                    </span>
                  </div>
                  <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
                    {typeof position === 'number' ? `#${position}` : '—'}
                  </div>
                  <span className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">
                    {position === 1 ? 'You are next in line!' : `${(position || 1) - 1} ahead of you`}
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-zinc-900 rounded-2xl p-4 border border-slate-100 dark:border-zinc-800 flex flex-col justify-center">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider">
                      Est. Wait
                    </span>
                  </div>
                  <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
                    ~{typeof ewt === 'number' ? ewt : 0}
                    <span className="text-sm font-medium text-slate-400 ml-1">min</span>
                  </div>
                  <span className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">
                    Live calculated
                  </span>
                </div>
              </div>
            )}

            {/* ── Done State Notice ── */}
            {isDone && !isCompleted && (
              <div className="bg-slate-100 dark:bg-zinc-800 rounded-2xl p-5 text-center">
                <h3 className="text-base font-bold mb-1">Visit Ended</h3>
                <p className="text-slate-500 dark:text-zinc-400 text-xs">
                  Your visit has ended with status{' '}
                  <span className="font-semibold">{currentState?.replace('_', ' ')}</span>.
                </p>
              </div>
            )}
          </div>

          {/* Quick Action Toolbar */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setShowQrModal(true)}
              className="flex flex-col items-center justify-center gap-1 p-2.5 rounded-2xl bg-white dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 hover:border-indigo-500/40 text-slate-700 dark:text-zinc-300 transition-all shadow-xs active:scale-95"
            >
              <QrCode className="w-4 h-4 text-indigo-500" />
              <span className="text-[11px] font-semibold">QR Pass</span>
            </button>

            {isScheduled && scheduledTime ? (
              <button
                onClick={handleAddToCalendar}
                className="flex flex-col items-center justify-center gap-1 p-2.5 rounded-2xl bg-white dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 hover:border-purple-500/40 text-slate-700 dark:text-zinc-300 transition-all shadow-xs active:scale-95"
              >
                <CalendarPlus className="w-4 h-4 text-purple-500" />
                <span className="text-[11px] font-semibold">Calendar (.ics)</span>
              </button>
            ) : (
              <Link
                href={`/customer/confirmation/${visitId || accessToken}`}
                className="flex flex-col items-center justify-center gap-1 p-2.5 rounded-2xl bg-white dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 hover:border-indigo-500/40 text-slate-700 dark:text-zinc-300 transition-all shadow-xs active:scale-95 text-center"
              >
                <ExternalLink className="w-4 h-4 text-indigo-500" />
                <span className="text-[11px] font-semibold">Digital Pass</span>
              </Link>
            )}

            <button
              onClick={handleShare}
              className="flex flex-col items-center justify-center gap-1 p-2.5 rounded-2xl bg-white dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 hover:border-emerald-500/40 text-slate-700 dark:text-zinc-300 transition-all shadow-xs active:scale-95"
            >
              {isCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4 text-emerald-500" />}
              <span className="text-[11px] font-semibold">{isCopied ? 'Copied!' : 'Share'}</span>
            </button>
          </div>

          {/* ── Active Step Highlight Card (Location Guidance, Instructions, Skip, Form, Payment) ── */}
          {activeStep && !isDone && (
            <div className="bg-gradient-to-b from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-zinc-900 border-2 border-indigo-500/30 dark:border-indigo-500/20 rounded-3xl p-5 shadow-sm space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-ping" />
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Current Stage: Step {activeStep.stepOrder}
                  </span>
                </div>
                {activeStep.templateStep?.isOptional && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                    OPTIONAL
                  </span>
                )}
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {activeStep.name}
                </h3>
                {activeStep.templateStep?.customerView?.title && (
                  <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mt-0.5">
                    {activeStep.templateStep.customerView.title}
                  </p>
                )}
              </div>

              {/* Location Guidance */}
              {(activeStep.templateStep?.locationDescription ||
                activeStep.templateStep?.roomNumber ||
                activeStep.templateStep?.floorNumber ||
                activeStep.templateStep?.buildingWing ||
                activeStep.templateStep?.customerView?.locationHint) && (
                <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 flex items-start gap-3 shadow-xs">
                  <MapPin className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <span className="font-bold text-slate-800 dark:text-zinc-200 block mb-0.5">
                      Where to go:
                    </span>
                    <p className="text-slate-600 dark:text-zinc-400 leading-relaxed">
                      {activeStep.templateStep?.customerView?.locationHint ||
                        activeStep.templateStep?.locationDescription}
                      {(activeStep.templateStep?.roomNumber || activeStep.templateStep?.floorNumber) && (
                        <span className="block mt-1 font-medium text-indigo-600 dark:text-indigo-400">
                          {activeStep.templateStep.buildingWing && `${activeStep.templateStep.buildingWing} Wing • `}
                          {activeStep.templateStep.floorNumber && `Floor ${activeStep.templateStep.floorNumber} `}
                          {activeStep.templateStep.roomNumber && `• Room ${activeStep.templateStep.roomNumber}`}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Customer Instruction */}
              {(activeStep.templateStep?.customerInstruction ||
                activeStep.templateStep?.customerView?.message) && (
                <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-900 dark:text-indigo-200 flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <div className="text-xs leading-relaxed">
                    <span className="font-bold block mb-0.5">Instructions:</span>
                    <p>
                      {activeStep.templateStep.customerInstruction ||
                        activeStep.templateStep.customerView?.message}
                    </p>
                  </div>
                </div>
              )}

              {/* Form Step Submission UI */}
              {isFormStep && (
                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-zinc-200">
                    <FileText className="w-4 h-4 text-indigo-500" />
                    Please fill out this form
                  </div>

                  {activeStep.templateStep?.customerView?.fields &&
                  activeStep.templateStep.customerView.fields.length > 0 ? (
                    <div className="space-y-3">
                      {activeStep.templateStep.customerView.fields.map((field) => (
                        <div key={field.id} className="space-y-1">
                          <label className="text-xs font-medium text-slate-700 dark:text-zinc-300 block">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                          </label>
                          {field.type === 'textarea' ? (
                            <textarea
                              rows={3}
                              placeholder={field.placeholder || ''}
                              value={formResponses[field.id] || ''}
                              onChange={(e) =>
                                setFormResponses({ ...formResponses, [field.id]: e.target.value })
                              }
                              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                            />
                          ) : (
                            <input
                              type={field.type || 'text'}
                              placeholder={field.placeholder || ''}
                              value={formResponses[field.id] || ''}
                              onChange={(e) =>
                                setFormResponses({ ...formResponses, [field.id]: e.target.value })
                              }
                              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-700 dark:text-zinc-300 block">
                        Your response / Notes:
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Enter requested information..."
                        value={formResponses['response'] || ''}
                        onChange={(e) =>
                          setFormResponses({ ...formResponses, response: e.target.value })
                        }
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      />
                    </div>
                  )}

                  <button
                    onClick={() => handleSubmitForm(activeStep.id)}
                    disabled={isSubmittingForm}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors shadow-sm disabled:opacity-50"
                  >
                    {isSubmittingForm ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Submit Form & Continue
                  </button>
                </div>
              )}

              {/* Payment Step UI */}
              {isPaymentRequired && (
                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2 mb-3">
                    <CreditCard className="w-4 h-4 text-indigo-500" />
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                      Payment Required to Proceed
                    </h4>
                  </div>
                  {stripeAccountId ? (
                    <PaymentStep
                      tenantId={tenant?.id}
                      amount={activeStep.templateStep?.stepPrice || data.token?.visitInvoice?.total || 0}
                      currency={activeStep.templateStep?.stepPriceCurrency || 'ZAR'}
                      stripeAccountId={stripeAccountId}
                      onSuccess={() => {
                        toast.success('Payment Successful!');
                        triggerRefetch();
                      }}
                      onBack={() => {}}
                      primaryColor="#4f46e5"
                      visitId={data.token?.id}
                      visitStepId={activeStep.id}
                    />
                  ) : (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 rounded-xl text-xs font-medium border border-amber-200 dark:border-amber-800">
                      Payment gateway is being prepared. You can pay at the reception desk.
                    </div>
                  )}
                </div>
              )}

              {/* Optional Skip Action */}
              {isSkippable && (
                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex justify-end">
                  {confirmSkipStepId === activeStep.id ? (
                    <div className="flex items-center gap-2 w-full justify-between bg-slate-50 dark:bg-zinc-950 p-2 rounded-xl border border-slate-200 dark:border-zinc-800">
                      <span className="text-[11px] font-medium text-slate-600 dark:text-zinc-400">
                        Skip this step?
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setConfirmSkipStepId(null)}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-zinc-400"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSkipStep(activeStep.id)}
                          disabled={isSkippingStep}
                          className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-xs"
                        >
                          {isSkippingStep ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                          Confirm Skip
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmSkipStepId(activeStep.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors py-1 px-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800"
                    >
                      <SkipForward className="w-3.5 h-3.5" />
                      Skip this step (Optional)
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Journey Progress Timeline (Multi-Step Execution Flow) ── */}
          {visitSteps.length > 0 && (
            <div className="bg-white dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-3xl p-5 shadow-[0_4px_20px_rgb(0,0,0,0.02)] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    Your Journey Itinerary
                  </h3>
                  <span className="text-[11px] text-slate-400 dark:text-zinc-500">
                    {completedStepsCount} of {totalSteps} stages completed
                  </span>
                </div>
                <span className="text-xs font-black font-mono text-indigo-600 dark:text-indigo-400">
                  {progressPercent}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Step List Timeline */}
              <div className="space-y-2 pt-1">
                {visitSteps.map((step: VisitStepItem, idx: number) => {
                  const isStepDone = step.status === 'DONE';
                  const isStepActive = step.status === 'ACTIVE' || step.status === 'UNLOCKED';
                  const isStepSkipped = step.status === 'SKIPPED';
                  const isOptional = step.templateStep?.isOptional;

                  return (
                    <div
                      key={step.id || idx}
                      className={`flex items-start gap-3 p-3 rounded-2xl transition-all border ${
                        isStepActive
                          ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/80 shadow-xs'
                          : isStepDone
                          ? 'bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-100/60 dark:border-emerald-900/30'
                          : isStepSkipped
                          ? 'bg-slate-50/60 dark:bg-zinc-900/40 border-slate-100 dark:border-zinc-800/60 opacity-60'
                          : 'bg-white dark:bg-zinc-900 border-slate-100 dark:border-zinc-800'
                      }`}
                    >
                      {/* Step Indicator */}
                      <div className="mt-0.5 shrink-0">
                        {isStepDone ? (
                          <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : isStepActive ? (
                          <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm ring-4 ring-indigo-500/20 animate-pulse">
                            {step.stepOrder}
                          </div>
                        ) : isStepSkipped ? (
                          <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-zinc-800 text-slate-500 flex items-center justify-center text-xs font-semibold line-through">
                            {step.stepOrder}
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full border border-slate-300 dark:border-zinc-700 text-slate-400 dark:text-zinc-500 flex items-center justify-center text-xs font-semibold">
                            {step.stepOrder}
                          </div>
                        )}
                      </div>

                      {/* Step Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p
                            className={`text-xs font-bold truncate ${
                              isStepActive
                                ? 'text-indigo-900 dark:text-indigo-200'
                                : isStepSkipped
                                ? 'line-through text-slate-400 dark:text-zinc-500'
                                : 'text-slate-800 dark:text-zinc-200'
                            }`}
                          >
                            {step.name}
                          </p>

                          <div className="flex items-center gap-1 shrink-0">
                            {isOptional && (
                              <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
                                Optional
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isStepActive
                                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300'
                                  : isStepDone
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                                  : isStepSkipped
                                  ? 'bg-slate-200 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400'
                                  : 'bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400'
                              }`}
                            >
                              {isStepActive
                                ? 'Active'
                                : isStepDone
                                ? 'Done'
                                : isStepSkipped
                                ? 'Skipped'
                                : 'Pending'}
                            </span>
                          </div>
                        </div>

                        {step.templateStep?.locationDescription && (
                          <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            {step.templateStep.locationDescription}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Payment & Tax Invoice Card ── */}
          {((data.token?.bookingPayments && data.token.bookingPayments.length > 0) ||
            data.token?.visitInvoice ||
            (service?.basePrice && service.basePrice > 0)) && (() => {
            const payments = data.token?.bookingPayments || [];
            const invoice = data.token?.visitInvoice;
            const latestPayment = payments[0];
            const isPaid = latestPayment?.status === 'SUCCEEDED' || invoice?.status === 'PAID';
            const amountCents = latestPayment?.amount ?? invoice?.total ?? service?.basePrice ?? 0;
            const currency = latestPayment?.currency || invoice?.currency || service?.priceCurrency || 'ZAR';

            const methodLabels: Record<string, string> = {
              CARD_TERMINAL: 'Card Machine (POS)',
              CASH: 'Cash at Counter',
              EFT: 'EFT / Bank Transfer',
              STRIPE: 'Online Card (Stripe)',
              OTHER: 'Counter Payment',
            };
            const methodLabel =
              methodLabels[latestPayment?.method] ||
              latestPayment?.method ||
              (isPaid ? 'Paid' : 'Pay at Counter');

            const handleDownloadPdf = () => {
              const invoiceNumber =
                invoice?.invoiceNumber ||
                `REC-${(displayId || 'Q').replace(/[^a-zA-Z0-9]/g, '')}-${(visitId || '001').substring(0, 4).toUpperCase()}`;
              const subtotal = invoice?.subtotal || Math.round(amountCents / 1.15);
              const totalTax = invoice?.totalTax || (amountCents - subtotal);
              const invoiceData = {
                id: invoice?.id || visitId || 'inv',
                invoiceNumber,
                status: isPaid ? 'PAID' : 'PENDING',
                createdAt: invoice?.createdAt || data.token?.createdAt || new Date().toISOString(),
                currency,
                subtotal,
                totalTax,
                total: amountCents,
                taxLines: invoice?.taxLines || [
                  { label: 'VAT (15%)', rate: 15, amount: totalTax },
                ],
                lineItemsSnap: invoice?.lineItemsSnap || [
                  { name: serviceName, qty: 1, unitPrice: amountCents },
                ],
                customer: {
                  name: customerName,
                },
                tenant: {
                  name: tenantName,
                },
              };
              const ok = downloadInvoicePdf(invoiceData);
              if (ok) {
                toast.success(`Tax Invoice / Receipt downloaded`);
              } else {
                toast.error('Could not generate PDF. Please ask reception.');
              }
            };

            return (
              <div className="bg-white dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-3xl p-5 shadow-[0_4px_20px_rgb(0,0,0,0.02)] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                        Payment & Tax Invoice
                      </h3>
                      <p className="text-[11px] font-mono text-slate-400 dark:text-zinc-500">
                        {invoice?.invoiceNumber || `Ref: ${displayId || 'Queue Ticket'}`}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                      isPaid
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                    }`}
                  >
                    {isPaid ? 'Paid' : 'Pay at Counter'}
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-zinc-900/60 rounded-2xl p-3.5 space-y-2 border border-slate-100 dark:border-zinc-800/80">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 dark:text-zinc-400">Base Services (1 person):</span>
                    <span className="font-medium text-slate-700 dark:text-zinc-300">
                      {formatMoney(Math.round(amountCents / 1.15), currency)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 dark:text-zinc-400">VAT (15% Included):</span>
                    <span className="font-medium text-slate-700 dark:text-zinc-300">
                      {formatMoney(amountCents - Math.round(amountCents / 1.15), currency)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 dark:text-zinc-400">Payment Method:</span>
                    <span className="font-medium text-slate-700 dark:text-zinc-300">
                      {methodLabel}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-200/60 dark:border-zinc-800 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">Total Amount:</span>
                    <span className="font-black text-sm text-emerald-600 dark:text-emerald-400 font-mono">
                      {formatMoney(amountCents, currency)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Tax Invoice / Receipt (PDF)
                </button>
              </div>
            );
          })()}

          {/* ── Post-Visit CSAT Feedback / Rating Section ── */}
          {isCompleted && (
            <div className="bg-gradient-to-b from-indigo-50/50 via-white to-white dark:from-zinc-900 dark:to-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm text-center space-y-4 animate-in zoom-in-95 duration-400">
              {savedRating || ratingSubmittedLocally ? (
                <div className="space-y-2 py-2">
                  <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center mx-auto">
                    <Star className="w-6 h-6 fill-amber-400" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Thank You for Your Feedback!
                  </h3>
                  <div className="flex justify-center gap-1 text-amber-400">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-5 h-5 ${
                          star <= (savedRating || rating)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-300 dark:text-zinc-700'
                        }`}
                      />
                    ))}
                  </div>
                  {(savedFeedbackText || feedbackText) && (
                    <p className="text-xs italic text-slate-600 dark:text-zinc-400 max-w-xs mx-auto bg-slate-50 dark:bg-zinc-900 p-3 rounded-xl border border-slate-100 dark:border-zinc-800">
                      &ldquo;{savedFeedbackText || feedbackText}&rdquo;
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      Rate Your Experience
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      How was your visit today?
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">
                      Your feedback helps {tenantName || 'us'} serve you better.
                    </p>
                  </div>

                  {/* 5-Star Rating Buttons */}
                  <div className="flex justify-center items-center gap-2 py-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 rounded-lg transition-transform hover:scale-125 active:scale-95 focus:outline-none"
                      >
                        <Star
                          className={`w-7 h-7 transition-colors ${
                            star <= (hoverRating || rating)
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-300 dark:text-zinc-700'
                          }`}
                        />
                      </button>
                    ))}
                  </div>

                  {rating > 0 && (
                    <div className="space-y-3 pt-1 animate-in fade-in duration-200">
                      <span className="text-xs font-semibold text-slate-600 dark:text-zinc-300 block">
                        {rating === 5 && '🌟 Outstanding!'}
                        {rating === 4 && '😊 Very Good!'}
                        {rating === 3 && '🙂 Good'}
                        {rating === 2 && '😐 Could Be Better'}
                        {rating === 1 && '🙁 Disappointed'}
                      </span>

                      <textarea
                        rows={2}
                        placeholder="Tell us what you loved or how we can improve (optional)..."
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      />

                      <button
                        onClick={handleSubmitRating}
                        disabled={isSubmittingRating}
                        className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {isSubmittingRating ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        Submit Feedback
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Location Details Footer Pill */}
          {locationName && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-xs text-slate-600 dark:text-zinc-400 font-medium truncate">
                {locationName}
              </span>
              {serviceName && (
                <>
                  <span className="text-slate-300 dark:text-zinc-700">·</span>
                  <Stethoscope className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-xs text-slate-600 dark:text-zinc-400 font-medium truncate">
                    {serviceName}
                  </span>
                </>
              )}
            </div>
          )}

          {/* ── Bottom Navigation & Actions ── */}
          <div className="mt-auto pt-6 pb-4 space-y-2.5">
            <Link
              href={`/customer/confirmation/${visitId || accessToken}`}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs tracking-wide transition-all shadow-md active:scale-[0.98]"
            >
              <QrCode className="w-4 h-4" />
              <span>Open Digital Pass & Receipt</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1 opacity-75" />
            </Link>

            {/* Manual Refresh Button */}
            <button
              onClick={triggerRefetch}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Tap to refresh live status
            </button>
          </div>
        </div>
      </main>

      {/* ── In-Place Digital Pass / QR Modal ── */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                {tenantName || 'Digital Pass'}
              </span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                Scan for Desk / Kiosk Check-In
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Present this code to the receptionist or scanner.
              </p>
            </div>

            {/* High Contrast QR Code Container */}
            <div className="bg-white p-5 rounded-2xl shadow-inner border border-slate-200 flex flex-col items-center justify-center">
              <QRCodeSVG
                value={
                  typeof window !== 'undefined'
                    ? `${window.location.origin}/customer/confirmation/${visitId || accessToken}`
                    : String(visitId || accessToken)
                }
                size={180}
                level="H"
                includeMargin={false}
              />
              <span className="mt-3 font-mono text-2xl font-black tracking-widest text-slate-950">
                {displayId || (data.id as string)?.substring(0, 8).toUpperCase() || 'PASS'}
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                {customerName} • {serviceName}
              </span>
            </div>

            <div className="space-y-2 pt-1">
              <Link
                href={`/customer/confirmation/${visitId || accessToken}`}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors shadow-sm"
              >
                <span>Open Full Pass & Confirmation</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-zinc-400 transition-colors"
              >
                Done / Close
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showCancelAppointmentConfirm}
        onClose={() => setShowCancelAppointmentConfirm(false)}
        onConfirm={handleCancelAppointment}
        title="Cancel Appointment"
        description="Are you sure you want to cancel this appointment? This action cannot be undone."
        confirmText="Yes, Cancel Appointment"
        variant="danger"
        isLoading={isCancellingAppointment}
      />
    </div>
  );
}
