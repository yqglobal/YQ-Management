import React, { useState, useEffect, useMemo, useRef } from 'react';
import Head from 'next/head';
import { CheckCircle2, AlertCircle, Loader2, Zap, Building2, ArrowRight, Sparkles, Crown, CreditCard } from 'lucide-react';
import { fetchApi } from '../../../../lib/api';
import { useRouter } from 'next/router';
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePlan } from '../../../../hooks/usePlan';

interface OzowPaymentData {
  paymentUrl?: string;
  checkoutUrl?: string;
  siteCode?: string;
  countryCode?: string;
  currencyCode?: string;
  amount?: string;
  transactionReference?: string;
  bankReference?: string;
  cancelUrl?: string;
  errorUrl?: string;
  successUrl?: string;
  notifyUrl?: string;
  isTest?: string;
  hashCheck?: string;
}

const billingDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function formatBillingDate(value?: string | Date | null) {
  if (!value) return 'Unknown';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return billingDateFormatter.format(date);
}

export default function BillingSettings() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const paymentFormRef = useRef<HTMLFormElement | null>(null);
  const [paymentData, setPaymentData] = useState<OzowPaymentData | null>(null);
  const [billingInterval, setBillingInterval] = useState('monthly');
  const [showEnterpriseModal, setShowEnterpriseModal] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<any>(null);
  const [enterpriseForm, setEnterpriseForm] = useState({ name: '', companyName: '', email: '', phone: '', message: '' });
  const ozowFields = useMemo<Array<keyof OzowPaymentData>>(
    () => ['siteCode', 'countryCode', 'currencyCode', 'amount', 'transactionReference', 'bankReference', 'cancelUrl', 'errorUrl', 'successUrl', 'notifyUrl', 'isTest', 'hashCheck'],
    [],
  );
  const paymentStatus = useMemo(() => {
    if (Array.isArray(router.query.status)) return router.query.status[0];
    return router.query.status;
  }, [router.query.status]);

  // Fetch Current Subscription
  const { data: currentSub, isLoading: isSubLoading } = useQuery({
    queryKey: ['current-subscription'],
    queryFn: () => fetchApi('/billing/subscriptions/current'),
  });

  // Fetch Active Plans
  const { data: plans = [], isLoading: isPlansLoading } = useQuery({
    queryKey: ['active-plans'],
    queryFn: () => fetchApi('/billing/plans?status=ACTIVE'),
  });

  const subscribeMutation = useMutation({
    mutationFn: (data: { planId: string; billingInterval: string }) =>
      fetchApi('/payments/generate-link', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: (data) => {
      setPaymentData(data);
    },
    onError: () => {
      toast.error('Error generating payment link');
    },
  });

  const trialMutation = useMutation({
    mutationFn: (data: { planId: string }) =>
      fetchApi('/billing/subscriptions/trial', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['billing-subscription'] });
      await queryClient.invalidateQueries({ queryKey: ['current-subscription'] });
      toast.success('Plan started successfully!');
      setCheckoutPlan(null);
    },
    onError: () => {
      toast.error('Error starting plan');
    },
  });

  const enterpriseMutation = useMutation({
    mutationFn: (data: typeof enterpriseForm) =>
      fetchApi('/billing/enterprise-inquiries', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast.success('Inquiry sent! Our sales team will contact you shortly.');
      setShowEnterpriseModal(false);
      setEnterpriseForm({ name: '', companyName: '', email: '', phone: '', message: '' });
    },
    onError: () => {
      toast.error('Failed to send inquiry. Please try again later.');
    }
  });

  const statusMessage = useMemo(() => {
    if (paymentStatus === 'success') {
      return { type: 'success' as const, text: 'Payment completed successfully! Your subscription is now active.' };
    }
    if (paymentStatus === 'cancelled') {
      return { type: 'error' as const, text: 'Payment was cancelled.' };
    }
    if (paymentStatus === 'error') {
      return { type: 'error' as const, text: 'An error occurred during payment processing.' };
    }
    return null;
  }, [paymentStatus]);

  const { usage } = usePlan();

  const handleUpgradeClick = (plan: any) => {
    if (currentSub?.plan?.price > plan.price) {
      if (plan.limits?.maxQueues && usage.queues > plan.limits.maxQueues) {
        toast.error(`Cannot downgrade: You have ${usage.queues} queues but the ${plan.name} plan only allows ${plan.limits.maxQueues}. Please delete some queues first.`);
        return;
      }
    }
    setCheckoutPlan(plan);
  };

  const confirmCheckout = () => {
    if (checkoutPlan) {
      if (checkoutPlan.price === 0) {
        trialMutation.mutate({ planId: checkoutPlan.id });
      } else {
        subscribeMutation.mutate({ planId: checkoutPlan.id, billingInterval });
      }
    }
  };

  useEffect(() => {
    if (paymentData) {
      const submitTimer = window.setTimeout(() => {
        try {
          paymentFormRef.current?.requestSubmit();
        } catch {
          try {
            paymentFormRef.current?.submit();
          } catch (submitError) {
            console.error('Auto-submit failed', submitError);
          }
        }
      }, 100);

      return () => window.clearTimeout(submitTimer);
    }
  }, [paymentData]);

  const isTrial = currentSub?.status === 'TRIAL';
  // Trial users AND paying users (including free ACTIVE plans) should see their plan details (not the pricing grid)
  const isPaid = currentSub?.status === 'ACTIVE' || isTrial;
  const isExpired = currentSub?.status === 'EXPIRED' || currentSub?.status === 'CANCELLED';
  const isPastDue = currentSub?.status === 'PAST_DUE';
  const isPendingPayment = currentSub?.status === 'PENDING_PAYMENT';
  
  let trialDaysLeft = 0;
  if (isTrial && currentSub?.trialEndDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(currentSub.trialEndDate);
    end.setHours(0, 0, 0, 0);
    trialDaysLeft = Math.max(0, Math.round((end.getTime() - today.getTime()) / 86400000));
  }

  const handleCancelSubscription = async (immediate: boolean) => {
    try {
      await fetchApi('/billing/subscriptions/cancel', {
        method: 'POST',
        body: JSON.stringify({ immediate, reason: 'User requested cancellation from dashboard' }),
      });
      toast.success(immediate ? 'Trial cancelled successfully.' : 'Plan cancellation requested. You will retain access until the end of the billing period.');
      // Refresh page data
      window.location.reload();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to cancel subscription.');
    }
  };

  return (
    <>
      {/* Payment Confirmation Modal */}
      {statusMessage && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-xl z-[150] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-card dark:bg-zinc-900 border border-border dark:border-white/10 rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden flex flex-col items-center text-center relative animate-in zoom-in-95 duration-500 ease-out">
            {/* Top decorative glow */}
            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[200%] h-32 blur-[64px] rounded-full opacity-20 pointer-events-none ${
              statusMessage.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
            }`}></div>
            
            <div className="p-10 w-full relative z-10 flex flex-col items-center">
              <div className={`w-24 h-24 rounded-[32px] flex items-center justify-center mb-8 rotate-3 shadow-xl backdrop-blur-md border ${
                statusMessage.type === 'success' 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 shadow-emerald-500/20' 
                  : 'bg-red-500/10 border-red-500/30 text-red-500 shadow-red-500/20'
              }`}>
                {statusMessage.type === 'success' 
                  ? <CheckCircle2 strokeWidth={2.5} className="w-12 h-12 -rotate-3" /> 
                  : <AlertCircle strokeWidth={2.5} className="w-12 h-12 -rotate-3" />
                }
              </div>
              
              <h2 className="text-2xl font-bold text-on-surface dark:text-white tracking-tight mb-3">
                {statusMessage.type === 'success' ? 'Payment Successful' : 'Payment Failed'}
              </h2>
              <p className="text-on-surface-variant dark:text-zinc-400 mb-10 leading-relaxed max-w-[280px]">
                {statusMessage.text}
              </p>
              
              <button 
                onClick={async () => {
                  // Invalidate subscription caches so the page shows the fresh ACTIVE subscription
                  await queryClient.invalidateQueries({ queryKey: ['billing-subscription'] });
                  await queryClient.invalidateQueries({ queryKey: ['current-subscription'] });
                  router.replace('/dashboard/settings/billing');
                }}
                className={`w-full h-14 rounded-2xl font-semibold text-[15px] transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 group ${
                  statusMessage.type === 'success' 
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/25' 
                    : 'bg-red-500 hover:bg-red-400 text-white shadow-red-500/25'
                }`}
              >
                {statusMessage.type === 'success' ? 'Go to Dashboard' : 'Try Again'}
                <ArrowRight className="w-4 h-4 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </button>
            </div>
          </div>
        </div>
      )}



      {isSubLoading || isPlansLoading ? (
        <div className="flex items-center gap-3 text-outline font-body-md text-body-md p-8 justify-center">
          <Loader2 strokeWidth={1.5} className="w-5 h-5 animate-spin" />
          Loading billing info...
        </div>
      ) : isPaid ? (
        <div className="flex flex-col gap-8 max-w-6xl mx-auto w-full animate-in fade-in duration-500">
          {/* POST-PURCHASE VIEW: Active Plan Details */}
          
          {/* Hero Subscription Card */}
          <div className={`relative overflow-hidden rounded-[2.5rem] p-8 md:p-12 border shadow-2xl ${
            isTrial 
              ? 'bg-gradient-to-br from-indigo-950/80 to-purple-950/80 border-indigo-500/30 shadow-indigo-500/10' 
              : 'bg-gradient-to-br from-zinc-900/90 to-black border-white/10 shadow-black/50'
          } backdrop-blur-xl group`}>
            {/* Background Glows & Mesh */}
            <div className={`absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full blur-[120px] opacity-30 pointer-events-none transition-transform duration-1000 group-hover:scale-110 ${isTrial ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
            <div className={`absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full blur-[120px] opacity-20 pointer-events-none transition-transform duration-1000 group-hover:scale-110 ${isTrial ? 'bg-purple-500' : 'bg-sky-500'}`} />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
              
              <div className="flex-1">
                <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-bold uppercase tracking-widest mb-6 shadow-sm backdrop-blur-md ${
                  isTrial ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                }`}>
                  <span className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] ${isTrial ? 'bg-indigo-400 animate-pulse' : 'bg-emerald-400'}`}></span>
                  {isTrial ? '14-Day Trial Active' : 'Active Subscription'}
                </div>
                
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight mb-4 flex items-center gap-4">
                  {currentSub?.plan?.name || 'Starter Plan'}
                  {currentSub?.plan?.name?.toLowerCase().includes('pro') && <Crown className="w-10 h-10 text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.4)]" />}
                </h2>
                <p className="text-zinc-300 text-lg md:text-xl font-medium max-w-xl leading-relaxed">
                  {isTrial 
                    ? `You have ${trialDaysLeft} days remaining in your free trial to explore all premium features.` 
                    : `Your subscription is active and will auto-renew on ${formatBillingDate(currentSub?.nextBillingDate)}.`}
                </p>

                <div className="flex flex-wrap items-center gap-4 mt-10">
                  {isTrial ? (
                    <button onClick={() => document.getElementById('upgrade-section')?.scrollIntoView({ behavior: 'smooth' })} className="px-8 h-14 bg-white text-indigo-950 hover:bg-indigo-50 rounded-2xl font-bold transition-all shadow-xl shadow-white/10 flex items-center gap-2 hover:-translate-y-0.5 active:translate-y-0 text-base">
                      <Sparkles className="w-5 h-5" /> Upgrade to a Paid Plan
                    </button>
                  ) : (
                    <button onClick={() => document.getElementById('upgrade-section')?.scrollIntoView({ behavior: 'smooth' })} className="px-8 h-14 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-2xl font-bold transition-all flex items-center gap-2 backdrop-blur-md hover:-translate-y-0.5 active:translate-y-0 text-base">
                      Change Plan
                    </button>
                  )}
                  {!currentSub?.cancellationDate && !isTrial && (
                    <button 
                      onClick={() => {
                        if (confirm('Are you sure you want to cancel your subscription? You will retain access until the end of your billing cycle.')) {
                          handleCancelSubscription(false);
                        }
                      }}
                      className="px-6 h-14 text-zinc-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all text-sm font-semibold"
                    >
                      Cancel Subscription
                    </button>
                  )}
                  {isTrial && (
                    <button
                      onClick={() => { if (confirm('Are you sure you want to cancel your trial? You will lose access immediately.')) handleCancelSubscription(true); }}
                      className="px-6 h-14 text-zinc-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all text-sm font-semibold"
                    >
                      End Trial Early
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Features List */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md min-w-[320px] shadow-2xl relative overflow-hidden group-hover:border-white/20 transition-colors">
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <h4 className="text-zinc-400 text-xs font-bold uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Plan Features
                </h4>
                <ul className="space-y-4">
                  <li className="flex items-center gap-4 text-white text-base font-medium">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    Up to {currentSub?.plan?.limits?.maxQueues || 'Unlimited'} Queues
                  </li>
                  <li className="flex items-center gap-4 text-white text-base font-medium">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    Up to {currentSub?.plan?.limits?.maxTokens || 'Unlimited'} Tokens/day
                  </li>
                  {currentSub?.plan?.features?.whatsappNotifications && (
                    <li className="flex items-center gap-4 text-white text-base font-medium">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      WhatsApp Notifications
                    </li>
                  )}
                  {currentSub?.plan?.features?.customBranding && (
                    <li className="flex items-center gap-4 text-white text-base font-medium">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      Custom Branding
                    </li>
                  )}
                </ul>
              </div>

            </div>
          </div>

          {/* Usage Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Queues Usage */}
            <div className="bg-card dark:bg-zinc-900/60 border border-border dark:border-white/10 rounded-[2rem] p-10 flex flex-col sm:flex-row items-center justify-between group overflow-hidden relative shadow-lg">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-colors duration-700"></div>
              
              <div className="relative z-10 text-center sm:text-left mb-8 sm:mb-0">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 mb-5 border border-emerald-500/20 shadow-inner">
                  <span className="material-symbols-outlined text-[28px]">layers</span>
                </div>
                <h3 className="text-2xl font-bold text-on-surface dark:text-white mb-2">Active Queues</h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Queues configured in workspace</p>
                <div className="mt-6 flex items-baseline justify-center sm:justify-start gap-2">
                  <span className="text-5xl font-black text-on-surface dark:text-white tracking-tighter">{usage.queues}</span>
                  <span className="text-zinc-400 font-bold text-lg">/ {currentSub?.plan?.limits?.maxQueues || '∞'}</span>
                </div>
              </div>

              <div className="relative z-10 w-40 h-40 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="none" className="text-surface-container-high dark:text-zinc-800" />
                  <circle 
                    cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="none" 
                    strokeLinecap="round"
                    className="text-emerald-500 transition-all duration-1000 ease-out"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - (currentSub?.plan?.limits?.maxQueues ? Math.min(1, usage.queues / currentSub.plan.limits.maxQueues) : 0))}`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-3xl font-black text-on-surface dark:text-white">
                    {currentSub?.plan?.limits?.maxQueues ? Math.round((usage.queues / currentSub.plan.limits.maxQueues) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>

            {/* Tokens Usage */}
            <div className="bg-card dark:bg-zinc-900/60 border border-border dark:border-white/10 rounded-[2rem] p-10 flex flex-col sm:flex-row items-center justify-between group overflow-hidden relative shadow-lg">
              <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 rounded-full blur-3xl group-hover:bg-sky-500/10 transition-colors duration-700"></div>
              
              <div className="relative z-10 text-center sm:text-left mb-8 sm:mb-0">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-sky-500/10 text-sky-500 mb-5 border border-sky-500/20 shadow-inner">
                  <span className="material-symbols-outlined text-[28px]">confirmation_number</span>
                </div>
                <h3 className="text-2xl font-bold text-on-surface dark:text-white mb-2">Tokens This Month</h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Customers served across locations</p>
                <div className="mt-6 flex items-baseline justify-center sm:justify-start gap-2">
                  <span className="text-5xl font-black text-on-surface dark:text-white tracking-tighter">{usage.tokensThisMonth}</span>
                  <span className="text-zinc-400 font-bold text-lg">/ {currentSub?.plan?.limits?.maxTokens || '∞'}</span>
                </div>
              </div>

              <div className="relative z-10 w-40 h-40 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90 drop-shadow-[0_0_8px_rgba(14,165,233,0.3)]" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="none" className="text-surface-container-high dark:text-zinc-800" />
                  <circle 
                    cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="none" 
                    strokeLinecap="round"
                    className="text-sky-500 transition-all duration-1000 ease-out"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - (currentSub?.plan?.limits?.maxTokens ? Math.min(1, usage.tokensThisMonth / currentSub.plan.limits.maxTokens) : 0))}`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-3xl font-black text-on-surface dark:text-white">
                    {currentSub?.plan?.limits?.maxTokens ? Math.round((usage.tokensThisMonth / currentSub.plan.limits.maxTokens) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Upgrade & Payment Info Row */}
          <div id="upgrade-section" className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-4">
            
            <div className="lg:col-span-2 bg-gradient-to-br from-indigo-950/80 to-purple-950/60 border border-indigo-500/30 rounded-[2.5rem] p-10 flex flex-col md:flex-row items-center justify-between gap-10 relative overflow-hidden group shadow-2xl">
              <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[conic-gradient(from_0deg_at_50%_50%,rgba(99,102,241,0.1)_0deg,rgba(168,85,247,0.1)_180deg,rgba(99,102,241,0.1)_360deg)] animate-[spin_10s_linear_infinite] pointer-events-none"></div>
              
              <div className="relative z-10 flex-1 text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-white text-xs font-bold uppercase tracking-widest mb-4 border border-white/20 backdrop-blur-md shadow-lg">
                  <Zap className="w-3.5 h-3.5 text-amber-400" /> Ready to scale?
                </div>
                <h3 className="text-3xl font-black text-white mb-3 tracking-tight">
                  {currentSub?.plan?.name?.toLowerCase().includes('standard') ? 'Upgrade to Premium' : 'Need more power?'}
                </h3>
                <p className="text-indigo-100/80 text-base font-medium leading-relaxed max-w-md mx-auto md:mx-0">
                  Unlock unlimited queues, advanced analytics, custom white-labeling, and dedicated support for your growing business.
                </p>
              </div>

              <div className="relative z-10 shrink-0 w-full md:w-auto">
                <button onClick={() => {
                    const upgradePlan = plans.find((p: any) => p.name.includes(currentSub?.plan?.name?.toLowerCase().includes('standard') ? 'Premium' : 'Standard'));
                    if (upgradePlan) handleUpgradeClick(upgradePlan);
                    else setShowEnterpriseModal(true);
                  }} 
                  className="w-full md:w-auto px-8 h-14 bg-white hover:bg-indigo-50 text-indigo-900 rounded-2xl font-bold transition-all shadow-xl shadow-white/10 flex items-center justify-center gap-3 text-base hover:-translate-y-0.5 active:translate-y-0"
                >
                  View Upgrade Options <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="bg-card dark:bg-zinc-900/60 border border-border dark:border-white/10 rounded-[2.5rem] p-10 flex flex-col shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-surface-container-high dark:bg-white/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-on-surface dark:text-white" />
                </div>
                <h3 className="text-xl font-bold text-on-surface dark:text-white tracking-tight">Payment Method</h3>
              </div>
              
              <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium leading-relaxed mb-8">
                Your subscription payments are securely processed via Ozow Instant EFT.
              </p>
              
              <div className="mt-auto">
                <div className="flex items-center gap-4 p-5 rounded-2xl bg-surface-container-low dark:bg-white/5 border border-border dark:border-white/10 mb-6 group hover:bg-surface-container transition-colors cursor-default">
                  <div className="w-12 h-12 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center shrink-0 border border-border dark:border-white/5 shadow-sm">
                    <span className="material-symbols-outlined text-emerald-500 text-[24px]">account_balance</span>
                  </div>
                  <div>
                    <p className="text-base font-bold text-on-surface dark:text-white">Instant EFT</p>
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Supported by all SA banks</p>
                  </div>
                </div>

                <button className="text-sm font-bold text-primary dark:text-indigo-400 hover:text-primary-fixed dark:hover:text-indigo-300 transition-colors flex items-center gap-2 group w-full justify-center bg-surface-container-low dark:bg-white/5 hover:bg-surface-container dark:hover:bg-white/10 py-3 rounded-xl">
                  View Billing History 
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

          </div>

        </div>
      ) : (
        <div>
          {/* PRE-PURCHASE VIEW: Pricing Grid (Trial / Expired / New users) */}
          {/* ── Current Plan Banner (Trial, Expired, Past Due, Pending) ── */}
          {(isTrial || isExpired || isPastDue || isPendingPayment) && currentSub && (
            <div className={`rounded-2xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border relative overflow-hidden ${
              isExpired
                ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900'
                : isPastDue
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900'
                : isPendingPayment
                ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900'
                : 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900'
            }`}>
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                isExpired ? 'bg-red-500' : isPastDue ? 'bg-amber-500' : isPendingPayment ? 'bg-blue-500' : 'bg-indigo-500'
              }`}></div>
              <div className="flex items-center gap-4 pl-2">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  isExpired ? 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400' :
                  isPastDue ? 'bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400' :
                  isPendingPayment ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' :
                  'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400'
                }`}>
                  <span className="material-symbols-outlined text-[18px]">
                    {isExpired ? 'error' : isPastDue ? 'credit_card_off' : isPendingPayment ? 'pending' : 'hourglass_empty'}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-sm text-on-surface dark:text-white">
                    {currentSub?.plan?.name || 'Starter'} — <span className={
                      isExpired ? 'text-red-600 dark:text-red-400' :
                      isPastDue ? 'text-amber-600 dark:text-amber-400' :
                      isPendingPayment ? 'text-blue-600 dark:text-blue-400' :
                      'text-indigo-600 dark:text-indigo-400'
                    }>
                      {isExpired ? 'Expired' : isPastDue ? 'Grace Period Active' : isPendingPayment ? 'Payment Processing' : `${trialDaysLeft} days left`}
                    </span>
                  </p>
                  <p className="text-xs text-on-surface-variant dark:text-outline mt-0.5">
                    {isTrial ? `Trial started ${formatBillingDate(currentSub?.trialStartDate)}${currentSub?.trialEndDate ? ` · Ends ${formatBillingDate(currentSub?.trialEndDate)}` : ''}` :
                     isPastDue ? 'Your payment failed. Please update your payment method.' :
                     isPendingPayment ? 'Please wait while we verify your payment.' :
                     'Action required on your subscription.'}
                  </p>
                </div>
              </div>
              {isTrial && (
                <button
                  onClick={() => { if (confirm('Are you sure you want to cancel your trial? You will lose access immediately.')) handleCancelSubscription(true); }}
                  className="text-xs font-semibold text-on-surface-variant dark:text-outline border border-border dark:border-dark-border px-4 h-9 rounded-lg hover:bg-surface-container-low dark:hover:bg-white/5 transition-colors shrink-0"
                >
                  Cancel Trial
                </button>
              )}
            </div>
          )}

          <div className="bg-white dark:bg-dark-card border border-[#D97706]/30 dark:border-[#D97706]/20 rounded-2xl p-6 mb-8 flex items-start gap-4 shadow-sm relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#D97706]"></div>
            <div className="w-10 h-10 rounded-full bg-[#D97706]/10 flex items-center justify-center shrink-0 text-[#D97706]">
              <span className="material-symbols-outlined">info</span>
            </div>
            <div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface dark:text-white mb-1 tracking-tight font-semibold">
                {isTrial ? 'Your trial is active' : 
                 isPastDue ? 'Subscription Past Due' : 
                 isPendingPayment ? 'Payment Pending' :
                 isExpired ? 'Your subscription has expired' : 
                 'Choose a Plan'}
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-outline">
                {isPastDue || isPendingPayment ? 'Please resolve your payment issue or select a plan to continue uninterrupted.' :
                 'Please select a plan below to continue using all premium features uninterrupted. Secure payments are processed via Ozow.'}
              </p>
            </div>
          </div>

          <div className="flex justify-center mb-10">
            <div className="inline-flex items-center p-1 bg-surface-container-low dark:bg-dark-canvas border border-border dark:border-dark-border rounded-lg">
              <button
                onClick={() => setBillingInterval('monthly')}
                className={`px-6 h-[40px] rounded-md font-body-sm font-semibold transition-colors ${billingInterval === 'monthly' ? 'bg-white dark:bg-zinc-800 text-on-surface dark:text-white shadow-sm' : 'text-on-surface-variant dark:text-outline hover:text-on-surface'}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingInterval('yearly')}
                className={`px-6 h-[40px] rounded-md font-body-sm font-semibold transition-colors flex items-center gap-2 ${billingInterval === 'yearly' ? 'bg-white dark:bg-zinc-800 text-on-surface dark:text-white shadow-sm' : 'text-on-surface-variant dark:text-outline hover:text-on-surface'}`}
              >
                Annually <span className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider">Save 10%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {plans.map((plan: {
              id: string;
              name: string;
              description?: string;
              billingInterval?: string;
              price: number;
              currency?: string;
              limits?: { maxQueues?: number; maxTokens?: number };
              features?: { whatsappNotifications?: boolean; textToSpeech?: boolean; customBranding?: boolean };
            }) => {
              const price = billingInterval === 'yearly' && plan.billingInterval === 'monthly'
                ? Math.floor(plan.price * 12 * 0.9)
                : plan.price;
              const isPopular = plan.name.toLowerCase().includes('standard') || plan.name.toLowerCase().includes('pro');

              return (
                <div key={plan.id} className={`bg-card dark:bg-dark-card rounded-[24px] border ${isPopular ? 'border-primary shadow-lg shadow-primary/5 dark:shadow-none' : 'border-border dark:border-dark-border'} p-8 flex flex-col relative overflow-hidden`}>
                  {isPopular && (
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-primary"></div>
                  )}
                  {isPopular && (
                    <span className="absolute top-4 right-4 bg-primary text-white font-bold text-[10px] px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                      Most Popular
                    </span>
                  )}

                  <h3 className="font-headline-md text-headline-md text-on-surface dark:text-white mb-2 tracking-tight font-semibold">{plan.name}</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-outline h-10">{plan.description}</p>

                  <div className="my-6">
                    <span className="font-data-mono-lg text-data-mono-lg text-on-surface dark:text-white text-3xl">{plan.currency === 'ZAR' ? 'R' : '$'}{price}</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant dark:text-outline ml-1">/{billingInterval === 'yearly' ? 'year' : 'month'}</span>
                  </div>

                  <button
                    onClick={() => handleUpgradeClick(plan)}
                    disabled={subscribeMutation.isPending || (currentSub?.planId === plan.id) || isPendingPayment}
                    className={`w-full h-[44px] rounded-lg font-body-md font-semibold flex items-center justify-center gap-2 transition-colors mb-8 ${isPopular ? 'bg-primary hover:bg-primary-container text-white' : 'bg-surface-container-high dark:bg-white/10 hover:bg-surface-container-highest dark:hover:bg-white/20 text-on-surface dark:text-white'} disabled:opacity-50`}
                  >
                    {subscribeMutation.isPending && subscribeMutation.variables?.planId === plan.id ? (
                      <Loader2 strokeWidth={1.5} className="w-5 h-5 animate-spin" />
                    ) : null}
                    {currentSub?.planId === plan.id ? 'Current Plan' : isPendingPayment ? 'Payment Pending' : 'Select Plan'}
                  </button>

                  <div className="space-y-4 flex-1">
                    <p className="font-label-caps text-label-caps text-on-surface-variant dark:text-outline uppercase tracking-wider">Features included:</p>
                    <ul className="space-y-4">
                      <li className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-surface-container-highest dark:bg-white/10 flex items-center justify-center text-on-surface dark:text-white mt-0.5">
                          <span className="material-symbols-outlined text-[12px]">check</span>
                        </div>
                        <span className="font-body-sm text-body-sm text-on-surface dark:text-white font-medium">Up to {plan.limits?.maxQueues || 1} Queues</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-surface-container-highest dark:bg-white/10 flex items-center justify-center text-on-surface dark:text-white mt-0.5">
                          <span className="material-symbols-outlined text-[12px]">check</span>
                        </div>
                        <span className="font-body-sm text-body-sm text-on-surface dark:text-white font-medium">Up to {plan.limits?.maxTokens || 500} Tokens/day</span>
                      </li>
                      {plan.features?.whatsappNotifications && (
                        <li className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-surface-container-highest dark:bg-white/10 flex items-center justify-center text-on-surface dark:text-white mt-0.5">
                            <span className="material-symbols-outlined text-[12px]">check</span>
                          </div>
                          <span className="font-body-sm text-body-sm text-on-surface dark:text-white font-medium">WhatsApp Notifications</span>
                        </li>
                      )}
                      {plan.features?.textToSpeech && (
                        <li className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-surface-container-highest dark:bg-white/10 flex items-center justify-center text-on-surface dark:text-white mt-0.5">
                            <span className="material-symbols-outlined text-[12px]">check</span>
                          </div>
                          <span className="font-body-sm text-body-sm text-on-surface dark:text-white font-medium">Audio Announcements</span>
                        </li>
                      )}
                      {plan.features?.customBranding && (
                        <li className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-surface-container-highest dark:bg-white/10 flex items-center justify-center text-on-surface dark:text-white mt-0.5">
                            <span className="material-symbols-outlined text-[12px]">check</span>
                          </div>
                          <span className="font-body-sm text-body-sm text-on-surface dark:text-white font-medium">Custom Branding</span>
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Enterprise Tier Section */}
          <div className="mt-8 bg-[#1f1d2b] rounded-3xl border border-[#3b384f] p-8 md:p-10 flex flex-col md:flex-row items-center justify-between relative text-white gap-8 overflow-hidden shadow-sm">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-[#10b981]/10 rounded-full blur-3xl"></div>

            <div className="flex-1 relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <span className="material-symbols-outlined text-primary text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>domain</span>
                <h3 className="font-headline-lg text-headline-lg text-white tracking-tight font-semibold">Enterprise</h3>
                <span className="bg-white/10 text-white font-label-caps text-label-caps px-2 py-1 rounded-full uppercase tracking-wider ml-2 border border-white/20">Custom Setup</span>
              </div>
              <p className="text-gray-300 font-body-md text-body-md max-w-xl mb-6">
                Tailored infrastructure, SLA guarantees, dedicated support, and custom integrations for large organizations with high-volume requirements.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 max-w-2xl">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#10b981] text-[20px]">check_circle</span>
                  <span className="font-body-sm text-body-sm text-white font-medium">Unlimited Queues & Locations</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#10b981] text-[20px]">check_circle</span>
                  <span className="font-body-sm text-body-sm text-white font-medium">White-labeling & Branding</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#10b981] text-[20px]">check_circle</span>
                  <span className="font-body-sm text-body-sm text-white font-medium">Dedicated Account Manager</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#10b981] text-[20px]">check_circle</span>
                  <span className="font-body-sm text-body-sm text-white font-medium">Custom API & HIS Integrations</span>
                </div>
              </div>
            </div>

            <div className="w-full md:w-auto shrink-0 relative z-10 flex flex-col md:items-end items-center mt-6 md:mt-0 pt-6 md:pt-0 border-t md:border-t-0 md:border-l border-white/10 md:pl-10">
              <div className="mb-6 text-center md:text-right">
                <span className="font-headline-lg text-headline-lg text-white block">Custom</span>
                <span className="font-body-sm text-body-sm text-gray-400 mt-1 block">pricing for your needs</span>
              </div>
              <button
                onClick={() => setShowEnterpriseModal(true)}
                className="w-full md:w-auto px-8 h-[44px] rounded-lg font-body-md font-semibold flex items-center justify-center gap-2 transition-all bg-white hover:bg-gray-100 text-black shadow-sm"
              >
                Contact Sales <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
          </div>

          {!isPaid && <div className="mt-12 text-center p-8 bg-surface-container-lowest border border-border dark:border-dark-border rounded-2xl">
            <h3 className="font-headline-sm text-headline-sm text-primary mb-2 tracking-tight font-bold">Secure Payments with Ozow</h3>
            <p className="font-body-sm text-body-sm text-zinc-700 dark:text-zinc-300 max-w-lg mx-auto font-medium">
              We use Ozow to securely process Instant EFT payments directly from your bank account. Supported banks include Capitec, FNB, Standard Bank, Absa, Nedbank, Investec, TymeBank, African Bank, and Discovery Bank.
            </p>
          </div>}
        </div>
      )}


      {/* Checkout Modal */}
      {checkoutPlan && (
        <div className="fixed inset-0 bg-zinc-950/40 dark:bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-8 pb-6 border-b border-border dark:border-dark-border relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
              <button onClick={() => setCheckoutPlan(null)} className="absolute top-6 right-6 text-on-surface-variant hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
              <h2 className="font-headline-md text-headline-md text-on-surface dark:text-white tracking-tight font-semibold mb-2">Complete Purchase</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-outline">You are upgrading to the <span className="font-bold text-on-surface dark:text-white">{checkoutPlan.name}</span>.</p>
            </div>

            <div className="p-8 bg-surface-container-lowest dark:bg-black/20">
              <div className="flex justify-between items-center mb-6">
                <span className="font-body-md text-on-surface-variant dark:text-outline">Billed {billingInterval}</span>
                <div className="text-right">
                  <span className="font-data-mono-lg text-3xl text-on-surface dark:text-white font-bold">{checkoutPlan.currency === 'ZAR' ? 'R' : '$'}{billingInterval === 'yearly' && checkoutPlan.billingInterval === 'monthly' ? Math.floor(checkoutPlan.price * 12 * 0.9) : checkoutPlan.price}</span>
                  <span className="font-body-sm text-on-surface-variant ml-1">/{billingInterval === 'yearly' ? 'yr' : 'mo'}</span>
                </div>
              </div>

              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3 text-on-surface dark:text-white font-body-sm font-medium">
                  <CheckCircle2 className="w-4 h-4 text-primary" /> {checkoutPlan.limits?.maxQueues || 1} Queues & {checkoutPlan.limits?.maxTokens || 500} Tokens/day
                </div>
                {checkoutPlan.features?.whatsappNotifications && (
                  <div className="flex items-center gap-3 text-on-surface dark:text-white font-body-sm font-medium">
                    <CheckCircle2 className="w-4 h-4 text-primary" /> WhatsApp Integration
                  </div>
                )}
                {checkoutPlan.features?.customBranding && (
                  <div className="flex items-center gap-3 text-on-surface dark:text-white font-body-sm font-medium">
                    <CheckCircle2 className="w-4 h-4 text-primary" /> Custom White-labeling
                  </div>
                )}
              </div>

              <button
                onClick={confirmCheckout}
                disabled={subscribeMutation.isPending || trialMutation.isPending || !!paymentData}
                className="w-full h-[48px] bg-primary hover:bg-primary-container text-white rounded-xl font-body-lg font-semibold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 relative overflow-hidden group"
              >
                {(subscribeMutation.isPending || trialMutation.isPending || !!paymentData) && <div className="absolute inset-0 bg-black/10"></div>}
                {subscribeMutation.isPending || trialMutation.isPending || !!paymentData ? (
                  <Loader2 strokeWidth={1.5} className="w-5 h-5 animate-spin relative z-10" />
                ) : (
                  <span className="material-symbols-outlined text-[20px] relative z-10">lock</span>
                )}
                <span className="relative z-10">{paymentData ? 'Redirecting to Secure Payment...' : checkoutPlan?.price === 0 ? 'Activate Plan' : 'Confirm & Pay with Ozow'}</span>
              </button>
              <p className="text-center font-body-sm text-[11px] text-on-surface-variant dark:text-outline mt-4 font-medium flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-[14px]">shield</span> Secure Instant EFT by Ozow
              </p>

              {/* Hidden auto-submit form for Ozow */}
              {paymentData && (
                <form ref={paymentFormRef} action={paymentData.checkoutUrl || paymentData.paymentUrl} method="POST" target="_self" className="hidden">
                  {ozowFields.map(field => (
                    <input key={field} type="hidden" name={field.charAt(0).toUpperCase() + field.slice(1)} value={String(paymentData[field] ?? '')} />
                  ))}
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Enterprise Contact Modal */}
      {showEnterpriseModal && (
        <div className="fixed inset-0 bg-zinc-950/40 dark:bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-[24px] shadow-lg w-full max-w-lg p-8 relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-headline-md text-headline-md text-on-surface dark:text-white mb-2 tracking-tight font-semibold">Contact Sales</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-outline mb-6">Tell us about your organization's needs, and our enterprise team will reach out to tailor a solution.</p>

            <form onSubmit={(e) => { e.preventDefault(); enterpriseMutation.mutate(enterpriseForm); }} className="space-y-5">
              <div>
                <label className="block font-label-caps text-label-caps text-on-surface-variant dark:text-outline mb-2 uppercase tracking-wide">Your Name *</label>
                <input required type="text" value={enterpriseForm.name} onChange={(e) => setEnterpriseForm({ ...enterpriseForm, name: e.target.value })} className="w-full h-[44px] bg-white dark:bg-zinc-900 border border-border dark:border-dark-border rounded-lg px-4 font-body-md text-body-md focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white" />
              </div>
              <div>
                <label className="block font-label-caps text-label-caps text-on-surface-variant dark:text-outline mb-2 uppercase tracking-wide">Company Name *</label>
                <input required type="text" value={enterpriseForm.companyName} onChange={(e) => setEnterpriseForm({ ...enterpriseForm, companyName: e.target.value })} className="w-full h-[44px] bg-white dark:bg-zinc-900 border border-border dark:border-dark-border rounded-lg px-4 font-body-md text-body-md focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-label-caps text-label-caps text-on-surface-variant dark:text-outline mb-2 uppercase tracking-wide">Email Address *</label>
                  <input required type="email" value={enterpriseForm.email} onChange={(e) => setEnterpriseForm({ ...enterpriseForm, email: e.target.value })} className="w-full h-[44px] bg-white dark:bg-zinc-900 border border-border dark:border-dark-border rounded-lg px-4 font-body-md text-body-md focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white" />
                </div>
                <div>
                  <label className="block font-label-caps text-label-caps text-on-surface-variant dark:text-outline mb-2 uppercase tracking-wide">Phone Number</label>
                  <input type="tel" value={enterpriseForm.phone} onChange={(e) => setEnterpriseForm({ ...enterpriseForm, phone: e.target.value })} className="w-full h-[44px] bg-white dark:bg-zinc-900 border border-border dark:border-dark-border rounded-lg px-4 font-body-md text-body-md focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white" />
                </div>
              </div>
              <div>
                <label className="block font-label-caps text-label-caps text-on-surface-variant dark:text-outline mb-2 uppercase tracking-wide">How can we help? *</label>
                <textarea required rows={4} value={enterpriseForm.message} onChange={(e) => setEnterpriseForm({ ...enterpriseForm, message: e.target.value })} className="w-full bg-white dark:bg-zinc-900 border border-border dark:border-dark-border rounded-lg p-4 font-body-md text-body-md focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white resize-none min-h-[100px]" placeholder="Tell us about your setup..."></textarea>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border dark:border-dark-border">
                <button type="button" onClick={() => setShowEnterpriseModal(false)} className="px-5 h-[44px] border border-border dark:border-dark-border bg-white dark:bg-transparent hover:bg-surface-container-low dark:hover:bg-white/5 text-on-surface dark:text-white rounded-lg font-body-md font-semibold transition-colors">Cancel</button>
                <button type="submit" disabled={enterpriseMutation.isPending} className="px-6 h-[44px] bg-primary hover:bg-primary-container text-white rounded-lg font-body-md font-semibold transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm">
                  {enterpriseMutation.isPending ? <Loader2 strokeWidth={1.5} className="w-4 h-4 animate-spin" /> : <span className="material-symbols-outlined text-[18px]">send</span>}
                  Submit Inquiry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
