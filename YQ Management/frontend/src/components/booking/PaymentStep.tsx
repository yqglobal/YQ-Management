import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { fetchApi } from '../../lib/api';
import { Loader2 } from 'lucide-react';

interface PaymentStepProps {
  tenantId: string;
  amount: number;
  currency: string;
  stripeAccountId: string;
  onSuccess: (paymentId: string) => void;
  onBack: () => void;
  primaryColor: string;
  visitId?: string;
  visitStepId?: string;
}

const CheckoutForm = ({ onSuccess, onBack, primaryColor, paymentId }: { onSuccess: (paymentId: string) => void, onBack: () => void, primaryColor: string, paymentId: string }) => {
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
      onSuccess(paymentId);
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

      <div className="flex gap-3 pt-4">
        <button type="button" onClick={onBack} disabled={processing} className="px-6 py-4 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">
          Back
        </button>
        <button type="submit" disabled={!stripe || processing} className="flex-1 py-4 rounded-xl font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-95 flex justify-center items-center gap-2" style={{ backgroundColor: primaryColor }}>
          {processing && <Loader2 className="w-5 h-5 animate-spin" />}
          Pay Now
        </button>
      </div>
    </form>
  );
};

export function PaymentStep({ tenantId, amount, currency, stripeAccountId, onSuccess, onBack, primaryColor, visitId, visitStepId }: PaymentStepProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<any>(null);

  useEffect(() => {
    // Only load if we have an account ID
    if (!stripeAccountId) return;
    
    // We assume the platform publishable key is in NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    // For connected accounts, we pass stripeAccount in the options
    const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder'; // Fallback so it doesn't crash if env missing during dev
    setStripePromise(loadStripe(pk, { stripeAccount: stripeAccountId }));
  }, [stripeAccountId]);

  useEffect(() => {
    const getSecret = async () => {
      try {
        const res = await fetchApi('/tenant-payments/public/intent', {
          method: 'POST',
          body: JSON.stringify({ tenantId, amount, description: 'Booking Prepayment', visitId, visitStepId })
        });
        setClientSecret(res.clientSecret);
        setPaymentId(res.paymentId);
      } catch (err) {
        console.error("Failed to create payment intent", err);
      }
    };
    if (tenantId && amount > 0) getSecret();
  }, [tenantId, amount]);

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
      <CheckoutForm onSuccess={onSuccess} onBack={onBack} primaryColor={primaryColor} paymentId={paymentId || ''} />
    </Elements>
  );
}
