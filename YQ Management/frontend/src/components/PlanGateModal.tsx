import React, { useState, useEffect, useRef, useMemo } from 'react';
import { fetchApi } from '../lib/api';
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, Zap, Shield, Star, Crown, ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface PlanGateModalProps {
  mode?: 'no-plan' | 'expired';
}

function getTierIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes('enterprise')) return <Crown className="w-4 h-4 md:w-5 md:h-5 text-amber-400" />;
  if (n.includes('premium') || n.includes('pro')) return <Crown className="w-4 h-4 md:w-5 md:h-5 text-indigo-400" />;
  if (n.includes('standard')) return <Star className="w-4 h-4 md:w-5 md:h-5 text-sky-400" />;
  return <Zap className="w-4 h-4 md:w-5 md:h-5 text-indigo-400" />;
}

function formatCurrency(price: number, currency: string = 'ZAR') {
  const normalized = price >= 1000 ? Math.round(price / 100) : price;
  const symbol = currency === 'ZAR' ? 'R' : '$';
  return `${symbol}${normalized.toLocaleString('en-ZA')}`;
}

export function PlanGateModal({ mode = 'no-plan' }: PlanGateModalProps) {
  const queryClient = useQueryClient();
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [trialAgreed, setTrialAgreed] = useState(false);
  const [activatingTrialPlanId, setActivatingTrialPlanId] = useState<string | null>(null);
  const paymentFormRef = useRef<HTMLFormElement | null>(null);
  const [paymentData, setPaymentData] = useState<AnyFixMe>(null);
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

  // When expired, trial plan NEVER appears. All other plans (Standard, Premium, Enterprise) MUST appear.
  const freePlan = mode === 'expired'
    ? null
    : (plans as AnyFixMe[]).find((p: AnyFixMe) => p.price === 0 || p.type === 'TRIAL');

  const paidPlans = (plans as AnyFixMe[]).filter((p: AnyFixMe) => {
    const isTrial = p.price === 0 || p.type === 'TRIAL' || p.id === freePlan?.id;
    return !isTrial;
  });

  const handleStartTrial = (planId: string) => {
    if (!trialAgreed) {
      toast.error('Please confirm you agree to start the 14-day free trial.');
      return;
    }
    setActivatingTrialPlanId(planId);
    trialMutation.mutate(planId);
  };

  const handlePurchase = (plan: AnyFixMe) => {
    subscribeMutation.mutate({ planId: plan.id, billingInterval });
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center overflow-hidden p-3 md:p-6">
      {/* Background blur + gradient */}
      <div className="absolute inset-0 bg-zinc-950/92 backdrop-blur-2xl" />
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/30 via-zinc-950/20 to-purple-950/30 pointer-events-none" />

      {/* Animated ambient glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[140px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-[120px] animate-pulse pointer-events-none" style={{ animationDelay: '1s' }} />

      <div className="relative z-10 w-full max-w-6xl max-h-[96vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] flex flex-col justify-between gap-3.5 md:gap-5 py-4 md:py-6 px-4 md:px-8 bg-zinc-900/60 border border-white/10 rounded-3xl backdrop-blur-xl shadow-2xl">
        {!showForcedTrial && (
          <button 
            onClick={() => setShowForcedTrial(true)} 
            className="absolute top-3.5 right-3.5 md:top-5 md:right-5 p-1.5 md:p-2 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/5" 
            title="Close"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}

        {showForcedTrial ? (
          <div className="flex flex-col items-center justify-center text-center py-8 max-w-md mx-auto animate-in zoom-in-95 duration-300">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 mb-4 shadow-xl shadow-amber-500/10">
              <span className="material-symbols-outlined text-[28px]">warning</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
              {mode === 'expired' ? 'Action Required' : 'Trial Will Start Automatically'}
            </h2>
            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
              {mode === 'expired' 
                ? 'Your subscription or trial has expired. You must select a plan to continue accessing your queues and service desk.'
                : "If you don't select a plan now, your 14-day free trial will begin immediately. The platform remains locked without an active plan or trial."}
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
              <button 
                onClick={() => setShowForcedTrial(false)} 
                className="w-full h-11 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm transition-all"
              >
                Choose a Plan
              </button>
              {mode === 'expired' && (
                <Link 
                  href="/dashboard/settings" 
                  className="w-full h-11 flex items-center justify-center rounded-xl bg-transparent border border-white/10 hover:bg-white/5 text-zinc-300 font-medium text-sm transition-all"
                >
                  Manage Settings
                </Link>
              )}
              {mode !== 'expired' && (
                <button 
                  onClick={() => { setTrialAgreed(true); freePlan && handleStartTrial(freePlan.id); }} 
                  disabled={trialMutation.isPending} 
                  className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-semibold text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                >
                  {trialMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Accept Trial'}
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="text-center pt-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-bold uppercase tracking-wider mb-2">
                <Sparkles className="w-3 h-3" />
                {mode === 'expired' ? 'Subscription Expired' : 'Choose Your Plan'}
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-1">
                {mode === 'expired' ? 'Renew to Continue' : 'Get Started with Qmova'}
              </h1>
              <p className="text-zinc-400 text-xs md:text-sm max-w-lg mx-auto">
                {mode === 'expired'
                  ? 'Your workspace access has ended. Select an active plan below to restore full service desk and queuing capabilities.'
                  : 'Start your 14-day free trial or choose a plan to unlock your workspace. No credit card required for the trial.'}
              </p>
            </div>

            {/* Billing interval toggle */}
            <div className="flex justify-center">
              <div className="inline-flex items-center p-1 bg-white/5 border border-white/10 rounded-xl">
                <button
                  onClick={() => setBillingInterval('monthly')}
                  className={`px-4 md:px-5 h-8 rounded-lg text-xs font-semibold transition-all ${billingInterval === 'monthly' ? 'bg-white/15 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingInterval('yearly')}
                  className={`px-4 md:px-5 h-8 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${billingInterval === 'yearly' ? 'bg-white/15 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
                >
                  Annually <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-emerald-500/30">Save 10%</span>
                </button>
              </div>
            </div>

            {plansLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
              </div>
            ) : (
              <div className={`grid grid-cols-1 md:grid-cols-2 ${
                (freePlan ? 1 : 0) + paidPlans.length === 1 ? 'max-w-sm mx-auto' : 
                (freePlan ? 1 : 0) + paidPlans.length === 2 ? 'max-w-2xl mx-auto' : 
                (freePlan ? 1 : 0) + paidPlans.length === 4 ? 'lg:grid-cols-4' :
                'lg:grid-cols-3'
              } gap-3 md:gap-4 w-full`}>
                {/* Free Trial card (only in no-plan mode) */}
                {freePlan && (
                  <div className="relative flex flex-col p-4 md:p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all justify-between">
                    <div>
                      <div className="flex items-center gap-2.5 mb-3">
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center border border-indigo-500/20 shrink-0">
                          {getTierIcon(freePlan.name)}
                        </div>
                        <div>
                          <h3 className="text-white font-bold text-sm md:text-base">{freePlan.name}</h3>
                          <p className="text-zinc-500 text-[11px]">14-day free trial</p>
                        </div>
                      </div>

                      <div className="mb-3.5">
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl md:text-3xl font-bold text-white">Free</span>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-0.5">No credit card required</p>
                      </div>

                      {(() => {
                        const freeLimits: any = typeof freePlan.limits === 'string' ? JSON.parse(freePlan.limits) : (freePlan.limits || {});
                        return (
                          <ul className="space-y-1.5 mb-4">
                            <li className="flex items-center gap-2 text-zinc-300 text-xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                              Up to {freeLimits?.maxLocations ?? 1} location{freeLimits?.maxLocations === 1 ? '' : 's'}
                            </li>
                            <li className="flex items-center gap-2 text-zinc-300 text-xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                              Up to {freeLimits?.maxServices ?? 5} services
                            </li>
                            <li className="flex items-center gap-2 text-zinc-300 text-xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                              {freeLimits?.maxTokens ?? 10000} tokens/month
                            </li>
                            <li className="flex items-center gap-2 text-zinc-300 text-xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                              Up to {freeLimits?.maxStaff ?? freeLimits?.maxMembers ?? 3} staff
                            </li>
                          </ul>
                        );
                      })()}
                    </div>

                    <div>
                      <label className="flex items-start gap-2 mb-3 cursor-pointer p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/8 transition-colors">
                        <input
                          type="checkbox"
                          checked={trialAgreed}
                          onChange={(e) => setTrialAgreed(e.target.checked)}
                          className="w-3.5 h-3.5 mt-0.5 rounded border-zinc-600 text-indigo-500 focus:ring-indigo-500 bg-zinc-800"
                        />
                        <span className="text-[11px] text-zinc-400 leading-snug">
                          I agree to start my 14-day free trial.
                        </span>
                      </label>

                      <button
                        onClick={() => freePlan && handleStartTrial(freePlan.id)}
                        disabled={trialMutation.isPending || !trialAgreed}
                        className="w-full h-10 rounded-xl font-semibold text-xs md:text-sm transition-all bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/20"
                      >
                        {trialMutation.isPending && activatingTrialPlanId === freePlan.id
                          ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Starting trial...</>
                          : <><Sparkles className="w-3.5 h-3.5" /> Start Free Trial</>
                        }
                      </button>
                    </div>
                  </div>
                )}

                {/* Paid plans: Standard, Premium, Enterprise */}
                {paidPlans.map((plan: AnyFixMe) => {
                  const isPopular = plan.name.toLowerCase().includes('premium') || plan.name.toLowerCase().includes('pro');
                  const isEnterprise = plan.name.toLowerCase().includes('enterprise');

                  const rawMonthly = plan.price >= 1000 ? Math.round(plan.price / 100) : plan.price;
                  const rawAnnual = plan.annualPrice && plan.annualPrice >= 1000 ? Math.round(plan.annualPrice / 100) : (plan.annualPrice || 0);

                  const displayPrice = billingInterval === 'yearly' && rawAnnual > 0
                    ? rawAnnual
                    : billingInterval === 'yearly'
                      ? Math.floor(rawMonthly * 12 * 0.9)
                      : rawMonthly;

                  const savingsAmount = billingInterval === 'yearly'
                    ? Math.max(0, (rawMonthly * 12) - displayPrice)
                    : 0;

                  const isPurchasing = subscribeMutation.isPending && (subscribeMutation.variables as AnyFixMe)?.planId === plan.id;
                  const pLimits: any = typeof plan.limits === 'string' ? JSON.parse(plan.limits) : (plan.limits || {});

                  return (
                    <div
                      key={plan.id}
                      className={`relative flex flex-col justify-between p-4 md:p-5 rounded-2xl transition-all group ${
                        isPopular
                          ? 'bg-gradient-to-b from-indigo-900/40 via-purple-900/20 to-zinc-900/80 border-2 border-indigo-500/60 shadow-xl shadow-indigo-500/15 hover:border-indigo-400'
                          : isEnterprise
                            ? 'bg-gradient-to-b from-amber-950/20 via-zinc-900/40 to-zinc-900/80 border border-amber-500/30 hover:border-amber-500/50'
                            : 'bg-white/5 border border-white/10 hover:border-white/25'
                      }`}
                    >
                      {isPopular && (
                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[9px] font-extrabold px-3 py-0.5 rounded-full uppercase tracking-wider shadow-md">
                          Most Popular
                        </div>
                      )}
                      {isEnterprise && (
                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          Enterprise
                        </div>
                      )}

                      <div>
                        <div className="flex items-center gap-2.5 mb-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 ${
                            isPopular 
                              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' 
                              : isEnterprise
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                : 'bg-white/8 text-zinc-300 border-white/10'
                          }`}>
                            {getTierIcon(plan.name)}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-white font-bold text-sm md:text-base truncate">{plan.name}</h3>
                            <p className="text-zinc-500 text-[11px] truncate">{plan.description || 'Full workspace access'}</p>
                          </div>
                        </div>

                        <div className="mb-3.5">
                          <div className="flex items-baseline gap-1">
                            <span className={`text-2xl md:text-3xl font-extrabold ${isPopular ? 'text-indigo-300' : isEnterprise ? 'text-amber-200' : 'text-white'}`}>
                              {plan.currency === 'ZAR' ? 'R' : '$'}{displayPrice.toLocaleString('en-ZA')}
                            </span>
                            <span className="text-zinc-500 text-xs font-medium">/{billingInterval === 'yearly' ? 'year' : 'month'}</span>
                          </div>
                          {billingInterval === 'yearly' && savingsAmount > 0 ? (
                            <p className="text-[11px] text-emerald-400 mt-0.5 font-medium">Save {formatCurrency(savingsAmount, plan.currency)}/year</p>
                          ) : (
                            <p className="text-[11px] text-zinc-500 mt-0.5">Billed {billingInterval}</p>
                          )}
                        </div>

                        <ul className="space-y-1.5 mb-4">
                          <li className="flex items-center gap-2 text-zinc-300 text-xs">
                            <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isPopular ? 'text-indigo-400' : isEnterprise ? 'text-amber-400' : 'text-zinc-400'}`} />
                            Up to {pLimits?.maxLocations ?? (isEnterprise ? 10 : 1)} location{(pLimits?.maxLocations ?? 1) === 1 ? '' : 's'}
                          </li>
                          <li className="flex items-center gap-2 text-zinc-300 text-xs">
                            <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isPopular ? 'text-indigo-400' : isEnterprise ? 'text-amber-400' : 'text-zinc-400'}`} />
                            Up to {pLimits?.maxServices ?? (isEnterprise ? 100 : 5)} services
                          </li>
                          <li className="flex items-center gap-2 text-zinc-300 text-xs">
                            <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isPopular ? 'text-indigo-400' : isEnterprise ? 'text-amber-400' : 'text-zinc-400'}`} />
                            {(pLimits?.maxTokens ?? (isEnterprise ? 100000 : 1000)).toLocaleString()} tokens/day
                          </li>
                          <li className="flex items-center gap-2 text-zinc-300 text-xs">
                            <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isPopular ? 'text-indigo-400' : isEnterprise ? 'text-amber-400' : 'text-zinc-400'}`} />
                            Up to {pLimits?.maxStaff ?? pLimits?.maxMembers ?? (isEnterprise ? 100 : 5)} staff
                          </li>
                          {plan.features?.whatsappNotifications && (
                            <li className="flex items-center gap-2 text-zinc-300 text-xs">
                              <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isPopular ? 'text-indigo-400' : isEnterprise ? 'text-amber-400' : 'text-zinc-400'}`} />
                              WhatsApp Notifications
                            </li>
                          )}
                          {plan.features?.customBranding && (
                            <li className="flex items-center gap-2 text-zinc-300 text-xs">
                              <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isPopular ? 'text-indigo-400' : isEnterprise ? 'text-amber-400' : 'text-zinc-400'}`} />
                              Custom Branding
                            </li>
                          )}
                        </ul>
                      </div>

                      <button
                        onClick={() => handlePurchase(plan)}
                        disabled={isPurchasing || !!paymentData}
                        className={`w-full h-10 rounded-xl font-semibold text-xs md:text-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                          isPopular
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md shadow-indigo-500/25'
                            : isEnterprise
                              ? 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white shadow-md shadow-amber-600/20'
                              : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                        }`}
                      >
                        {isPurchasing || (!!paymentData && (subscribeMutation.variables as AnyFixMe)?.planId === plan.id)
                          ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {paymentData ? 'Redirecting...' : 'Processing...'}</>
                          : <><Shield className="w-3.5 h-3.5" /> Get {plan.name} <ArrowRight className="w-3 h-3" /></>
                        }
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bottom bar: Security & Read Only settings link */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-white/10 text-xs text-zinc-400">
              <div className="flex items-center gap-1.5 text-zinc-500 text-[11px]">
                <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Secure payments via Ozow Instant EFT · Capitec, FNB, Standard Bank, Absa, Nedbank</span>
              </div>
              {mode === 'expired' && (
                <Link
                  href="/dashboard/settings"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 underline underline-offset-4 transition-colors shrink-0"
                >
                  <span className="material-symbols-outlined text-[15px]">settings</span>
                  Manage Data & Settings (Read Only)
                </Link>
              )}
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
