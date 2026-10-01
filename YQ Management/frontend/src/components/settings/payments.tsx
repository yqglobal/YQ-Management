import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, ExternalLink, ShieldCheck, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';

export default function StripePaymentsSettings() {
  const queryClient = useQueryClient();

  const { data: status, isLoading, refetch } = useQuery({
    queryKey: ['tenant-payment-status'],
    queryFn: () => fetchApi('/tenant-payments/status'),
  });

  const connectMutation = useMutation({
    mutationFn: () => fetchApi('/tenant-payments/connect', { method: 'POST' }),
    onSuccess: (data: any) => {
      if (data.url) {
        window.location.href = data.url; // Redirect to Stripe Onboarding
      } else {
        toast.success('Successfully refreshed Stripe connection');
        refetch();
      }
    },
    onError: () => toast.error('Failed to initiate Stripe connection'),
  });

  return (
    <div className="w-full">


      <div className="bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-2xl overflow-hidden shadow-sm">
        <div className="p-8 border-b border-border dark:border-dark-border bg-surface-container-low dark:bg-dark-card flex items-start gap-4">
          <div className="w-12 h-12 bg-[#635BFF]/10 rounded-xl flex items-center justify-center shrink-0">
            <CreditCard className="w-6 h-6 text-[#635BFF]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
              Stripe Connect
            </h2>
            <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-2xl leading-relaxed">
              Accept credit cards, Apple Pay, and Google Pay from your customers. Payouts are automatically routed to your bank account.
            </p>
          </div>
        </div>

        <div className="p-8">
          {isLoading ? (
            <div className="flex items-center gap-3 text-gray-500 dark:text-zinc-400">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Loading payment account status...</span>
            </div>
          ) : !status?.accountId ? (
            <div className="flex flex-col items-start gap-6">
              <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-500/10 p-4 rounded-xl text-blue-700 dark:text-blue-300 w-full">
                <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold mb-1">Secure & Automated</p>
                  <p>YQ Management partners with Stripe to ensure PCI compliance. We do not store credit card details on our servers.</p>
                </div>
              </div>

              <button
                onClick={() => connectMutation.mutate()}
                disabled={connectMutation.isPending}
                className="flex items-center gap-2 px-6 py-3 bg-[#635BFF] hover:bg-[#5249EC] disabled:opacity-50 text-white rounded-xl font-semibold shadow-md shadow-[#635BFF]/20 transition-all"
              >
                {connectMutation.isPending ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
                Connect with Stripe
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                {status.chargesEnabled && status.payoutsEnabled ? (
                  <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-sm font-semibold border border-emerald-200 dark:border-emerald-500/20">
                    <CheckCircle2 className="w-4 h-4" /> Active & Receiving Payments
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-sm font-semibold border border-amber-200 dark:border-amber-500/20">
                    <AlertCircle className="w-4 h-4" /> Action Required in Stripe
                  </div>
                )}
                <span className="text-sm text-gray-500 dark:text-zinc-500 font-mono bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded">
                  {status.accountId}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                <div className="p-4 rounded-xl border border-border dark:border-dark-border bg-gray-50 dark:bg-black/30 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-zinc-400">Accepting Payments</p>
                    <p className="font-bold text-gray-900 dark:text-white mt-1">
                      {status.chargesEnabled ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                  {status.chargesEnabled ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                  )}
                </div>
                
                <div className="p-4 rounded-xl border border-border dark:border-dark-border bg-gray-50 dark:bg-black/30 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-zinc-400">Bank Payouts</p>
                    <p className="font-bold text-gray-900 dark:text-white mt-1">
                      {status.payoutsEnabled ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                  {status.payoutsEnabled ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                  )}
                </div>
              </div>

              {(!status.chargesEnabled || !status.payoutsEnabled) && (
                <div className="mt-4 flex flex-col items-start gap-4">
                  <p className="text-sm text-gray-600 dark:text-zinc-300">
                    Your Stripe account requires additional information before you can accept payments or receive payouts.
                  </p>
                  <button
                    onClick={() => connectMutation.mutate()}
                    disabled={connectMutation.isPending}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 dark:text-black text-white rounded-xl font-medium transition-colors text-sm"
                  >
                    Complete Onboarding <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              )}

              {(status.chargesEnabled && status.payoutsEnabled) && (
                <div className="mt-6 pt-6 border-t border-border dark:border-dark-border">
                  <a 
                    href="https://dashboard.stripe.com" 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-[#635BFF] hover:text-[#5249EC] font-medium"
                  >
                    Go to Stripe Dashboard <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
