import React, { useEffect, useState } from 'react';
import { X, Zap, CheckCircle2, ArrowRight, Sparkles, Shield, Globe, MessageSquare, BarChart3, Palette, Webhook, Calendar, MapPin } from 'lucide-react';
import Link from 'next/link';
import { usePlan } from '../hooks/usePlan';

// Maps a PlanFeatures key → display info shown in the welcome modal
const FEATURE_DISPLAY: Record<string, { icon: React.FC<AnyFixMe>; label: string; color: string; bgColor: string }> = {
  whatsappNotifications: { icon: MessageSquare, label: 'WhatsApp Notifications', color: 'text-emerald-600', bgColor: 'bg-emerald-50 dark:bg-emerald-500/10' },
  whatsappChat:          { icon: MessageSquare, label: 'WhatsApp Live Chat',      color: 'text-emerald-700', bgColor: 'bg-emerald-50 dark:bg-emerald-500/10' },
  whatsappChatbot:       { icon: Zap,           label: 'AI WhatsApp Chatbot',     color: 'text-violet-600',  bgColor: 'bg-violet-50 dark:bg-violet-500/10' },
  customBranding:        { icon: Palette,       label: 'Custom Branding',         color: 'text-purple-600',  bgColor: 'bg-purple-50 dark:bg-purple-500/10' },
  multiLocation:         { icon: MapPin,        label: 'Multi-Location',           color: 'text-indigo-600',  bgColor: 'bg-indigo-50 dark:bg-indigo-500/10' },
  advancedAnalytics:     { icon: BarChart3,     label: 'Advanced Analytics',      color: 'text-cyan-600',    bgColor: 'bg-cyan-50 dark:bg-cyan-500/10' },
  appointmentsModule:    { icon: Calendar,      label: 'Appointments & Booking',  color: 'text-rose-600',    bgColor: 'bg-rose-50 dark:bg-rose-500/10' },
  apiAccess:             { icon: Webhook,       label: 'API & Webhooks',          color: 'text-amber-600',   bgColor: 'bg-amber-50 dark:bg-amber-500/10' },
  textToSpeech:          { icon: Globe,         label: 'TV Text-to-Speech',       color: 'text-blue-600',    bgColor: 'bg-blue-50 dark:bg-blue-500/10' },
};

const PLAN_GRADIENTS: Record<string, string> = {
  trial:      'from-indigo-600 to-violet-600',
  free:       'from-zinc-600 to-zinc-700',
  standard:   'from-blue-600 to-indigo-600',
  pro:        'from-indigo-600 to-violet-600',
  enterprise: 'from-amber-500 to-orange-600',
};

const PLAN_EMOJI: Record<string, string> = {
  trial:      '🚀',
  free:       '⚡',
  standard:   '✨',
  pro:        '💎',
  enterprise: '👑',
};

function getWelcomeStorageKey(subscriptionId: string | null | undefined, planName: string | null) {
  // Key includes both subscription ID (if available) and plan name to catch plan changes
  return `plan_welcomed_${subscriptionId || 'none'}_${planName || 'free'}`;
}

export function PlanWelcomeModal({ onDismiss }: { onDismiss?: () => void }) {
  const plan = usePlan();
  const [visible, setVisible] = useState(false);
  const [storageKey, setStorageKey] = useState('');

  useEffect(() => {
    if (plan.isLoading) return;
    if (!plan.planName && !plan.isTrialActive) return;

    // We need the subscription ID from the billing endpoint — proxy via window.__sub_id__ set by usePlan
    // For simplicity we use planName + status as the dedup key
    const key = getWelcomeStorageKey(null, `${plan.planName}_${plan.status}`);
    setStorageKey(key);

    if (typeof window === 'undefined') return;
    const seen = localStorage.getItem(key);
    if (!seen) {
      // Small delay so the modal appears after the dashboard loads
      const t = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(t);
    } else {
      if (onDismiss) onDismiss();
    }
  }, [plan.isLoading, plan.planName, plan.status]);

  const dismiss = () => {
    if (storageKey) localStorage.setItem(storageKey, '1');
    setVisible(false);
    if (onDismiss) onDismiss();
  };

  if (!visible) return null;

  const tier = plan.planTier || (plan.isTrialActive ? 'trial' : 'free');
  const gradient = PLAN_GRADIENTS[tier] || PLAN_GRADIENTS.standard;
  const emoji = PLAN_EMOJI[tier] || '✨';
  const displayPlan = plan.isTrialActive ? 'Free Trial' : (plan.planName || 'Starter');

  // Enabled features to show
  const enabledFeatures = Object.entries(plan.features)
    .filter(([, enabled]) => enabled === true)
    .map(([key]) => key)
    .filter((key) => key in FEATURE_DISPLAY);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
    >
      <div className="relative bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header gradient band */}
        <div className={`bg-gradient-to-r ${gradient} px-8 pt-10 pb-8 text-white`}>
          <button
            onClick={dismiss}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">{emoji}</span>
            <div>
              <p className="text-sm font-semibold text-white/70 uppercase tracking-widest">
                {plan.isTrialActive ? 'You\'re on a' : 'Welcome to'}
              </p>
              <h2 className="text-2xl font-black tracking-tight">{displayPlan} Plan</h2>
            </div>
          </div>

          <p className="text-white/80 text-sm leading-relaxed">
            {plan.isTrialActive
              ? `You have ${plan.trialDaysLeft} day${plan.trialDaysLeft !== 1 ? 's' : ''} to explore all features. Here's what's included:`
              : "Here's everything included in your plan. Let's get you set up!"}
          </p>
        </div>

        {/* Features grid */}
        <div className="px-8 py-6">
          {enabledFeatures.length > 0 ? (
            <>
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-4">
                Included in your plan
              </p>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {enabledFeatures.map((key) => {
                  const def = FEATURE_DISPLAY[key];
                  const Icon = def.icon;
                  return (
                    <div
                      key={key}
                      className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-zinc-800 hover:border-gray-200 dark:hover:border-zinc-700 transition-colors"
                    >
                      <div className={`w-8 h-8 rounded-lg ${def.bgColor} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-4 h-4 ${def.color}`} />
                      </div>
                      <span className="text-sm font-medium text-gray-800 dark:text-zinc-200 leading-snug">
                        {def.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="mb-6 p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl border border-indigo-100 dark:border-indigo-500/20 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <p className="text-sm text-indigo-700 dark:text-indigo-300 leading-relaxed">
                You have full access to all features during your trial. Explore everything — queues, appointments, WhatsApp, branding and more!
              </p>
            </div>
          )}

          {/* Security note */}
          <div className="flex items-center gap-2 mb-6 text-xs text-zinc-400 dark:text-zinc-500">
            <Shield className="w-3.5 h-3.5 shrink-0" />
            <span>Your data is encrypted and secure. Cancel anytime.</span>
          </div>

          {/* CTAs */}
          <div className="flex gap-3">
            <button
              onClick={dismiss}
              className={`flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r ${gradient} text-white font-bold rounded-xl hover:opacity-90 transition-opacity shadow-lg`}
            >
              <CheckCircle2 className="w-4 h-4" />
              Get Started
            </button>
            <Link
              href="/dashboard/settings/billing"
              onClick={dismiss}
              className="flex items-center justify-center gap-1.5 px-4 py-3 bg-gray-50 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-xl border border-gray-200 dark:border-zinc-700 font-medium text-sm transition-colors"
            >
              Plans
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
