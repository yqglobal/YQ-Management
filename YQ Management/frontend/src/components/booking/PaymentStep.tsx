import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { fetchApi } from '../../lib/api';
import { Loader2, AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';

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

const CheckoutForm = ({ onSuccess, onBack, onSkip, primaryColor, paymentId }: { onSuccess: (paymentId: string) => void, onBack?: () => void, onSkip?: () => void, primaryColor: string, paymentId: string }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message || 'An error occurred.');
      setProcessing(false);
      return;
    }

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href, // This will be handled if redirect happens, but we try to prevent redirect if possible or use redirect="if_required"
      },
      redirect: 'if_required'
    });

    if (confirmError) {
      setError(confirmError.message || 'Payment failed.');
      setProcessing(false);
    } else {
      // Notify the backend that Stripe has confirmed the payment
      try {
        await fetchApi(`/tenant-payments/public/payment/${paymentId}/complete`, {
          method: 'POST',
          body: JSON.stringify({ method: 'CARD' })
        });
        onSuccess(paymentId);
      } catch (err: any) {
        setError(err.message || 'Payment succeeded with Stripe, but failed to update booking status.');
        setProcessing(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 flex-1 w-full max-w-lg mx-auto bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">Secure Payment</h2>
        <p className="text-gray-500">Please enter your payment details</p>
      </div>

      <PaymentElement />

      {error && <div className="text-red-500 text-sm font-medium p-3 bg-red-50 rounded-lg">{error}</div>}

      <div className="flex flex-col gap-3 pt-4">
        <div className="flex gap-3">
          {onBack && (
            <button type="button" onClick={onBack} disabled={processing} className="px-6 py-4 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">
              Back
            </button>
          )}
          <button type="submit" disabled={!stripe || processing} className="flex-1 py-4 rounded-xl font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-95 flex justify-center items-center gap-2" style={{ backgroundColor: primaryColor }}>
            {processing && <Loader2 className="w-5 h-5 animate-spin" />}
            Pay Now
          </button>
        </div>
        {onSkip && (
          <button type="button" onClick={onSkip} disabled={processing} className="w-full py-3 rounded-xl font-bold text-gray-600 dark:text-zinc-400 bg-transparent hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
            Skip and Pay Later at Counter
          </button>
        )}
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

  useEffect(() => {
    // Only load if we have an account ID
    if (!stripeAccountId) {
      setIntentError('Online payment processing is not configured for this tenant. Please pay at the counter or contact support.');
      return;
    }
    
    // Platform publishable key
    const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder';
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
    } catch (err: any) {
      console.error("Failed to create payment intent", err);
      setIntentError(err.message || 'Unable to initialize secure payment session.');
    } finally {
      setIsRetrying(false);
    }
  };

  useEffect(() => {
    if (tenantId && amount > 0 && stripeAccountId) {
      getSecret();
    }
  }, [tenantId, amount, stripeAccountId, visitId, visitStepId]);

  if (intentError) {
    return (
      <div className="w-full max-w-lg mx-auto bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 text-center space-y-5">
        <div className="w-14 h-14 bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Payment Gateway Notice</h2>
          <p className="text-sm text-gray-600 dark:text-zinc-400 mt-2 bg-red-50 dark:bg-red-950/30 p-3 rounded-xl border border-red-200 dark:border-red-900/50">
            {intentError}
          </p>
        </div>
        <div className="flex flex-col gap-2.5 pt-2">
          {stripeAccountId && (
            <button
              type="button"
              onClick={getSecret}
              disabled={isRetrying}
              className="w-full py-3.5 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 shadow-sm"
              style={{ backgroundColor: primaryColor }}
            >
              {isRetrying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Retry Payment
            </button>
          )}
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="w-full py-3 rounded-xl font-semibold text-gray-700 dark:text-zinc-300 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" /> Go Back
            </button>
          )}
          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="w-full py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-800 dark:hover:text-zinc-200 transition-colors"
            >
              Skip and Pay Later at Counter
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
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
      <CheckoutForm onSuccess={onSuccess} onBack={onBack} onSkip={onSkip} primaryColor={primaryColor} paymentId={paymentId || ''} />
    </Elements>
  );
}
