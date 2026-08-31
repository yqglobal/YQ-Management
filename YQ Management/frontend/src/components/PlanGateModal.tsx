import React, { useState, useEffect, useRef, useMemo } from 'react';
import { fetchApi } from '../lib/api';
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, Zap, Shield, Star, Crown, ArrowRight, Sparkles } from 'lucide-react';

interface PlanGateModalProps {
  mode?: 'no-plan' | 'expired';
}

const TIER_ICONS: Record<string, React.ReactNode> = {
  starter: <Zap className="w-5 h-5" />,
  standard: <Star className="w-5 h-5" />,
  premium: <Crown className="w-5 h-5" />,
  pro: <Crown className="w-5 h-5" />,
};

function getTierIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes('premium') || n.includes('pro')) return TIER_ICONS.premium;
  if (n.includes('standard')) return TIER_ICONS.standard;
  return TIER_ICONS.starter;
}

function formatCurrency(price: number, currency?: string) {
  return `${currency === 'ZAR' ? 'R' : '$'}${price}`;
}

export function PlanGateModal({ mode = 'no-plan' }: PlanGateModalProps) {
  const queryClient = useQueryClient();
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [trialAgreed, setTrialAgreed] = useState(false);
  const [activatingTrialPlanId, setActivatingTrialPlanId] = useState<string | null>(null);
  const paymentFormRef = useRef<HTMLFormElement | null>(null);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [showForcedTrial, setShowForcedTrial] = useState(false);

  const ozowFields = useMemo<Array<string>>(
    () => ['siteCode', 'countryCode', 'currencyCode', 'amount', 'transactionReference', 'bankReference', 'cancelUrl', 'errorUrl', 'successUrl', 'notifyUrl', 'isTest', 'hashCheck'],
    [],
  );

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['active-plans'],
    queryFn: () => fetchApi('/billing/plans?status=ACTIVE'),
  });

  const trialMutation = useMutation({
    mutationFn: (planId: string) =>
      fetchApi('/billing/subscriptions/trial', {
        method: 'POST',
        body: JSON.stringify({ planId }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['billing-subscription'] });
      await queryClient.invalidateQueries({ queryKey: ['current-subscription'] });
      toast.success('Free trial started! Welcome to Qmova.');
      setActivatingTrialPlanId(null);
    },
    onError: () => {
      toast.error('Failed to start trial. Please try again.');
      setActivatingTrialPlanId(null);
    },
  });

  const subscribeMutation = useMutation({
    mutationFn: (data: { planId: string; billingInterval: string }) =>
      fetchApi('/payments/generate-link', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (data) => {
      setPaymentData(data);
    },
    onError: () => {
      toast.error('Error generating payment link. Please try again.');
    },
  });

  useEffect(() => {
    if (paymentData) {
      const t = window.setTimeout(() => {
        try { paymentFormRef.current?.requestSubmit(); } catch {
          try { paymentFormRef.current?.submit(); } catch (e) { console.error(e); }
        }
      }, 100);
      return () => window.clearTimeout(t);
    }
  }, [paymentData]);

  const nonEnterprisePlans = (plans as any[]).filter((p: any) => !p.name.toLowerCase().includes('enterprise'));
  const freePlan = nonEnterprisePlans.find((p: any) => p.price === 0);
  const paidPlans = nonEnterprisePlans.filter((p: any) => p.price > 0);

  const handleStartTrial = (planId: string) => {
    if (!trialAgreed) {
      toast.error('Please confirm you agree to start the 14-day free trial.');
      return;
    }
    setActivatingTrialPlanId(planId);
    trialMutation.mutate(planId);
  };

  const handlePurchase = (plan: any) => {
    subscribeMutation.mutate({ planId: plan.id, billingInterval });
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center overflow-hidden">
      {/* Background blur + gradient */}
      <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-xl" />
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/40 via-transparent to-purple-950/30 pointer-events-none" />

      {/* Animated ambient glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-[100px] animate-pulse pointer-events-none" style={{ animationDelay: '1s' }} />

      <div className="relative z-10 w-full max-w-4xl mx-4 max-h-[95vh] overflow-y-auto flex flex-col gap-8 py-8 px-4 md:px-6">
        {!showForcedTrial && (
          <button onClick={() => setShowForcedTrial(true)} className="absolute top-4 right-4 md:top-6 md:right-6 p-2 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/5" title="Close">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        )}

        {showForcedTrial ? (
          <div className="flex flex-col items-center justify-center text-center py-12 max-w-md mx-auto animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 mb-6 shadow-xl shadow-amber-500/10">
              <span className="material-symbols-outlined text-[32px]">warning</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Trial Will Start Automatically</h2>
            <p className="text-zinc-400 mb-8 leading-relaxed">
              If you don't select a plan now, your 14-day free trial will begin immediately. The platform remains locked without an active plan or trial.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
              <button onClick={() => setShowForcedTrial(false)} className="w-full h-12 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-all">
                Choose a Plan
              </button>
              <button 
                onClick={() => { setTrialAgreed(true); freePlan && handleStartTrial(freePlan.id); }} 
                disabled={trialMutation.isPending} 
                className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
              >
                {trialMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Accept Trial'}
              </button>
            </div>
          </div>
        ) : (
          <>
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            {mode === 'expired' ? 'Subscription Expired' : 'Choose Your Plan'}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-3">
            {mode === 'expired' ? 'Renew to Continue' : 'Get Started with Qmova'}
          </h1>
          <p className="text-zinc-400 text-base md:text-lg max-w-xl mx-auto leading-relaxed">
            {mode === 'expired'
              ? 'Your access has expired. Choose a plan below to restore full access to your workspace.'
              : 'Start your 14-day free trial or choose a plan to unlock your workspace. No credit card required for the trial.'}
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center">
          <div className="inline-flex items-center p-1 bg-white/5 border border-white/10 rounded-xl">
            <button
              onClick={() => setBillingInterval('monthly')}
              className={`px-6 h-9 rounded-lg text-sm font-semibold transition-all ${billingInterval === 'monthly' ? 'bg-white/15 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval('yearly')}
              className={`px-6 h-9 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${billingInterval === 'yearly' ? 'bg-white/15 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
            >
              Annually <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">Save 10%</span>
            </button>
          </div>
        </div>

        {plansLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Free Trial card first */}
            {freePlan && (
              <div className="relative flex flex-col p-6 rounded-3xl bg-white/5 border border-white/10 hover:border-white/20 transition-all group">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                    {getTierIcon(freePlan.name)}
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-base">{freePlan.name}</h3>
                    <p className="text-zinc-500 text-xs">14-day free trial</p>
                  </div>
                </div>

                <div className="mb-5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white">Free</span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">No credit card required</p>
                </div>

                <ul className="space-y-2.5 mb-6 flex-1">
                  <li className="flex items-center gap-2.5 text-zinc-300 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                    Up to {freePlan.limits?.maxQueues ?? 1} queues
                  </li>
                  <li className="flex items-center gap-2.5 text-zinc-300 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                    {freePlan.limits?.maxTokens ?? 100} tokens/day
                  </li>
                  <li className="flex items-center gap-2.5 text-zinc-300 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                    Full feature access during trial
                  </li>
                </ul>

                <label className="flex items-start gap-3 mb-4 cursor-pointer p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/8 transition-colors">
                  <input
                    type="checkbox"
                    checked={trialAgreed}
                    onChange={(e) => setTrialAgreed(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-zinc-600 text-indigo-500 focus:ring-indigo-500 bg-zinc-800"
                  />
                  <span className="text-xs text-zinc-400 leading-relaxed">
                    I agree to start my 14-day free trial. No credit card required.
                  </span>
                </label>

                <button
                  onClick={() => freePlan && handleStartTrial(freePlan.id)}
                  disabled={trialMutation.isPending || !trialAgreed}
                  className="w-full h-11 rounded-xl font-semibold text-sm transition-all bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                >
                  {trialMutation.isPending && activatingTrialPlanId === freePlan.id
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Starting trial...</>
                    : <><Sparkles className="w-4 h-4" /> Start Free Trial</>
                  }
                </button>
              </div>
            )}

            {/* Paid plans */}
            {paidPlans.map((plan: any) => {
              const isPopular = plan.name.toLowerCase().includes('standard') || plan.name.toLowerCase().includes('pro');
              const displayPrice = billingInterval === 'yearly' && plan.billingInterval === 'monthly'
                ? Math.floor(plan.price * 12 * 0.9)
                : plan.price;
              const isPurchasing = subscribeMutation.isPending && (subscribeMutation.variables as any)?.planId === plan.id;

              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col p-6 rounded-3xl transition-all group ${
                    isPopular
                      ? 'bg-gradient-to-b from-indigo-900/40 to-purple-900/20 border-2 border-indigo-500/50 shadow-xl shadow-indigo-500/10 hover:border-indigo-400/70'
                      : 'bg-white/5 border border-white/10 hover:border-white/25'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[10px] font-bold px-4 py-1 rounded-full uppercase tracking-wider shadow-lg">
                      Most Popular
                    </div>
                  )}

                  <div className="flex items-center gap-2.5 mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${isPopular ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-white/8 text-zinc-300 border-white/10'}`}>
                      {getTierIcon(plan.name)}
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-base">{plan.name}</h3>
                      <p className="text-zinc-500 text-xs">{plan.description || 'Full access'}</p>
                    </div>
                  </div>

                  <div className="mb-5">
                    <div className="flex items-baseline gap-1">
                      <span className={`text-3xl font-bold ${isPopular ? 'text-indigo-300' : 'text-white'}`}>
                        {plan.currency === 'ZAR' ? 'R' : '$'}{displayPrice}
                      </span>
                      <span className="text-zinc-500 text-sm">/{billingInterval === 'yearly' ? 'year' : 'month'}</span>
                    </div>
                    {billingInterval === 'yearly' && (
                      <p className="text-xs text-emerald-400 mt-1">Save {formatCurrency(Math.ceil(plan.price * 12 * 0.1), plan.currency)} per year</p>
                    )}
                  </div>

                  <ul className="space-y-2.5 mb-6 flex-1">
                    <li className="flex items-center gap-2.5 text-zinc-300 text-sm">
                      <CheckCircle2 className={`w-4 h-4 shrink-0 ${isPopular ? 'text-indigo-400' : 'text-zinc-500'}`} />
                      Up to {plan.limits?.maxQueues ?? 1} queues
                    </li>
                    <li className="flex items-center gap-2.5 text-zinc-300 text-sm">
                      <CheckCircle2 className={`w-4 h-4 shrink-0 ${isPopular ? 'text-indigo-400' : 'text-zinc-500'}`} />
                      {plan.limits?.maxTokens ?? 100} tokens/day
                    </li>
                    {plan.features?.whatsappNotifications && (
                      <li className="flex items-center gap-2.5 text-zinc-300 text-sm">
                        <CheckCircle2 className={`w-4 h-4 shrink-0 ${isPopular ? 'text-indigo-400' : 'text-zinc-500'}`} />
                        WhatsApp Notifications
                      </li>
                    )}
                    {plan.features?.textToSpeech && (
                      <li className="flex items-center gap-2.5 text-zinc-300 text-sm">
                        <CheckCircle2 className={`w-4 h-4 shrink-0 ${isPopular ? 'text-indigo-400' : 'text-zinc-500'}`} />
                        Audio Announcements
                      </li>
                    )}
                    {plan.features?.customBranding && (
                      <li className="flex items-center gap-2.5 text-zinc-300 text-sm">
                        <CheckCircle2 className={`w-4 h-4 shrink-0 ${isPopular ? 'text-indigo-400' : 'text-zinc-500'}`} />
                        Custom Branding
                      </li>
                    )}
                  </ul>

                  <button
                    onClick={() => handlePurchase(plan)}
                    disabled={isPurchasing || !!paymentData}
                    className={`w-full h-11 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
                      isPopular
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25'
                        : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                    }`}
                  >
                    {isPurchasing || (!!paymentData && (subscribeMutation.variables as any)?.planId === plan.id)
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> {paymentData ? 'Redirecting...' : 'Processing...'}</>
                      : <><Shield className="w-4 h-4" /> Get {plan.name} <ArrowRight className="w-3.5 h-3.5" /></>
                    }
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Security note */}
        <div className="text-center pb-4">
          <p className="text-zinc-600 text-xs flex items-center justify-center gap-2">
            <Shield className="w-3.5 h-3.5 text-zinc-500" />
            Secure payments processed by Ozow Instant EFT · Supported banks: Capitec, FNB, Standard Bank, Absa, Nedbank
          </p>
        </div>

        {/* Hidden auto-submit form for Ozow */}
        {paymentData && (
          <form ref={paymentFormRef} action={paymentData.checkoutUrl || paymentData.paymentUrl} method="POST" target="_self" className="hidden">
            {ozowFields.map(field => (
              <input key={field} type="hidden" name={field.charAt(0).toUpperCase() + field.slice(1)} value={String(paymentData[field] ?? '')} />
            ))}
          </form>
        )}
          </>
        )}
      </div>
    </div>
  );
}
