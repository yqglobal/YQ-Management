import React, { useEffect, useState } from 'react';
import { X, Zap, CheckCircle2, ArrowRight, Sparkles, Shield, Globe, MessageSquare, BarChart3, Palette, Webhook, Calendar, MapPin } from 'lucide-react';
import Link from 'next/link';
import { usePlan } from '../hooks/usePlan';
import { useAuth } from './AuthContext';

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
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [storageKey, setStorageKey] = useState('');

  if (user && !['SUPER_ADMIN', 'OWNER', 'ADMIN'].includes(user.role)) {
    return null;
  }

  useEffect(() => {
    if (plan.isLoading) return;
    if (!plan.planName && !plan.isTrialActive) {
      if (onDismiss) onDismiss();
      return;
    }

    const key = getWelcomeStorageKey(null, `${plan.planName}_${plan.status}`);
    setStorageKey(key);

    if (typeof window === 'undefined') return;
    const seen = localStorage.getItem(key);
    if (!seen) {
      setVisible(true);
    } else {
      if (onDismiss) onDismiss();
    }
  }, [plan.isLoading, plan.planName, plan.status, plan.isTrialActive]);

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
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
      onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
    >
      <div className="relative bg-white dark:bg-[#1a1a1a] rounded-3xl shadow-xl dark:shadow-[0_0_80px_-20px_rgba(0,0,0,1)] border border-zinc-200 dark:border-white/5 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
        
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white z-20"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Section */}
        <div className="relative p-8 pb-6 border-b border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-[#202020]">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-4xl filter drop-shadow-lg">{emoji}</span>
            <div>
              <p className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-0.5">
                {plan.isTrialActive ? "You're on a" : 'Welcome to'}
              </p>
              <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">{displayPlan} Plan</h2>
            </div>
          </div>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
            {plan.isTrialActive
              ? `You have ${plan.trialDaysLeft} day${plan.trialDaysLeft !== 1 ? 's' : ''} to explore all features. Here's what's included:`
              : "Here's everything included in your plan. Let's get you set up!"}
          </p>
        </div>

        {/* Bottom Section */}
        <div className="p-8 pt-6">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">
            Included in your plan
          </p>
          
          {enabledFeatures.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 mb-6">
              {enabledFeatures.map((key) => {
                const def = FEATURE_DISPLAY[key];
                const Icon = def.icon;
                
                return (
                  <div
                    key={key}
                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-100 dark:border-white/5 hover:bg-zinc-100 dark:hover:bg-white/[0.04] transition-colors"
                  >
                    <div className={`w-8 h-8 rounded-xl ${def.bgColor} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-4 h-4 ${def.color}`} style={{ color: 'currentColor' }} />
                    </div>
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      {def.label}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mb-6 p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <p className="text-sm text-indigo-200 leading-relaxed">
                You have full access to all features during your trial. Explore everything — queues, appointments, WhatsApp, branding and more!
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 mb-6 text-xs text-zinc-500">
            <Shield className="w-3.5 h-3.5 shrink-0" />
            <span>Your data is encrypted and secure. Cancel anytime.</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={dismiss}
              className="flex-1 bg-zinc-900 dark:bg-white/10 hover:bg-zinc-800 dark:hover:bg-white/15 text-white font-semibold py-3.5 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" /> Get Started
            </button>
            <Link
              href="/dashboard/settings/billing"
              onClick={dismiss}
              className="bg-transparent hover:bg-zinc-100 dark:hover:bg-white/5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white font-semibold py-3.5 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 border border-zinc-200 dark:border-white/5"
            >
              Plans <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
