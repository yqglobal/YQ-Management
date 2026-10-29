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
  Clock,
  Users,
  MapPin,
  Calendar,
  Star,
  Download,
  Receipt,
  Sparkles,
  RefreshCw,
  AlertCircle,
  XCircle,
  Share2,
  Printer,
  ExternalLink,
  Building,
  CreditCard,
  Send,
  Check,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';
import { downloadInvoicePdf, formatMoney, InvoiceData } from '../../../lib/invoicePdf';

export default function QueueConfirmation() {
  const router = useRouter();
  const { tokenId } = router.query;
  const socketRef = useRef<Socket | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // CSAT Rating state
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [isSubmittingRating, setIsSubmittingRating] = useState<boolean>(false);
  const [ratingSubmitted, setRatingSubmitted] = useState<boolean>(false);

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

    // Backup polling every 12 seconds
    pollingRef.current = setInterval(() => {
      refetch();
    }, 12000);

    return () => {
      socket.disconnect();
      socketRef.current = null;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [tokenId, statusData?.token?.id, refetch]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-600/20 border-t-indigo-600 animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">Loading your digital pass...</p>
      </div>
    );
  }

  if (!statusData || !statusData.token) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white flex flex-col items-center justify-center p-6 text-center">
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

  const isCompleted = currentState === 'COMPLETED';
  const isInService = currentState === 'IN_SERVICE';
  const isScheduled = currentState === 'SCHEDULED' || (!!token.scheduledTime && !token.actualArrival);
  const isCancelled = ['CANCELLED', 'MISSED', 'NO_SHOW'].includes(currentState);
  const isWaiting = !isCompleted && !isInService && !isScheduled && !isCancelled;

  // Formatting strings
  const customerName = token.customerName || token.customer?.name || 'Guest';
  const displayId = token.displayId || token.id?.substring(0, 5).toUpperCase() || 'Q001';
  const serviceName = token.service?.name || 'General Service';
  const locationName = token.location?.name || '';
  const tenantName = token.tenant?.name || 'Qmova';

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
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      await navigator.clipboard.writeText(shareData.url);
      toast.success('Live pass link copied to clipboard!');
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
    } catch (e: any) {
      toast.error(e.message || 'Failed to submit review');
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
    const succeededPayment = token.bookingPayments?.find((p: any) => p.status === 'SUCCEEDED');
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
      <div className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-5 mb-5 shadow-2xl text-left space-y-3">
        <div className="flex items-center justify-between pb-2.5 border-b border-white/5">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5 text-indigo-400" />
            Payment & Taxes
          </span>
          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border ${
            isPaid
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}>
            {isPaid ? (
              <>
                <Check className="w-3 h-3" /> Paid Online
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> Pay at Counter
              </>
            )}
          </span>
        </div>

        <div className="space-y-1.5 text-xs text-zinc-300">
          <div className="flex justify-between">
            <span className="text-zinc-400">Base Services ({guestsCount} {guestsCount === 1 ? 'person' : 'guests'})</span>
            <span className="font-mono font-semibold text-white">
              {currSymbol}{(netSubtotalCents / 100).toFixed(2)}
            </span>
          </div>
          {token.accompanyingGuests > 0 && (
            <div className="flex justify-between text-zinc-400 text-[11px]">
              <span>Accompanying Guests</span>
              <span>+{token.accompanyingGuests} guest{token.accompanyingGuests > 1 ? 's' : ''}</span>
            </div>
          )}
          {taxRate > 0 && (
            <div className="flex justify-between">
              <span className="text-zinc-400">{taxLabel}</span>
              <span className="font-mono font-semibold text-zinc-200">
                {currSymbol}{(taxCents / 100).toFixed(2)}
              </span>
            </div>
          )}
        </div>

        <div className="pt-2.5 border-t border-white/5 flex justify-between items-baseline">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-white block">Total Amount</span>
            <span className="text-[10px] text-zinc-400">
              {isTaxInclusive ? 'All applicable taxes included' : 'Total payable'}
            </span>
          </div>
          <span className="text-2xl font-black font-mono text-emerald-400">
            {currSymbol}{(totalCents / 100).toFixed(2)}
          </span>
        </div>

        {(token.visitInvoice || (token.bookingPayments && token.bookingPayments.length > 0)) && (
          <div className="pt-2 border-t border-white/5">
            <button
              onClick={handleDownloadInvoice}
              className="w-full py-2 px-3 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              Download Tax Invoice / Receipt (PDF)
            </button>
          </div>
        )}
      </div>
    );
  };

  // Completion duration calculation
  const durationMins =
    token.serviceStart && token.completedAt
      ? Math.max(
          1,
          Math.round(
            (new Date(token.completedAt).getTime() - new Date(token.serviceStart).getTime()) / 60000,
          ),
        )
      : null;

  const existingRating = token.rating;
  const existingFeedback = token.feedbackText;

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-x-hidden selection:bg-indigo-500/20">
      <Head>
        <title>
          {isCompleted
            ? `Visit Completed - Ticket #${displayId} | ${tenantName}`
            : isInService
            ? `It's Your Turn! - Ticket #${displayId} | ${tenantName}`
            : `Ticket #${displayId} - ${tenantName} | Qmova`}
        </title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      {/* Dynamic Background Atmospheric Glows */}
      {isCompleted ? (
        <>
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full mix-blend-screen filter blur-[150px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-amber-500/10 rounded-full mix-blend-screen filter blur-[150px] pointer-events-none" />
        </>
      ) : isInService ? (
        <>
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/20 rounded-full mix-blend-screen filter blur-[140px] pointer-events-none animate-pulse" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-teal-500/20 rounded-full mix-blend-screen filter blur-[140px] pointer-events-none" />
        </>
      ) : isCancelled ? (
        <>
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-rose-500/15 rounded-full mix-blend-screen filter blur-[150px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-slate-700/20 rounded-full mix-blend-screen filter blur-[150px] pointer-events-none" />
        </>
      ) : (
        <>
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-600/15 rounded-full mix-blend-screen filter blur-[150px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/20 rounded-full mix-blend-screen filter blur-[150px] pointer-events-none" />
        </>
      )}

      {/* Main Container */}
      <div className="w-full max-w-md z-10 flex flex-col my-auto py-6">
        {/* Top Brand Bar */}
        <div className="flex items-center justify-between mb-6 px-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Building className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white tracking-wide block leading-none">
                {tenantName}
              </span>
              {locationName && (
                <span className="text-[11px] text-zinc-400 font-medium flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-zinc-500" />
                  {locationName}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              LIVE PASS
            </div>
            <button
              onClick={() => refetch()}
              title="Refresh status"
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* ─── STATE 1: COMPLETED ─── */}
        {isCompleted && (
          <div className="text-center animate-in fade-in zoom-in-95 duration-400">
            {/* Header Badge */}
            <div className="w-20 h-20 mx-auto bg-emerald-500/20 border border-emerald-500/30 rounded-3xl flex items-center justify-center mb-5 shadow-[0_0_35px_rgba(16,185,129,0.25)] ring-4 ring-emerald-500/10">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>

            <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">
              Visit Completed!
            </h1>
            <p className="text-zinc-400 text-sm max-w-xs mx-auto mb-6 leading-relaxed">
              Thank you for visiting <span className="font-semibold text-zinc-200">{tenantName}</span>,{' '}
              {customerName}. We hope you had a great experience!
            </p>

            {/* Completed Summary Card */}
            <div className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 mb-5 shadow-2xl text-left">
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                <div>
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block">
                    Completed Ticket
                  </span>
                  <span className="text-3xl font-black font-mono text-emerald-400">
                    {displayId}
                  </span>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Check className="w-3.5 h-3.5" />
                    Completed
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-white/5">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    Service Fulfilled
                  </span>
                  <span className="font-semibold text-white">{serviceName}</span>
                </div>

                {token.completedAt && (
                  <div className="flex items-center justify-between py-1 border-b border-white/5">
                    <span className="text-zinc-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      Completed At
                    </span>
                    <span className="font-medium text-zinc-300">
                      {new Date(token.completedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}

                {durationMins && (
                  <div className="flex items-center justify-between py-1 border-b border-white/5">
                    <span className="text-zinc-400">Service Duration</span>
                    <span className="font-medium text-zinc-300">~{durationMins} minutes</span>
                  </div>
                )}
              </div>

              {/* Invoice Download if present */}
              {(token.visitInvoice || (token.bookingPayments && token.bookingPayments.length > 0)) && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <button
                    onClick={handleDownloadInvoice}
                    className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 group"
                  >
                    <Receipt className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                    Download Receipt & Tax Invoice (PDF)
                    <Download className="w-3.5 h-3.5 text-zinc-400 ml-auto" />
                  </button>
                </div>
              )}
            </div>

            {/* Interactive CSAT Star Review Card */}
            <div className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 mb-6 shadow-2xl">
              {existingRating || ratingSubmitted ? (
                <div className="space-y-3 py-1">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                    <Star className="w-6 h-6 fill-amber-400" />
                  </div>
                  <h3 className="text-base font-bold text-white">Thank You for Your Feedback!</h3>
                  <div className="flex justify-center gap-1.5 text-amber-400 py-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-6 h-6 ${
                          s <= (existingRating || rating)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-zinc-700'
                        }`}
                      />
                    ))}
                  </div>
                  {(existingFeedback || feedbackText) && (
                    <p className="text-xs italic text-zinc-300 max-w-xs mx-auto bg-white/5 p-3 rounded-2xl border border-white/5">
                      “{existingFeedback || feedbackText}”
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest block">
                      Rate Your Experience
                    </span>
                    <h3 className="text-lg font-bold text-white">How was your visit today?</h3>
                    <p className="text-xs text-zinc-400">
                      Your feedback helps {tenantName} maintain excellence.
                    </p>
                  </div>

                  <div className="flex justify-center items-center gap-2 py-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 rounded-xl transition-all hover:scale-125 active:scale-95 focus:outline-none"
                      >
                        <Star
                          className={`w-8 h-8 transition-colors ${
                            star <= (hoverRating || rating)
                              ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]'
                              : 'text-zinc-700 hover:text-zinc-500'
                          }`}
                        />
                      </button>
                    ))}
                  </div>

                  {rating > 0 && (
                    <div className="space-y-3 pt-1 animate-in fade-in duration-200">
                      <span className="text-xs font-semibold text-zinc-300 block">
                        {rating === 5 && '🌟 Outstanding Service!'}
                        {rating === 4 && '😊 Very Good Experience'}
                        {rating === 3 && '🙂 Satisfactory'}
                        {rating === 2 && '😐 Could Be Better'}
                        {rating === 1 && '🙁 Disappointed'}
                      </span>
                      <textarea
                        rows={2}
                        placeholder="Tell us what you loved or how we can improve (optional)..."
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        className="w-full text-xs p-3 rounded-2xl border border-white/10 bg-black/40 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      />
                      <button
                        onClick={handleRatingSubmit}
                        disabled={isSubmittingRating}
                        className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isSubmittingRating ? (
                          <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        Submit Rating
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="space-y-3">
              <Link
                href={trackingUrl.replace(typeof window !== 'undefined' ? window.location.origin : '', '') || `/customer/status/${token.accessToken || token.id}`}
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl text-xs font-bold transition-all border border-white/10 shadow-sm"
              >
                View Full Visit History & Itinerary
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* ─── STATE 2: IN SERVICE (CALLED) ─── */}
        {isInService && (
          <div className="text-center animate-in fade-in zoom-in-95 duration-400">
            <div className="w-20 h-20 mx-auto bg-emerald-500/20 border-2 border-emerald-500 rounded-3xl flex items-center justify-center mb-5 shadow-[0_0_40px_rgba(16,185,129,0.4)] animate-bounce">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>

            <div className="inline-block px-3.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-extrabold uppercase tracking-widest mb-2 animate-pulse">
              ● IT'S YOUR TURN NOW
            </div>

            <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">
              Please Proceed to Counter!
            </h1>
            <p className="text-zinc-400 text-sm max-w-xs mx-auto mb-6">
              Hello <span className="text-white font-semibold">{customerName}</span>, your ticket is
              being called.
            </p>

            <div className="bg-zinc-900/80 backdrop-blur-xl border-2 border-emerald-500/50 rounded-3xl p-6 mb-6 shadow-2xl">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block mb-1">
                Your Token
              </span>
              <span className="text-6xl font-black font-mono text-emerald-400 tracking-tight block mb-4">
                {displayId}
              </span>
              <div className="bg-white/5 rounded-2xl p-3.5 border border-white/5 text-xs text-zinc-300">
                <span className="font-bold text-white block mb-0.5">{serviceName}</span>
                {locationName && <span>{locationName}</span>}
              </div>
            </div>

            <Link
              href={trackingUrl.replace(typeof window !== 'undefined' ? window.location.origin : '', '') || `/customer/status/${token.accessToken || token.id}`}
              className="w-full inline-flex items-center justify-center gap-2 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold transition-all shadow-xl shadow-emerald-600/30 text-sm"
            >
              Open Live Journey Guide <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        )}

        {/* ─── STATE 3: WAITING / IN LINE ─── */}
        {isWaiting && (
          <div className="text-center animate-in fade-in duration-300">
            <div className="w-20 h-20 mx-auto bg-emerald-500/20 border border-emerald-500/30 rounded-3xl flex items-center justify-center mb-5 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>

            <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">
              You're in line!
            </h1>
            <p className="text-zinc-400 mb-6 text-sm">
              Hello <span className="text-white font-semibold">{customerName}</span>, your position is secured.
            </p>

            {/* Token Badge Card */}
            <div className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 mb-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                  Your Token
                </span>
                <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20 truncate max-w-[180px]">
                  {serviceName}
                </span>
              </div>

              <div className="text-5xl font-black text-indigo-400 mb-6 font-mono tracking-tight">
                {displayId}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-black/50 rounded-2xl p-4 border border-white/5 text-left">
                  <div className="text-[11px] text-zinc-400 mb-1 font-bold flex items-center gap-1 uppercase tracking-wider">
                    <Users className="w-3.5 h-3.5 text-indigo-400" />
                    Position
                  </div>
                  <div className="text-2xl font-black text-white">
                    {position === 1 ? 'Next' : position > 1 ? `#${position}` : '#1'}
                  </div>
                  <span className="text-[10px] text-zinc-500 mt-0.5 block">
                    {position <= 1 ? "You're up next!" : `${position - 1} ahead of you`}
                  </span>
                </div>

                <div className="bg-black/50 rounded-2xl p-4 border border-white/5 text-left">
                  <div className="text-[11px] text-zinc-400 mb-1 font-bold flex items-center gap-1 uppercase tracking-wider">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    Est. Wait
                  </div>
                  <div className="text-2xl font-black text-white">
                    ~{estimatedWaitTime || 5}
                    <span className="text-xs font-medium text-zinc-400 ml-1">min</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 mt-0.5 block">
                    Live dynamic ETA
                  </span>
                </div>
              </div>

              {/* QR Code Container */}
              <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-zinc-200 mb-3 shadow-inner">
                <QRCodeSVG
                  value={trackingUrl || window.location.href}
                  size={150}
                  level="H"
                  includeMargin={false}
                />
              </div>
              <p className="text-[11px] text-zinc-400">
                Scan to track your live status on your mobile device
              </p>
            </div>

            {renderPaymentSummary()}

            {/* CTAs */}
            <div className="space-y-3">
              <Link
                href={trackingUrl.replace(typeof window !== 'undefined' ? window.location.origin : '', '') || `/customer/status/${token.accessToken || token.id}`}
                className="w-full inline-flex items-center justify-center gap-2 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold transition-all shadow-xl shadow-indigo-600/30 text-sm"
              >
                Track Live Status & Stages <ArrowRight className="w-5 h-5" />
              </Link>

              <div className="flex gap-2">
                <button
                  onClick={handleShare}
                  className="flex-1 py-3 px-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Share Link
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-3 px-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Pass
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── STATE 4: SCHEDULED APPOINTMENT ─── */}
        {isScheduled && (
          <div className="text-center animate-in fade-in duration-300">
            <div className="w-20 h-20 mx-auto bg-purple-500/20 border border-purple-500/30 rounded-3xl flex items-center justify-center mb-5 shadow-[0_0_30px_rgba(168,85,247,0.2)]">
              <Calendar className="w-10 h-10 text-purple-400" />
            </div>

            <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">
              Appointment Confirmed
            </h1>
            <p className="text-zinc-400 text-sm max-w-xs mx-auto mb-6">
              Hello <span className="text-white font-semibold">{customerName}</span>, your booking with {tenantName} is confirmed.
            </p>

            <div className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 mb-6 shadow-2xl text-left">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block mb-1">
                Booking Reference
              </span>
              <span className="text-4xl font-black font-mono text-purple-400 block mb-4">
                {displayId}
              </span>

              <div className="space-y-3 border-t border-white/5 pt-4 text-xs">
                {token.scheduledTime && (
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Scheduled Date & Time</span>
                    <span className="font-bold text-white">
                      {new Date(token.scheduledTime).toLocaleString([], {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Service</span>
                  <span className="font-semibold text-white">{serviceName}</span>
                </div>
                {locationName && (
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Location</span>
                    <span className="font-medium text-zinc-300">{locationName}</span>
                  </div>
                )}
              </div>
            </div>

            {renderPaymentSummary()}

            <Link
              href={trackingUrl.replace(typeof window !== 'undefined' ? window.location.origin : '', '') || `/customer/status/${token.accessToken || token.id}`}
              className="w-full inline-flex items-center justify-center gap-2 py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-bold transition-all shadow-xl shadow-purple-600/30 text-sm"
            >
              Open Live Appointment Details <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        )}

        {/* ─── STATE 5: CANCELLED / NO SHOW ─── */}
        {isCancelled && (
          <div className="text-center animate-in fade-in duration-300">
            <div className="w-20 h-20 mx-auto bg-rose-500/20 border border-rose-500/30 rounded-3xl flex items-center justify-center mb-5 shadow-[0_0_30px_rgba(244,63,94,0.2)]">
              <XCircle className="w-10 h-10 text-rose-400" />
            </div>

            <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">
              Visit Ended
            </h1>
            <p className="text-zinc-400 text-sm max-w-xs mx-auto mb-6">
              This ticket #{displayId} was closed with status{' '}
              <span className="font-semibold text-white">{currentState.replace('_', ' ')}</span>.
            </p>

            <div className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 mb-6 shadow-2xl text-left">
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                If you still require assistance, please feel free to join the queue again or speak with the reception staff at {tenantName}.
              </p>
              <button
                onClick={() => router.push('/customer/lookup')}
                className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-bold transition-all"
              >
                Find Other Active Tickets
              </button>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="text-center mt-6">
          <p className="text-[11px] text-zinc-400 tracking-wide">
            Powered by <span className="font-semibold text-zinc-300">Qmova</span> • Real-Time Queue & Service Orchestration
          </p>
        </div>
      </div>
    </div>
  );
}
