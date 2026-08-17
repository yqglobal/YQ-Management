import React from 'react';
import { Lock, Zap, ArrowRight, Star } from 'lucide-react';
import Link from 'next/link';
import { usePlan, PlanFeatures } from '../hooks/usePlan';

interface PremiumFeatureGateProps {
  featureKey: keyof PlanFeatures;
  featureName: string;
  description: string;
  children: React.ReactNode;
}

export function PremiumFeatureGate({ featureKey, featureName, description, children }: PremiumFeatureGateProps) {
  const plan = usePlan();

  if (plan.isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Trial users get access to everything; active subscribers check feature flag
  const hasAccess = plan.isTrialActive || plan.isFeatureEnabled(featureKey);

  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <div className="relative flex flex-col items-center justify-center py-20 px-4 text-center overflow-hidden rounded-2xl">
      {/* Radial glow background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary) / 0.4) 0%, transparent 70%)',
          }}
        />
        {/* Floating stars */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute opacity-30"
            style={{
              top: `${15 + i * 13}%`,
              left: `${10 + (i % 3) * 35}%`,
              animation: `pulse ${2 + i * 0.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.4}s`,
            }}
          >
            <Star className="w-3 h-3 text-primary fill-primary" />
          </div>
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center">
        {/* Icon */}
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 dark:border-primary/20 flex items-center justify-center shadow-lg shadow-primary/10">
            <Lock className="w-9 h-9 text-primary" strokeWidth={1.5} />
          </div>
          {/* Glow ring */}
          <div className="absolute inset-0 rounded-2xl border border-primary/20 scale-110 animate-ping opacity-30" />
        </div>

        {/* Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-widest mb-4">
          <Zap className="w-3 h-3 fill-primary" />
          Premium Feature
        </div>

        <h2 className="text-2xl font-black text-on-surface dark:text-white tracking-tight mb-3">
          {featureName}
        </h2>
        <p className="text-on-surface-variant dark:text-zinc-400 max-w-sm mx-auto mb-8 leading-relaxed">
          {description} Upgrade your plan to unlock this and other powerful capabilities.
        </p>

        {/* Plan tier callout */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-surface-container dark:bg-zinc-900 border border-border dark:border-zinc-800 mb-8 w-full max-w-xs">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-white fill-white" />
          </div>
          <div className="text-left">
            <p className="text-xs text-on-surface-variant dark:text-zinc-500">Your current plan</p>
            <p className="text-sm font-bold text-on-surface dark:text-white capitalize">{plan.planName || 'Free'}</p>
          </div>
          <div className="ml-auto text-xs font-semibold text-amber-600 dark:text-amber-400 whitespace-nowrap">
            Upgrade →
          </div>
        </div>

        <Link href="/dashboard/settings/billing">
          <span className="group inline-flex items-center gap-2.5 px-7 py-3.5 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5">
            View Plans & Upgrade
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </span>
        </Link>
      </div>
    </div>
  );
}
