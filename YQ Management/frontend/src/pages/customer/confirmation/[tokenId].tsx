import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { fetchApi, getBackendUrl } from '../../../lib/api';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import {
  CheckCircle2,
  ArrowRight,
  Users,
  MapPin,
  Calendar,
  CalendarPlus,
  Star,
  Receipt,
  Sparkles,
  RefreshCw,
  AlertCircle,
  XCircle,
  Share2,
  CreditCard,
  Check,
  Sun,
  Moon,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from '../../../components/ThemeProvider';
import { downloadInvoicePdf, InvoiceData } from '../../../lib/invoicePdf';
import { downloadIcsCalendar } from '../../../lib/calendarExport';
import { ConfirmModal } from '../../../components/modals/ConfirmModal';

export default function QueueConfirmation() {
  const router = useRouter();
  const { tokenId } = router.query;
  const { theme, toggleTheme } = useTheme();
  const socketRef = useRef<Socket | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // CSAT Rating state
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [isSubmittingRating, setIsSubmittingRating] = useState<boolean>(false);
  const [ratingSubmitted, setRatingSubmitted] = useState<boolean>(false);

  // Cancellation modal state
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Query visit status
  const {
    data: statusData,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['token', tokenId],
    queryFn: () => fetchApi(`/public-visit/${tokenId}`),
    enabled: !!tokenId,
    staleTime: 5000,
  });

  // Real-time socket sync
  useEffect(() => {
    if (!tokenId || !statusData) return;

    const backendUrl = getBackendUrl();
    const socket = io(backendUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    const visitId = statusData.token?.id || tokenId;
    const accessToken = statusData.token?.accessToken || tokenId;

    socket.on('connect', () => {
      socket.emit('subscribeToVisit', { visitId, accessToken });
    });

    const handleUpdate = () => {
      refetch();
    };

    socket.on('visit_created', handleUpdate);
    socket.on('visit_called', handleUpdate);
    socket.on('visit_completed', handleUpdate);
    socket.on('visit_missed', handleUpdate);
    socket.on('visit_cancelled', handleUpdate);
    socket.on('visit_checked_in', handleUpdate);
    socket.on('queue_status_changed', handleUpdate);
    socket.on('step_activated', handleUpdate);
    socket.on('visit_step_updated', handleUpdate);
    socket.on('visit_updated', handleUpdate);

    // Backup polling every 10 seconds
    pollingRef.current = setInterval(() => {
      refetch();
    }, 10000);

    return () => {
      socket.disconnect();
      socketRef.current = null;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenId, statusData?.token?.id, refetch]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-600/20 border-t-indigo-600 animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-500 dark:text-zinc-400">Loading your digital pass...</p>
      </div>
    );
  }

  if (!statusData || !statusData.token) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4 border border-rose-500/20">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Ticket Not Found</h1>
        <p className="text-slate-500 dark:text-zinc-400 text-sm max-w-sm mb-6">
          This digital ticket could not be found or has expired. Please check your link or re-scan the QR code at the desk.
        </p>
        <button
          onClick={() => router.push('/customer/lookup')}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
        >
          Look Up My Tickets
        </button>
      </div>
    );
  }

  const { token, position = 0, estimatedWaitTime = 0 } = statusData;
  const currentState = token.currentState || token.status || 'WAITING';

  // Strictly segregated state flags to avoid any overlapping UI states
  const isCancelled = ['CANCELLED', 'MISSED', 'NO_SHOW'].includes(currentState);
  const isCompleted = currentState === 'COMPLETED';
  const isInService = currentState === 'IN_SERVICE' || currentState === 'SERVING';
  const isScheduled =
    (currentState === 'SCHEDULED' || (!!token.scheduledTime && !token.actualArrival)) &&
    !isCancelled &&
    !isCompleted &&
    !isInService;
  const isWaiting = !isCompleted && !isInService && !isScheduled && !isCancelled;

  // Formatting strings
  const customerName = token.customerName || token.customer?.name || 'Guest';
  const displayId = token.displayId || token.id?.substring(0, 5).toUpperCase() || 'Q001';
  const serviceName = token.service?.name || 'General Service';
  const locationName = token.location?.name || '';
  const tenantName = token.tenant?.name || 'Qmova';
  const tenantLogo = token.tenant?.logoUrl;
  const cancellationReason = token.cancelReason || 'Cancelled by customer';

  // URLs
  let trackingUrl = '';
  if (typeof window !== 'undefined') {
    if (window.location.pathname.startsWith('/t/')) {
      const parts = window.location.pathname.split('/');
      const tenantId = parts[2];
      trackingUrl = `${window.location.origin}/t/${tenantId}/customer/status/${token.accessToken || token.id}`;
    } else {
      trackingUrl = `${window.location.origin}/customer/status/${token.accessToken || token.id}`;
    }
  }

  // Handle Share / Copy Link
  const handleShare = async () => {
    if (typeof window === 'undefined') return;
    const shareData = {
      title: `${tenantName} - Ticket #${displayId}`,
      text: `Track my live ticket #${displayId} at ${tenantName}`,
      url: trackingUrl || window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(shareData.url);
      toast.success('Pass link copied to clipboard!');
    }
  };

  // Handle Add to Calendar
  const handleAddToCalendar = () => {
    if (!token.scheduledTime) return;
    downloadIcsCalendar({
      title: `${serviceName} at ${tenantName}`,
      description: `Appointment reference #${displayId} for ${customerName}.\nService: ${serviceName}\nTrack live status: ${trackingUrl}`,
      location: locationName || tenantName,
      startDate: token.scheduledTime,
      durationMinutes: token.service?.expectedDuration || 30,
    });
    toast.success('Calendar event (.ics) downloaded!');
  };

  // Handle Cancel Appointment
  const handleCancelAppointment = async () => {
    setIsCancelling(true);
    try {
      const accessToken = token.accessToken || tokenId;
      await fetchApi(`/public-visit/${accessToken}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelReason: 'Cancelled by customer' }),
      });
      toast.success('Appointment cancelled successfully');
      setShowCancelConfirm(false);
      refetch();
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Failed to cancel appointment');
    } finally {
      setIsCancelling(false);
    }
  };

  // Handle CSAT Rating Submission
  const handleRatingSubmit = async () => {
    if (rating < 1 || !tokenId) return;
    setIsSubmittingRating(true);
    try {
      const accessToken = token.accessToken || tokenId;
      const baseUrl = getBackendUrl();
      const res = await fetch(`${baseUrl}/public-visit/${accessToken}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          feedbackText: feedbackText.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to submit rating');
      toast.success('Thank you for your rating!');
      setRatingSubmitted(true);
      refetch();
    } catch (e: unknown) {
      toast.error((e as Error)?.message || 'Failed to submit review');
    } finally {
      setIsSubmittingRating(false);
    }
  };

  // Handle Download Invoice / Receipt PDF
  const handleDownloadInvoice = () => {
    const invoice = token.visitInvoice;
    const payment = token.bookingPayments?.[0];
    const basePrice = token.service?.basePrice || 0;
    const totalAmount = invoice?.total ?? payment?.amount ?? basePrice;
    const currency = invoice?.currency || payment?.currency || token.service?.priceCurrency || 'ZAR';

    const invoiceObj: InvoiceData = {
      id: invoice?.id || 'inv_temp',
      invoiceNumber: invoice?.invoiceNumber || `REC-${displayId}`,
      status: invoice?.status || 'PAID',
      createdAt: invoice?.createdAt || token.completedAt || new Date().toISOString(),
      currency,
      subtotal: invoice?.subtotal || totalAmount,
      totalTax: invoice?.totalTax || 0,
      total: totalAmount,
      customer: {
        name: customerName,
      },
      tenant: {
        name: tenantName,
      },
      lineItemsSnap: invoice?.lineItemsSnap || [
        {
          name: serviceName,
          qty: 1,
          unitPrice: totalAmount,
        },
      ],
      notes: payment?.description || 'Thank you for your visit!',
    };

    const success = downloadInvoicePdf(invoiceObj);
    if (success) {
      toast.success('Receipt downloaded successfully!');
    } else {
      toast.error('Could not download receipt PDF.');
    }
  };

  const renderPaymentSummary = () => {
    const currency = (token.service?.priceCurrency || token.service?.currency || 'ZAR').toUpperCase();
    const currSymbol = currency === 'ZAR' ? 'R' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
    const basePriceCents = Number(token.service?.basePrice || 0);
    const guestsCount = 1 + (token.accompanyingGuests || 0);

    const invoice = token.visitInvoice;
    const succeededPayment = token.bookingPayments?.find((p: { status?: string }) => p.status === 'SUCCEEDED');
    const isPaid = !!succeededPayment || invoice?.status === 'PAID';

    const defaultTaxRate = currency === 'ZAR' ? 15 : currency === 'GBP' ? 20 : currency === 'EUR' ? 20 : currency === 'INR' ? 18 : 0;
    const taxRate = token.tenant?.taxConfig?.defaultTaxRatePercent !== undefined ? Number(token.tenant.taxConfig.defaultTaxRatePercent) : defaultTaxRate;
    const isTaxInclusive = token.tenant?.taxConfig?.taxInclusive !== undefined ? Boolean(token.tenant.taxConfig.taxInclusive) : (currency === 'ZAR');

    const rawSubtotalCents = basePriceCents * guestsCount;
    if (rawSubtotalCents <= 0 && !succeededPayment && !invoice) return null;

    let netSubtotalCents = rawSubtotalCents;
    let taxCents = 0;
    let totalCents = rawSubtotalCents;

    if (invoice) {
      totalCents = invoice.total ?? rawSubtotalCents;
      taxCents = invoice.totalTax ?? 0;
      netSubtotalCents = invoice.subtotal ?? (totalCents - taxCents);
    } else if (succeededPayment) {
      totalCents = succeededPayment.amount ?? rawSubtotalCents;
      if (taxRate > 0) {
        if (isTaxInclusive) {
          netSubtotalCents = Math.round(totalCents / (1 + taxRate / 100));
          taxCents = totalCents - netSubtotalCents;
        } else {
          taxCents = Math.round(totalCents * (taxRate / 100));
        }
      }
    } else if (taxRate > 0) {
      if (isTaxInclusive) {
        netSubtotalCents = Math.round(rawSubtotalCents / (1 + taxRate / 100));
        taxCents = rawSubtotalCents - netSubtotalCents;
        totalCents = rawSubtotalCents;
      } else {
        taxCents = Math.round(rawSubtotalCents * (taxRate / 100));
        totalCents = rawSubtotalCents + taxCents;
      }
    }

    const taxLabel = currency === 'ZAR'
      ? `VAT (${taxRate}%${isTaxInclusive ? ' Included' : ''})`
      : currency === 'INR'
      ? `GST (${taxRate}%${isTaxInclusive ? ' Included' : ''})`
      : `Tax / VAT (${taxRate}%${isTaxInclusive ? ' Included' : ''})`;

    return (
      <div className="bg-slate-50/80 dark:bg-zinc-950/60 border border-slate-200/80 dark:border-zinc-800/80 rounded-xl sm:rounded-2xl p-3.5 sm:p-4.5 mb-4 sm:mb-5 text-left text-xs space-y-2.5 sm:space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold uppercase tracking-wider text-[10px] sm:text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-indigo-500 shrink-0" /> Payment & Charges
          </span>
          {isPaid ? (
            <span className="px-2 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Paid Online
            </span>
          ) : (
            <span className="px-2 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Pay at Counter
            </span>
          )}
        </div>

        <div className="space-y-1.5 text-slate-600 dark:text-zinc-400">
          <div className="flex justify-between">
            <span className="truncate pr-2">Base Service ({guestsCount} {guestsCount > 1 ? 'people' : 'person'})</span>
            <span className="font-mono font-medium text-slate-900 dark:text-zinc-200 shrink-0">
              {currSymbol}{(netSubtotalCents / 100).toFixed(2)}
            </span>
          </div>
          {taxRate > 0 && (
            <div className="flex justify-between">
              <span className="truncate pr-2">{taxLabel}</span>
              <span className="font-mono font-medium text-slate-900 dark:text-zinc-200 shrink-0">
                {currSymbol}{(taxCents / 100).toFixed(2)}
              </span>
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-slate-200 dark:border-zinc-800 flex items-baseline justify-between">
          <div>
            <span className="font-bold text-slate-900 dark:text-white uppercase text-[10px] sm:text-[11px] tracking-wide block">
              Total Amount
            </span>
            <span className="text-[9px] sm:text-[10px] text-slate-400 dark:text-zinc-500">All applicable taxes included</span>
          </div>
          <span className="text-lg sm:text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            {currSymbol}{(totalCents / 100).toFixed(2)}
          </span>
        </div>

        <button
          onClick={handleDownloadInvoice}
          type="button"
          className="w-full mt-2 py-2 sm:py-2.5 px-3 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700/80 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
        >
          <Receipt className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <span className="truncate">Download Tax Invoice / Receipt (PDF)</span>
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 font-sans flex flex-col items-center justify-center p-3.5 xs:p-4 sm:p-6 pt-[max(env(safe-area-inset-top),0.75rem)] pb-[max(env(safe-area-inset-bottom),1.5rem)] relative overflow-x-hidden selection:bg-indigo-500/20 transition-colors">
      <Head>
        <title>
          {isCompleted
            ? `Visit Completed - Ticket #${displayId} | ${tenantName}`
            : isCancelled
            ? `Booking Cancelled - Ticket #${displayId} | ${tenantName}`
            : isInService
            ? `It's Your Turn! - Ticket #${displayId} | ${tenantName}`
            : `Ticket #${displayId} - ${tenantName} | Qmova`}
        </title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      {/* Atmospheric Ambient Glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full filter blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/10 dark:bg-emerald-600/15 rounded-full filter blur-[150px] pointer-events-none" />

      {/* Main Column */}
      <div className="w-full max-w-md z-10 flex flex-col my-auto py-3 sm:py-6">
        {/* Top Brand & Navigation Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-5 px-0.5 sm:px-1 gap-2">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            {tenantLogo ? (
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 shadow-xs relative bg-white shrink-0">
                <Image src={tenantLogo} alt={tenantName} fill className="object-cover" />
              </div>
            ) : (
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-indigo-600 text-white font-bold flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0 text-sm">
                {tenantName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-tight block leading-none truncate max-w-[130px] xs:max-w-[180px] sm:max-w-xs">
                {tenantName}
              </span>
              {locationName && (
                <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-zinc-400 font-medium flex items-center gap-1 mt-0.5 sm:mt-1 truncate max-w-[130px] xs:max-w-[180px] sm:max-w-xs">
                  <MapPin className="w-3 h-3 text-slate-400 dark:text-zinc-500 shrink-0" />
                  <span className="truncate">{locationName}</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] sm:text-[11px] font-bold tracking-wide">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden xs:inline">LIVE PASS</span>
              <span className="xs:hidden">LIVE</span>
            </div>
            <button
              onClick={toggleTheme}
              title="Toggle Light / Dark mode"
              className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 transition-colors shadow-xs"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
            </button>
            <button
              onClick={() => refetch()}
              title="Refresh status"
              className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 transition-colors shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-indigo-500' : ''}`} />
            </button>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* STATE 1: CANCELLED (Strictly Exclusive - Never overlaps)    */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {isCancelled && (
          <div className="text-center animate-in fade-in duration-300">
            <div className="w-14 h-14 sm:w-18 sm:h-18 mx-auto bg-rose-500/15 border border-rose-500/30 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-3.5 sm:mb-4 shadow-[0_0_30px_rgba(244,63,94,0.15)] ring-4 ring-rose-500/10">
              <XCircle className="w-7 h-7 sm:w-9 sm:h-9 text-rose-500" />
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mb-1 tracking-tight">
              Booking Cancelled
            </h1>
            <p className="text-slate-500 dark:text-zinc-400 text-xs max-w-xs mx-auto mb-4 sm:mb-5 leading-relaxed">
              Ticket <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">#{displayId}</span> has been closed.
            </p>

            <div className="bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl sm:rounded-3xl p-4 sm:p-5 mb-4 sm:mb-5 shadow-xl text-left backdrop-blur-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest block">
                    Ticket Reference
                  </span>
                  <span className="text-xl sm:text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
                    {displayId}
                  </span>
                </div>
                <span className="px-2.5 sm:px-3 py-1 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                  {currentState.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-zinc-400">Reason</span>
                  <span className="font-semibold text-slate-800 dark:text-zinc-200">{cancellationReason}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-zinc-400">Service</span>
                  <span className="font-medium text-slate-700 dark:text-zinc-300">{serviceName}</span>
                </div>
                {locationName && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-zinc-400">Location</span>
                    <span className="font-medium text-slate-700 dark:text-zinc-300">{locationName}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={() => router.push('/customer/lookup')}
                className="w-full py-3 sm:py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white rounded-xl sm:rounded-2xl font-bold transition-all shadow-md shadow-indigo-600/20 text-xs flex items-center justify-center gap-1.5"
              >
                <span>Find Other Active Tickets</span> <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => router.push('/')}
                className="w-full py-2.5 sm:py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-xl sm:rounded-2xl font-semibold transition-colors text-xs"
              >
                Book a New Appointment
              </button>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* STATE 2: COMPLETED                                          */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {isCompleted && (
          <div className="text-center animate-in fade-in duration-300">
            <div className="w-14 h-14 sm:w-18 sm:h-18 mx-auto bg-emerald-500/15 border border-emerald-500/30 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-3.5 sm:mb-4 shadow-[0_0_35px_rgba(16,185,129,0.2)] ring-4 ring-emerald-500/10">
              <CheckCircle2 className="w-7 h-7 sm:w-9 sm:h-9 text-emerald-500" />
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mb-1 tracking-tight">
              Visit Completed!
            </h1>
            <p className="text-slate-500 dark:text-zinc-400 text-xs max-w-xs mx-auto mb-4 sm:mb-5 leading-relaxed">
              Thank you for visiting <span className="font-semibold text-slate-800 dark:text-zinc-200">{tenantName}</span>, {customerName}.
            </p>

            <div className="bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl sm:rounded-3xl p-4 sm:p-5 mb-4 sm:mb-5 shadow-xl text-left backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3 mb-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest block">
                    Completed Ticket
                  </span>
                  <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                    {displayId}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <Check className="w-3.5 h-3.5" /> Fulfilled
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-zinc-800/80">
                  <span className="text-slate-500 dark:text-zinc-400">Service</span>
                  <span className="font-semibold text-slate-900 dark:text-white truncate pl-2">{serviceName}</span>
                </div>
                {token.completedAt && (
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-zinc-800/80">
                    <span className="text-slate-500 dark:text-zinc-400">Completed At</span>
                    <span className="font-medium text-slate-800 dark:text-zinc-200">
                      {new Date(token.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {renderPaymentSummary()}

            {/* CSAT Review Card */}
            <div className="bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xl text-left backdrop-blur-xl">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1 text-center">
                How was your experience?
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 text-center mb-3">
                Your feedback helps us continuously improve.
              </p>

              {ratingSubmitted || token.rating ? (
                <div className="text-center py-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl sm:rounded-2xl">
                  <div className="flex justify-center gap-1 mb-1.5 text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`w-4 h-4 sm:w-5 sm:h-5 ${s <= (token.rating || rating) ? 'fill-current' : 'opacity-20'}`} />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    Feedback received. Thank you!
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-center gap-1.5 sm:gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 hover:scale-125 transition-transform"
                      >
                        <Star
                          className={`w-6 h-6 sm:w-8 sm:h-8 transition-colors ${
                            star <= (hoverRating || rating)
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-300 dark:text-zinc-700'
                          }`}
                        />
                      </button>
                    ))}
                  </div>

                  {rating > 0 && (
                    <div className="space-y-2 animate-in fade-in">
                      <textarea
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        placeholder="Write any thoughts or compliments (optional)..."
                        rows={2}
                        className="w-full text-xs p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        onClick={handleRatingSubmit}
                        disabled={isSubmittingRating}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-colors shadow-sm disabled:opacity-50"
                      >
                        {isSubmittingRating ? 'Submitting...' : 'Send Review'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* STATE 3: IN SERVICE (Serving Right Now)                     */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {isInService && (
          <div className="text-center animate-in fade-in duration-300">
            <div className="w-14 h-14 sm:w-18 sm:h-18 mx-auto bg-emerald-500/15 border-2 border-emerald-500 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-3.5 sm:mb-4 shadow-[0_0_35px_rgba(16,185,129,0.3)] animate-bounce">
              <CheckCircle2 className="w-7 h-7 sm:w-9 sm:h-9 text-emerald-500" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-1 tracking-tight">
              It&apos;s Your Turn!
            </h1>
            <p className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs mb-4 sm:mb-5">
              Please proceed to the counter or consultation room now.
            </p>

            <div className="bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl sm:rounded-3xl p-4 sm:p-5 mb-4 sm:mb-5 shadow-xl text-left backdrop-blur-xl">
              <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest block mb-0.5">
                Calling Ticket
              </span>
              <span className="text-3xl sm:text-4xl font-black font-mono text-emerald-600 dark:text-emerald-400 block mb-3">
                {displayId}
              </span>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl sm:rounded-2xl flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs text-emerald-900 dark:text-emerald-200 font-medium">
                  Service <strong className="font-bold">{serviceName}</strong> is actively in progress.
                </span>
              </div>
            </div>

            <Link
              href={trackingUrl.replace(typeof window !== 'undefined' ? window.location.origin : '', '') || `/customer/status/${token.accessToken || token.id}`}
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 sm:py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl sm:rounded-2xl font-bold transition-all shadow-xl shadow-emerald-600/25 text-xs sm:text-sm"
            >
              <span>Open Live Journey Screen</span> <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* STATE 4: SCHEDULED APPOINTMENT                              */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {isScheduled && (
          <div className="text-center animate-in fade-in duration-300">
            <div className="w-14 h-14 sm:w-18 sm:h-18 mx-auto bg-indigo-500/15 border border-indigo-500/30 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-3.5 sm:mb-4 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
              <Calendar className="w-7 h-7 sm:w-9 sm:h-9 text-indigo-500" />
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mb-1 tracking-tight">
              Appointment Confirmed
            </h1>
            <p className="text-slate-500 dark:text-zinc-400 text-xs max-w-xs mx-auto mb-4 sm:mb-5 leading-relaxed">
              Hello <strong className="font-semibold text-slate-800 dark:text-zinc-200">{customerName}</strong>, your appointment with {tenantName} is booked.
            </p>

            {/* Primary Pass Card */}
            <div className="bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl sm:rounded-3xl p-4 sm:p-5 mb-4 shadow-xl text-left backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3 mb-3.5">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest block">
                    Booking Reference
                  </span>
                  <span className="text-2xl sm:text-3xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                    {displayId}
                  </span>
                </div>
                <span className="px-2.5 sm:px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Confirmed
                </span>
              </div>

              {/* Scheduled Date/Time Highlight */}
              {token.scheduledTime && (
                <div className="p-3 sm:p-3.5 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-xl sm:rounded-2xl mb-3.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block mb-0.5">
                    Date & Time
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-indigo-950 dark:text-indigo-200 block">
                    {new Date(token.scheduledTime).toLocaleString([], {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )}

              <div className="space-y-2 text-xs border-b border-slate-100 dark:border-zinc-800 pb-3 mb-3.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-zinc-400">Service</span>
                  <span className="font-semibold text-slate-900 dark:text-white truncate pl-2">{serviceName}</span>
                </div>
                {locationName && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-zinc-400">Location</span>
                    <span className="font-medium text-slate-800 dark:text-zinc-200 truncate pl-2">{locationName}</span>
                  </div>
                )}
              </div>

              {/* Digital QR Code */}
              <div className="flex flex-col items-center justify-center p-3 sm:p-3.5 bg-slate-50 dark:bg-zinc-950/80 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-zinc-800 text-center">
                <div className="p-2 sm:p-2.5 bg-white rounded-xl shadow-xs mb-2">
                  <QRCodeSVG value={trackingUrl || `https://qmova.com/customer/status/${token.accessToken || token.id}`} size={110} level="M" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                  Scan at Reception Kiosk Upon Arrival
                </span>
                <span className="text-[9px] sm:text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">
                  Fast automatic check-in pass
                </span>
              </div>
            </div>

            {renderPaymentSummary()}

            {/* Quick Action Grid */}
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mb-3">
              <button
                type="button"
                onClick={handleAddToCalendar}
                className="py-2.5 sm:py-3 px-2 sm:px-3 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-200 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <CalendarPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-500 shrink-0" />
                <span className="truncate">Add to Calendar</span>
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="py-2.5 sm:py-3 px-2 sm:px-3 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-200 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-500 shrink-0" />
                <span className="truncate">Share Pass</span>
              </button>
            </div>

            {/* Primary Action Button */}
            <Link
              href={trackingUrl.replace(typeof window !== 'undefined' ? window.location.origin : '', '') || `/customer/status/${token.accessToken || token.id}`}
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 sm:py-4 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white rounded-xl sm:rounded-2xl font-bold transition-all shadow-xl shadow-indigo-600/25 text-xs sm:text-sm mb-3"
            >
              <span>Open Live Journey & Waiting Room</span> <ArrowRight className="w-4 h-4" />
            </Link>

            {/* Cancel Appointment Trigger */}
            <button
              type="button"
              onClick={() => setShowCancelConfirm(true)}
              className="text-xs font-semibold text-slate-400 hover:text-rose-600 dark:text-zinc-500 dark:hover:text-rose-400 transition-colors py-1"
            >
              Need to cancel this appointment?
            </button>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* STATE 5: WAITING (Live Queue / Walk-in)                     */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {isWaiting && (
          <div className="text-center animate-in fade-in duration-300">
            <div className="w-14 h-14 sm:w-18 sm:h-18 mx-auto bg-indigo-500/15 border border-indigo-500/30 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-3.5 sm:mb-4 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
              <Users className="w-7 h-7 sm:w-9 sm:h-9 text-indigo-500" />
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mb-1 tracking-tight">
              You are in Queue!
            </h1>
            <p className="text-slate-500 dark:text-zinc-400 text-xs max-w-xs mx-auto mb-4 sm:mb-5 leading-relaxed">
              Ticket <strong className="font-mono text-indigo-600 dark:text-indigo-400">#{displayId}</strong> is active. We will notify you when it is your turn.
            </p>

            {/* Wait Status Grid */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3.5 sm:mb-4">
              <div className="bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-xl backdrop-blur-xl text-center">
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest block mb-0.5 sm:mb-1 truncate">
                  Queue Position
                </span>
                <span className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 font-mono block">
                  #{position || 1}
                </span>
                <span className="text-[9px] sm:text-[10px] text-slate-400 dark:text-zinc-500 truncate block">
                  {position <= 1 ? 'Next up!' : `${position - 1} ahead`}
                </span>
              </div>

              <div className="bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-xl backdrop-blur-xl text-center">
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest block mb-0.5 sm:mb-1 truncate">
                  Est. Wait Time
                </span>
                <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono block">
                  ~{estimatedWaitTime || 5}m
                </span>
                <span className="text-[9px] sm:text-[10px] text-slate-400 dark:text-zinc-500 truncate block">Live dynamic</span>
              </div>
            </div>

            {/* Pass Summary & QR Code */}
            <div className="bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl sm:rounded-3xl p-4 sm:p-5 mb-3.5 sm:mb-4 shadow-xl text-left backdrop-blur-xl">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs text-slate-500 dark:text-zinc-400">Service</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate pl-2">{serviceName}</span>
              </div>
              <div className="flex flex-col items-center justify-center p-3 bg-slate-50 dark:bg-zinc-950/80 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-zinc-800 text-center">
                <div className="p-2 sm:p-2.5 bg-white rounded-xl shadow-xs mb-2">
                  <QRCodeSVG value={trackingUrl || `https://qmova.com/customer/status/${token.accessToken || token.id}`} size={110} level="M" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                  Digital Check-in Pass
                </span>
              </div>
            </div>

            {renderPaymentSummary()}

            <Link
              href={trackingUrl.replace(typeof window !== 'undefined' ? window.location.origin : '', '') || `/customer/status/${token.accessToken || token.id}`}
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 sm:py-4 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white rounded-xl sm:rounded-2xl font-bold transition-all shadow-xl shadow-indigo-600/25 text-xs sm:text-sm mb-3"
            >
              <span>Open Live Waiting Room</span> <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              type="button"
              onClick={() => setShowCancelConfirm(true)}
              className="text-xs font-semibold text-slate-400 hover:text-rose-600 dark:text-zinc-500 dark:hover:text-rose-400 transition-colors py-1"
            >
              Leave Queue
            </button>
          </div>
        )}

        {/* Footer Navigation */}
        <div className="mt-6 sm:mt-8 pt-4 border-t border-slate-200/70 dark:border-zinc-800/70 flex items-center justify-between text-xs text-slate-400 dark:text-zinc-500">
          <Link href="/customer/lookup" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            Look up my tickets
          </Link>
          <span className="flex items-center gap-1 font-medium text-slate-500 dark:text-zinc-400">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" /> Powered by Qmova
          </span>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      <ConfirmModal
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={handleCancelAppointment}
        title="Cancel Appointment?"
        description="Are you sure you want to cancel this booking? This will release your time slot for other customers."
        confirmText="Yes, Cancel Booking"
        confirmButtonClass="bg-rose-600 hover:bg-rose-700 text-white"
        isLoading={isCancelling}
      />
    </div>
  );
}
