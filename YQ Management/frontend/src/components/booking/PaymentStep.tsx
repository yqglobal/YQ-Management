import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { fetchApi } from '../../lib/api';
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  ShieldCheck,
  Lock,
} from 'lucide-react';

const FALLBACK_STRIPE_PK =
  'pk_live_51TncmkIdVVmQLEG3kmpaJE7ROAPd9XcW94BzXuJoLlEjuGCMVflLVSw3chR4GL3IlI9Wnq2WkQKtkVrhxGRSB8mA00G5T3CIYn';

const getCurrencyMinStripeCents = (curr: string): number => {
  const c = (curr || 'USD').toUpperCase();
  if (c === 'ZAR') return 800; // R 8.00 minimum for Stripe card processing
  if (['USD', 'EUR', 'CAD', 'AUD', 'SGD', 'NZD'].includes(c)) return 50; // 0.50
  if (c === 'GBP') return 30; // £0.30
  if (c === 'JPY') return 50; // ¥50
  return 50;
};

const getCurrencySymbol = (curr: string): string => {
  const c = (curr || 'USD').toUpperCase();
  if (c === 'ZAR') return 'R';
  if (c === 'EUR') return '€';
  if (c === 'GBP') return '£';
  if (c === 'JPY') return '¥';
  return '$';
};

interface PaymentStepProps {
  tenantId: string;
  amount: number;
  currency: string;
  stripeAccountId?: string;
  onSuccess: (paymentId: string) => void;
  onBack?: () => void;
  primaryColor: string;
  visitId?: string;
  visitStepId?: string;
  onSkip?: () => void;
}

const CheckoutForm = ({
  onSuccess,
  onBack,
  onSkip,
  primaryColor,
  paymentId,
  amount,
  currency,
}: {
  onSuccess: (paymentId: string) => void;
  onBack?: () => void;
  onSkip?: () => void;
  primaryColor: string;
  paymentId: string;
  amount: number;
  currency: string;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [isElementReady, setIsElementReady] = useState(false);
  const [elementLoadError, setElementLoadError] = useState<string | null>(null);

  // Safety fallback: if Stripe loads but onReady event is delayed or suppressed, reveal inputs after 3.5s
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsElementReady(true);
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  const currSymbol = getCurrencySymbol(currency);
  const formattedAmount = `${currSymbol}${(amount / 100).toFixed(2)}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setError(null);
    setProcessing(true);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message || 'Please check your card details and try again.');
      setProcessing(false);
      return;
    }

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
      redirect: 'if_required',
    });

    if (confirmError) {
      setError(confirmError.message || 'Payment failed. Please verify your card details or pay at the counter.');
      setProcessing(false);
    } else {
      try {
        await fetchApi(`/tenant-payments/public/payment/${paymentId}/complete`, {
          method: 'POST',
          body: JSON.stringify({ method: 'CARD' }),
        });
        onSuccess(paymentId);
      } catch (err: any) {
        setError(err.message || 'Payment confirmed by Stripe, but status sync took longer than expected.');
        setProcessing(false);
      }
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 flex-1 w-full max-w-lg mx-auto bg-white dark:bg-zinc-900 border border-gray-200/90 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xl shadow-black/5 dark:shadow-black/30"
    >
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold tracking-wide mb-1">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>256-Bit SSL Encrypted Checkout</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          Secure Payment
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400">
          Enter your card details to instantly confirm your booking
        </p>
      </div>

      {/* Amount Due Card */}
      <div className="bg-gray-50 dark:bg-zinc-950 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-zinc-800/90 flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Amount Due</p>
          <p className="text-xs text-gray-600 dark:text-zinc-400 flex items-center gap-1">
            <CreditCard className="w-3.5 h-3.5 text-gray-400" />
            Credit / Debit / Digital Wallets
          </p>
        </div>
        <div className="text-right">
          <span className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white font-mono tracking-tight">
            {formattedAmount}
          </span>
        </div>
      </div>

      {/* Payment Element Container with Skeleton Overlay */}
      <div className="space-y-3">
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-zinc-300">
          Card or Payment Method
        </label>

        <div className="relative min-h-[160px]">
          {!isElementReady && !elementLoadError && (
            <div className="absolute inset-0 z-10 bg-white dark:bg-zinc-900 space-y-3 py-1 pointer-events-none">
              <div className="h-11 bg-gray-100 dark:bg-zinc-800 rounded-xl w-full flex items-center justify-center text-xs font-medium text-gray-400 gap-2 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin" />
                Initializing secure card inputs...
              </div>
              <div className="h-12 bg-gray-100 dark:bg-zinc-800 rounded-xl w-full animate-pulse" />
              <div className="grid grid-cols-2 gap-3 animate-pulse">
                <div className="h-12 bg-gray-100 dark:bg-zinc-800 rounded-xl" />
                <div className="h-12 bg-gray-100 dark:bg-zinc-800 rounded-xl" />
              </div>
            </div>
          )}

          {elementLoadError && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 text-xs space-y-2 mb-3">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                {elementLoadError}
              </p>
              <p className="text-[11px] opacity-90">
                You can confirm your booking right now and pay in person at the counter.
              </p>
            </div>
          )}

          <div className={!isElementReady ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'}>
            <PaymentElement
              onReady={() => setIsElementReady(true)}
              onLoadError={(err) => {
                console.error('PaymentElement failed to load:', err);
                setElementLoadError('Card processor unavailable. Please choose pay at counter.');
              }}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 text-xs font-medium flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Buttons */}
      <div className="space-y-3 pt-2">
        <div className="flex gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              disabled={processing}
              className="px-5 py-4 rounded-xl font-bold text-gray-700 dark:text-zinc-300 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors text-sm"
            >
              Back
            </button>
          )}
          <button
            type="submit"
            disabled={!stripe || !elements || !isElementReady || processing}
            className="flex-1 py-4 rounded-xl font-bold text-white shadow-lg transition-transform hover:scale-[1.01] active:scale-98 flex justify-center items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: primaryColor }}
          >
            {processing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Processing Payment...</span>
              </>
            ) : !isElementReady ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Loading Details...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Pay Now • {formattedAmount}</span>
              </>
            )}
          </button>
        </div>

        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            disabled={processing}
            className="w-full py-3.5 rounded-xl font-semibold text-xs sm:text-sm text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white bg-transparent hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1.5"
          >
            Skip & Pay Later at Counter (Cash or Card)
          </button>
        )}
      </div>

      {/* Trust & Compliance Footer */}
      <div className="pt-4 border-t border-gray-100 dark:border-zinc-800/80 text-center space-y-2">
        <div className="flex items-center justify-center gap-3 text-gray-400 dark:text-zinc-500 text-[11px] font-medium">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> PCI-DSS Level 1
          </span>
          <span>•</span>
          <span>Stripe Direct Connect</span>
          <span>•</span>
          <span>Refundable Terms</span>
        </div>
      </div>
    </form>
  );
};

export function PaymentStep({ tenantId, amount, currency, stripeAccountId, onSuccess, onBack, onSkip, primaryColor, visitId, visitStepId }: PaymentStepProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<any>(null);
  const [intentError, setIntentError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [confirmingCounter, setConfirmingCounter] = useState(false);

  const minRequiredCents = getCurrencyMinStripeCents(currency);
  const currSymbol = getCurrencySymbol(currency);
  const isUnderLimit = amount < minRequiredCents || Boolean(
    intentError && (
      intentError.toLowerCase().includes('below') ||
      intentError.toLowerCase().includes('minimum') ||
      intentError.toLowerCase().includes('threshold') ||
      intentError.toLowerCase().includes('limit')
    )
  );

  const handlePayAtCounter = async () => {
    setConfirmingCounter(true);
    try {
      if (visitId) {
        await fetchApi('/public-visit/confirm-counter-payment', {
          method: 'POST',
          body: JSON.stringify({ visitIds: [visitId] })
        });
      }
      if (onSkip) {
        onSkip();
      } else {
        onSuccess('COUNTER_PAY');
      }
    } catch (err) {
      console.warn('Confirm counter payment fallback warning:', err);
      if (onSkip) {
        onSkip();
      } else {
        onSuccess('COUNTER_PAY');
      }
    } finally {
      setConfirmingCounter(false);
    }
  };

  useEffect(() => {
    // Only load if we have an account ID
    if (!stripeAccountId) {
      setIntentError('Online card payment is currently unavailable. Please complete your booking and pay in person at the counter.');
      return;
    }
    
    // Platform publishable key with live fallback
    const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || FALLBACK_STRIPE_PK;
    setStripePromise(loadStripe(pk, { stripeAccount: stripeAccountId }));
  }, [stripeAccountId]);

  const getSecret = async () => {
    setIntentError(null);
    setIsRetrying(true);
    try {
      const res = await fetchApi('/tenant-payments/public/intent', {
        method: 'POST',
        body: JSON.stringify({ tenantId, amount, description: 'Booking Prepayment', visitId, visitStepId })
      });
      setClientSecret(res.clientSecret);
      setPaymentId(res.paymentId);
      if (res.publishableKey) {
        setStripePromise(loadStripe(res.publishableKey, { stripeAccount: stripeAccountId }));
      }
    } catch (err: any) {
      console.error("Failed to create payment intent", err);
      setIntentError(err.message || 'Unable to initialize secure payment session.');
    } finally {
      setIsRetrying(false);
    }
  };

  useEffect(() => {
    if (tenantId && amount > 0 && stripeAccountId) {
      if (amount < minRequiredCents) {
        return;
      }
      getSecret();
    }
  }, [tenantId, amount, stripeAccountId, visitId, visitStepId, minRequiredCents]);

  // Seamless fallback to Pay at Counter if amount is below minimum processing limit
  if (isUnderLimit) {
    return (
      <div className="w-full max-w-lg mx-auto bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 text-center space-y-6 shadow-sm">
        <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
          <CreditCard className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Pay at Counter
          </h2>
          <p className="text-sm text-gray-600 dark:text-zinc-400 leading-relaxed max-w-sm mx-auto">
            Online card checkout is available for amounts of{' '}
            <span className="font-semibold text-gray-800 dark:text-zinc-200">
              {currSymbol}{(minRequiredCents / 100).toFixed(2)}
            </span>{' '}
            or higher. You can pay your balance upon arrival.
          </p>
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700/60 mt-4 text-left flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-zinc-400 font-semibold">Total Due Upon Arrival</p>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">Pay at service counter (Cash or Card)</p>
            </div>
            <div className="text-right">
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                {currSymbol}{(amount / 100).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={handlePayAtCounter}
            disabled={confirmingCounter}
            className="w-full py-4 rounded-xl font-bold text-white shadow-lg transition-transform hover:scale-[1.01] active:scale-98 flex items-center justify-center gap-2"
            style={{ backgroundColor: primaryColor }}
          >
            {confirmingCounter ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Confirming Booking...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>Complete Booking (Pay at Counter)</span>
              </>
            )}
          </button>

          {onBack && (
            <button
              type="button"
              onClick={onBack}
              disabled={confirmingCounter}
              className="w-full py-3 rounded-xl font-semibold text-gray-700 dark:text-zinc-300 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors flex items-center justify-center gap-1.5 text-sm"
            >
              <ArrowLeft className="w-4 h-4" /> Go Back
            </button>
          )}
        </div>
      </div>
    );
  }

  if (intentError) {
    return (
      <div className="w-full max-w-lg mx-auto bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 text-center space-y-5">
        <div className="w-14 h-14 bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Payment Notice</h2>
          <p className="text-sm text-gray-600 dark:text-zinc-400 mt-2 bg-gray-50 dark:bg-zinc-800 p-3 rounded-xl border border-gray-200 dark:border-zinc-700">
            {intentError}
          </p>
        </div>
        <div className="flex flex-col gap-2.5 pt-2">
          <button
            type="button"
            onClick={handlePayAtCounter}
            disabled={confirmingCounter}
            className="w-full py-3.5 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 shadow-sm"
            style={{ backgroundColor: primaryColor }}
          >
            {confirmingCounter ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Continue & Pay at Counter ({currSymbol}{(amount / 100).toFixed(2)})
          </button>

          {stripeAccountId && (
            <button
              type="button"
              onClick={getSecret}
              disabled={isRetrying}
              className="w-full py-3 rounded-xl font-semibold text-gray-700 dark:text-zinc-300 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
            >
              {isRetrying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Retry Online Card Payment
            </button>
          )}
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              disabled={confirmingCounter}
              className="w-full py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-800 dark:hover:text-zinc-200 transition-colors flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" /> Go Back
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!clientSecret || !stripePromise) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="w-10 h-10 animate-spin mb-4" style={{ color: primaryColor }} />
        <p className="text-gray-500 font-medium">Preparing secure checkout...</p>
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: primaryColor || '#4f46e5',
            borderRadius: '12px',
          },
        },
      }}
    >
      <CheckoutForm
        onSuccess={onSuccess}
        onBack={onBack}
        onSkip={onSkip}
        primaryColor={primaryColor}
        paymentId={paymentId || ''}
        amount={amount}
        currency={currency}
      />
    </Elements>
  );
}
