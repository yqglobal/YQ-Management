import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  CreditCard, 
  ExternalLink, 
  ShieldCheck, 
  AlertCircle, 
  RefreshCw, 
  CheckCircle2,
  Landmark,
  Building2,
  FileText,
  ShieldAlert,
  Info
} from 'lucide-react';
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

  const resetMutation = useMutation({
    mutationFn: () => fetchApi('/tenant-payments/reset', { method: 'POST' }),
    onSuccess: () => {
      toast.success('Stripe connection reset. You can now connect a new account.');
      refetch();
    },
    onError: () => toast.error('Failed to reset Stripe connection'),
  });

  return (
    <div className="w-full">
      <div className="bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-2xl overflow-hidden shadow-sm">
        <div className="p-8 border-b border-border dark:border-dark-border bg-surface-container-low dark:bg-dark-card flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-[#635BFF]/10 rounded-xl flex items-center justify-center shrink-0">
              <CreditCard className="w-6 h-6 text-[#635BFF]" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Stripe Connect
                </h2>
                {status?.isTestMode ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                    ⚡ Test Mode
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                    ● Live Mode
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-2xl leading-relaxed">
                Accept credit cards, Apple Pay, and Google Pay from your customers. Payouts are automatically routed to your bank account.
              </p>
            </div>
          </div>
          {status?.accountId && (
            <button
              onClick={() => {
                if (confirm('Disconnect current Stripe account and reset connection?')) {
                  resetMutation.mutate();
                }
              }}
              disabled={resetMutation.isPending}
              className="text-xs text-red-600 dark:text-red-400 hover:underline shrink-0 font-medium"
            >
              {resetMutation.isPending ? 'Resetting...' : 'Disconnect Account'}
            </button>
          )}
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

              {status?.isTestMode && (
                <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-500/10 p-4 rounded-xl text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800/40 w-full text-sm">
                  <span className="text-lg">💡</span>
                  <div>
                    <p className="font-semibold mb-0.5">Local Development Tip</p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      When redirected to Stripe in Test Mode, look for the banner button at the top that says <strong>&quot;Skip this account form&quot;</strong> or <strong>&quot;Use test account&quot;</strong> to instantly activate test payments without entering real bank or personal information.
                    </p>
                  </div>
                </div>
              )}

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
                <div className="mt-6 pt-6 border-t border-border dark:border-dark-border flex items-center justify-between">
                  <a 
                    href={status.isTestMode ? "https://dashboard.stripe.com/test" : "https://dashboard.stripe.com"} 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-[#635BFF] hover:text-[#5249EC] font-semibold"
                  >
                    Go to Stripe Dashboard <ExternalLink className="w-4 h-4" />
                  </a>
                  <span className="text-xs text-gray-500 dark:text-zinc-400">
                    Payout schedule and bank accounts are managed directly inside Stripe.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Prerequisites for Stripe Payouts ── */}
      <div className="mt-8 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border dark:border-dark-border bg-surface-container-low dark:bg-dark-card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-sky-500/10 flex items-center justify-center text-primary dark:text-sky-400">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Prerequisites for Stripe Connect & Payouts
              </h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                Ensure you have these business and identity details ready before initiating connection.
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-surface-container-high text-on-surface-variant dark:text-zinc-300 rounded-lg border border-border dark:border-dark-border">
            KYC Compliance
          </span>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-border/70 dark:border-dark-border/70 bg-surface-container-lowest dark:bg-dark-card flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
                <Building2 className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                1. Legal Business Entity
              </h4>
              <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed">
                Registered business name, operating address, and business tax registration number (or national identification number for sole proprietors).
              </p>
            </div>
            <span className="mt-3 text-[11px] font-medium text-primary">
              Required by local regulators
            </span>
          </div>

          <div className="p-4 rounded-xl border border-border/70 dark:border-dark-border/70 bg-surface-container-lowest dark:bg-dark-card flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
                <Landmark className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                2. Bank Account Details
              </h4>
              <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed">
                An active domestic bank account registered under the business or owner&apos;s legal name (IBAN, Routing Number, Sort Code, or Account Number).
              </p>
            </div>
            <span className="mt-3 text-[11px] font-medium text-primary">
              For automatic direct deposits
            </span>
          </div>

          <div className="p-4 rounded-xl border border-border/70 dark:border-dark-border/70 bg-surface-container-lowest dark:bg-dark-card flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
                <FileText className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                3. Identity Verification
              </h4>
              <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed">
                Government-issued photo identification (Passport, National ID card, or Driver&apos;s License) of the business representative or beneficial owner.
              </p>
            </div>
            <span className="mt-3 text-[11px] font-medium text-primary">
              Anti-Money Laundering (AML)
            </span>
          </div>

          <div className="p-4 rounded-xl border border-border/70 dark:border-dark-border/70 bg-surface-container-lowest dark:bg-dark-card flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                4. Customer Support Info
              </h4>
              <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed">
                A valid customer service email, phone number, and physical contact location that will appear on your customers&apos; card billing statements.
              </p>
            </div>
            <span className="mt-3 text-[11px] font-medium text-primary">
              Statement descriptor info
            </span>
          </div>
        </div>
      </div>

      {/* ── 4-Step Onboarding Process ── */}
      <div className="mt-8 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border dark:border-dark-border bg-surface-container-low dark:bg-dark-card">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            How Stripe Connect Onboarding Works
          </h3>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
            Follow these 4 simple steps to enable customer card payments and automated bank payouts.
          </p>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6 relative">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                1
              </span>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                Start Connection
              </h4>
            </div>
            <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed pl-8">
              Click &quot;Connect with Stripe&quot; above. You will be redirected to Stripe&apos;s encrypted onboarding portal.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                2
              </span>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                Enter Details
              </h4>
            </div>
            <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed pl-8">
              Fill in your legal business name, country, bank account information, and verify representative identity.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                3
              </span>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                Automated Verification
              </h4>
            </div>
            <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed pl-8">
              Stripe evaluates your verification in real time (usually instantaneous, or up to 24-48 hours if manual document review is required).
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                4
              </span>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                Receive Payouts
              </h4>
            </div>
            <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed pl-8">
              Once active, walk-in and online booking payments flow straight to your connected account with rolling payouts to your bank.
            </p>
          </div>
        </div>
      </div>

      {/* ── Disclaimers & Operational Policies ── */}
      <div className="mt-8 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Info className="w-4 h-4 text-primary" /> Important Policies & Technical Disclaimers
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-600 dark:text-zinc-400 leading-relaxed">
          <div className="p-4 rounded-xl bg-surface-container-low dark:bg-dark-card border border-border/50 dark:border-dark-border/50">
            <p className="font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" /> Merchant of Record & Payouts
            </p>
            <p>
              Your connected business is the direct Merchant of Record. Funds do not touch Qmova&apos;s bank accounts; they are disbursed directly by Stripe to your nominated bank according to your country&apos;s rolling schedule (typically 2 to 7 business days).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface-container-low dark:bg-dark-card border border-border/50 dark:border-dark-border/50">
            <p className="font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-sky-500" /> Ad Blocker & Browser Extension Notice
            </p>
            <p>
              Stripe Connect employs fraud prevention and security verification (hCaptcha). Please temporarily disable ad blockers or browser shields on <code>connect.stripe.com</code> to ensure verification scripts can load smoothly without delays.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface-container-low dark:bg-dark-card border border-border/50 dark:border-dark-border/50">
            <p className="font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-emerald-500" /> Refunds & Dispute Handling
            </p>
            <p>
              Customer chargebacks, disputes, and full or partial refunds are managed directly through your Stripe Dashboard. Applicable platform transaction fees are handled automatically per your tenant plan agreement.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
