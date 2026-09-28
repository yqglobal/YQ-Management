import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { fetchApi } from '../../../../lib/api';
import { PaymentStep } from '../../../../components/booking/PaymentStep';
import { Loader2, CheckCircle2 } from 'lucide-react';

export default function PublicPaymentPage() {
  const router = useRouter();
  const { subdomain, paymentId } = router.query;
  const [payment, setPayment] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);
  const [status, setStatus] = useState<'LOADING' | 'PENDING' | 'COMPLETED' | 'ERROR'>('LOADING');

  useEffect(() => {
    if (!subdomain || !paymentId) return;
    
    // Load tenant info to get colors/logo
    fetchApi(`/tenant/public/by-subdomain/${subdomain}`)
      .then(res => setTenant(res))
      .catch(console.error);

    // Load payment details
    fetchApi(`/tenant-payments/public/payment/${paymentId}`)
      .then(res => {
        setPayment(res);
        setStatus(res.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING');
      })
      .catch(() => setStatus('ERROR'));
  }, [subdomain, paymentId]);

  const handleSuccess = async () => {
    try {
      setStatus('LOADING');
      await fetchApi(`/tenant-payments/public/payment/${paymentId}/complete`, {
        method: 'POST'
      });
      setStatus('COMPLETED');
    } catch (e) {
      console.error(e);
      setStatus('ERROR');
    }
  };

  if (status === 'LOADING') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950">
        <Loader2 className="w-12 h-12 animate-spin text-gray-400" />
      </div>
    );
  }

  if (status === 'ERROR' || !payment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950 p-6 text-center">
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-sm border border-red-200">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-3xl">error</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">Payment Not Found</h1>
          <p className="text-gray-500">This payment link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  const primaryColor = tenant?.uiConfig?.primaryColor || '#4F46E5';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
      <Head>
        <title>Checkout | {tenant?.name || 'Qmova'}</title>
      </Head>

      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          {tenant?.uiConfig?.logoUrl ? (
            <img src={tenant.uiConfig.logoUrl} alt={tenant.name} className="h-16 w-auto mb-4" />
          ) : (
            <div className="w-16 h-16 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 flex items-center justify-center mb-4">
              <span className="text-2xl font-black" style={{ color: primaryColor }}>
                {tenant?.name?.charAt(0) || 'Q'}
              </span>
            </div>
          )}
          <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
            {tenant?.name || 'Checkout'}
          </h1>
        </div>

        {status === 'COMPLETED' ? (
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl p-8 text-center shadow-lg">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-black mb-2 text-gray-900 dark:text-white">Payment Successful</h2>
            <p className="text-lg text-gray-500 mb-6">Your transaction is complete.</p>
            <div className="text-sm font-medium text-gray-400 bg-gray-50 dark:bg-zinc-950 py-3 px-4 rounded-xl inline-flex gap-2 items-center">
              <span>Receipt ID:</span>
              <span className="font-mono text-gray-900 dark:text-white">{payment.id.slice(0,8).toUpperCase()}</span>
            </div>
            <p className="mt-8 text-sm text-gray-500">You may now close this page or hand the device back to the receptionist.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
              <div className="text-sm text-gray-500 font-medium mb-1">Total Due</div>
              <div className="text-4xl font-black text-gray-900 dark:text-white mb-2">
                {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: payment.currency }).format(payment.amount)}
              </div>
              {payment.description && (
                <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-zinc-950 p-3 rounded-xl border border-gray-100 dark:border-zinc-800">
                  {payment.description}
                </div>
              )}
            </div>

            <PaymentStep
              tenantId={tenant?.id}
              amount={payment.amount * 100} // Cents
              currency={payment.currency.toLowerCase()}
              stripeAccountId={payment.tenantPaymentAccount?.connectedAccountId}
              onSuccess={handleSuccess}
              primaryColor={primaryColor}
              visitId={payment.visitId}
              visitStepId={payment.visitStepId}
            />
          </div>
        )}
        
        <div className="mt-8 text-center text-xs font-medium text-gray-400 flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-[14px]">lock</span>
          Secured by Stripe & Qmova
        </div>
      </div>
    </div>
  );
}
