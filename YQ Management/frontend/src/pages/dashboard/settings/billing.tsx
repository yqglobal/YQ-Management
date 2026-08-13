import React, { useState, useEffect, useMemo, useRef } from 'react';
import Head from 'next/head';
import SettingsLayout from '../../../components/SettingsLayout';
import { CheckCircle2, AlertCircle, Loader2, Zap, Building2, ArrowRight } from 'lucide-react';
import { fetchApi } from '../../../lib/api';
import { useRouter } from 'next/router';
import { toast } from 'sonner';
import { useMutation, useQuery } from '@tanstack/react-query';

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
  const paymentFormRef = useRef<HTMLFormElement | null>(null);
  const [paymentData, setPaymentData] = useState<OzowPaymentData | null>(null);
  const [billingInterval, setBillingInterval] = useState('monthly');
  const [showEnterpriseModal, setShowEnterpriseModal] = useState(false);
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

  const handleUpgrade = (planId: string) => {
    subscribeMutation.mutate({ planId, billingInterval });
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

  const isActive = currentSub?.status === 'ACTIVE';

  return (
    <SettingsLayout pageTitle="Billing & Subscriptions" pageSubtitle="Manage your plan and payment methods">
      <Head>
        <title>Billing | Qmova</title>
      </Head>

      <div className="max-w-6xl space-y-8 pb-12">


        {statusMessage && (
          <div className={`p-4 rounded-xl border ${statusMessage.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400'} flex items-start gap-3`}>
            {statusMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
            <div>
              <h3 className="font-bold">{statusMessage.type === 'success' ? 'Payment Successful' : 'Payment Failed'}</h3>
              <p className="text-sm opacity-90">{statusMessage.text}</p>
            </div>
          </div>
        )}

        {paymentData && (
          <div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 p-6 rounded-2xl flex flex-col items-center justify-center text-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400 mb-4" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Redirecting to Secure Payment...</h3>
            <p className="text-sm text-gray-600 dark:text-zinc-400 mb-6 max-w-md mx-auto">
              You are being securely redirected to Ozow to complete your payment. If the redirect does not happen automatically in a few seconds, please click the button below.
            </p>
            <form ref={paymentFormRef} action={paymentData.checkoutUrl || paymentData.paymentUrl} method="POST" target="_self">
              {ozowFields.map(field => (
                <input key={field} type="hidden" name={field} value={String(paymentData[field] ?? '')} />
              ))}
              <button type="submit" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md">
                Proceed to Payment Manually
              </button>
            </form>
          </div>
        )}

        {isSubLoading || isPlansLoading ? (
          <div className="flex items-center gap-3 text-gray-500 dark:text-zinc-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading billing info...
          </div>
        ) : isActive ? (
          /* POST-PURCHASE VIEW: Active Plan Details */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Current Plan: {currentSub?.plan?.name || 'Unknown'}</h2>
              </div>

              <div className="mb-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 mb-4">
                  Active Subscription
                </span>
                <p className="text-sm text-gray-500 dark:text-zinc-400 mt-2">
                  Next billing date: <strong className="text-gray-900 dark:text-white">{formatBillingDate(currentSub?.nextBillingDate)}</strong>
                </p>
                <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
                  Interval: <strong className="text-gray-900 dark:text-white capitalize">{currentSub?.billingInterval}</strong>
                </p>
              </div>

              <div className="space-y-3 mb-8">
                <div className="p-4 bg-gray-50 dark:bg-black/30 rounded-xl border border-gray-200 dark:border-white/5">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Plan Limits</h4>
                  <ul className="text-sm text-gray-600 dark:text-zinc-400 space-y-1">
                    <li>Max Queues: {currentSub?.plan?.limits?.maxQueues || 'Unlimited'}</li>
                    <li>Max Tokens/day: {currentSub?.plan?.limits?.maxTokens || 'Unlimited'}</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-2xl p-8">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Payment Information</h2>
              <p className="text-gray-500 dark:text-zinc-400 text-sm mb-6 leading-relaxed">
                Your subscription is currently handled via Ozow Instant EFT. You will receive an invoice and a payment link prior to your next billing cycle.
              </p>
              
              <button className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-900 dark:text-white rounded-xl text-sm font-medium transition-colors">
                View Billing History
              </button>
            </div>
          </div>
        ) : (
          /* PRE-PURCHASE VIEW: Pricing Grid */
          <div>
            <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-yellow-200 dark:border-yellow-500/20 rounded-2xl p-6 mb-8 flex items-start gap-4 shadow-sm dark:shadow-none">
              <div className="w-10 h-10 rounded-xl bg-yellow-50 dark:bg-yellow-500/20 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Your trial {currentSub?.status === 'EXPIRED' ? 'has expired' : 'is active'}</h3>
                <p className="text-gray-600 dark:text-zinc-400 text-sm">Please select a plan below to continue using all premium features uninterrupted. Secure payments are processed via Ozow.</p>
              </div>
            </div>

            <div className="flex justify-center mb-8">
              <div className="inline-flex items-center p-1 bg-gray-100 dark:bg-black/30 rounded-full border border-gray-200 dark:border-white/10">
                <button 
                  onClick={() => setBillingInterval('monthly')}
                  className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${billingInterval === 'monthly' ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'}`}
                >
                  Monthly
                </button>
                <button 
                  onClick={() => setBillingInterval('yearly')}
                  className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${billingInterval === 'yearly' ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'}`}
                >
                  Annually <span className="ml-1 text-emerald-500 text-xs font-bold">-10%</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  <div key={plan.id} className={`bg-white dark:bg-zinc-900/80 rounded-3xl border ${isPopular ? 'border-indigo-500 shadow-xl shadow-indigo-500/10 dark:shadow-none' : 'border-gray-200 dark:border-white/10'} p-8 flex flex-col relative`}>
                    {isPopular && (
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                        Most Popular
                      </div>
                    )}
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{plan.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-zinc-400 h-10">{plan.description}</p>
                    
                    <div className="my-6">
                      <span className="text-4xl font-black text-gray-900 dark:text-white">{plan.currency === 'ZAR' ? 'R' : '$'}{price}</span>
                      <span className="text-gray-500 dark:text-zinc-400 ml-1">/{billingInterval === 'yearly' ? 'year' : 'month'}</span>
                    </div>

                    <button 
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={subscribeMutation.isPending || plan.price === 0}
                      className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all mb-8 ${isPopular ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-black'} disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {subscribeMutation.isPending && subscribeMutation.variables?.planId === plan.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : null}
                      {plan.price === 0 ? 'Current Plan' : 'Upgrade via Ozow'}
                    </button>

                    <div className="space-y-4 flex-1">
                      <p className="text-xs font-semibold text-gray-900 dark:text-zinc-300 uppercase tracking-wider">What is included:</p>
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="text-gray-600 dark:text-zinc-400 text-sm">Up to {plan.limits?.maxQueues || 1} Queues</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="text-gray-600 dark:text-zinc-400 text-sm">Up to {plan.limits?.maxTokens || 500} Tokens/day</span>
                      </div>
                      {plan.features?.whatsappNotifications && (
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="text-gray-600 dark:text-zinc-400 text-sm">WhatsApp Notifications</span>
                        </div>
                      )}
                      {plan.features?.textToSpeech && (
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="text-gray-600 dark:text-zinc-400 text-sm">Text-to-Speech Announcements</span>
                        </div>
                      )}
                      {plan.features?.customBranding && (
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="text-gray-600 dark:text-zinc-400 text-sm">Custom Branding</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {/* Enterprise Tier Card */}
              <div className="bg-gradient-to-b from-gray-900 to-black dark:from-zinc-900/90 dark:to-zinc-950 rounded-3xl border border-gray-800 dark:border-white/10 p-8 flex flex-col relative text-white">
                <div className="absolute top-0 right-8 -translate-y-1/2 bg-white text-black text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> Custom
                </div>
                <h3 className="text-xl font-bold mb-2">Enterprise</h3>
                <p className="text-sm text-gray-400 h-10">Tailored infrastructure, SLA guarantees, and dedicated support.</p>
                
                <div className="my-6">
                  <span className="text-4xl font-black">Custom</span>
                  <span className="text-gray-400 ml-1">pricing</span>
                </div>

                <button 
                  onClick={() => setShowEnterpriseModal(true)}
                  className="w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all mb-8 bg-white hover:bg-gray-100 text-black"
                >
                  Contact Sales
                </button>

                <div className="space-y-4 flex-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">What is included:</p>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-300">Unlimited Queues & Locations</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-300">Unlimited Tokens</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-300">White-labeling & Custom Branding</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-300">Dedicated Account Manager & SLA</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-300">Custom API & HIS Integrations</span>
                  </div>
                </div>
              </div>

            </div>
            
            <div className="mt-12 text-center p-6 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10">
              <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-2">Secure Payments with Ozow</h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mb-4 max-w-lg mx-auto">
                We use Ozow to securely process Instant EFT payments directly from your bank account. Supported banks include Capitec, FNB, Standard Bank, Absa, Nedbank, Investec, TymeBank, African Bank, and Discovery Bank.
              </p>
            </div>
          </div>
        )}

      </div>

      {/* Enterprise Contact Modal */}
      {showEnterpriseModal && (
        <div className="fixed inset-0 bg-zinc-950/40 dark:bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-3xl shadow-2xl w-full max-w-lg p-8" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Contact Sales</h2>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6">Tell us about your organization's needs, and our enterprise team will reach out to tailor a solution.</p>
            
            <form onSubmit={(e) => { e.preventDefault(); enterpriseMutation.mutate(enterpriseForm); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Your Name *</label>
                <input required type="text" value={enterpriseForm.name} onChange={(e) => setEnterpriseForm({...enterpriseForm, name: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Company Name *</label>
                <input required type="text" value={enterpriseForm.companyName} onChange={(e) => setEnterpriseForm({...enterpriseForm, companyName: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Email Address *</label>
                  <input required type="email" value={enterpriseForm.email} onChange={(e) => setEnterpriseForm({...enterpriseForm, email: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Phone Number</label>
                  <input type="tel" value={enterpriseForm.phone} onChange={(e) => setEnterpriseForm({...enterpriseForm, phone: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">How can we help? *</label>
                <textarea required rows={4} value={enterpriseForm.message} onChange={(e) => setEnterpriseForm({...enterpriseForm, message: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white resize-none" placeholder="Tell us about your setup, required integrations, and estimated volume..."></textarea>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowEnterpriseModal(false)} className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-900 dark:text-white rounded-xl text-sm font-medium transition-colors">Cancel</button>
                <button type="submit" disabled={enterpriseMutation.isPending} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50">
                  {enterpriseMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  Submit Inquiry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SettingsLayout>
  );
}
