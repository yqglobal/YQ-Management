import React, { useEffect, useState } from 'react';
import { X, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from './AuthContext';

export interface FeatureNudgeProps {
  /** Must match a key from PlanFeatures — used for localStorage dedup */
  featureKey: string;
  /** The short message to display */
  message: string;
  /** Label for the CTA button */
  ctaLabel: string;
  /** Where the CTA navigates */
  ctaHref: string;
  /** Optional override class for positioning (default: static block) */
  className?: string;
}

function getNudgeStorageKey(tenantId: string, featureKey: string) {
  return `nudge_dismissed_${tenantId}_${featureKey}`;
}

/**
 * FeatureNudge
 *
 * A dismissible inline banner prompting the user to configure a plan feature
 * they haven't used yet (e.g. "You have Custom Branding — add your logo!").
 *
 * Dismissal is persisted in localStorage and never reappears for that tenant.
 */
export function FeatureNudge({ featureKey, message, ctaLabel, ctaHref, className = '' }: FeatureNudgeProps) {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user?.tenantId || typeof window === 'undefined') return;
    const key = getNudgeStorageKey(user.tenantId, featureKey);
    if (!localStorage.getItem(key)) {
      setVisible(true);
    }
  }, [user?.tenantId, featureKey]);

  const dismiss = () => {
    if (!user?.tenantId) return;
    const key = getNudgeStorageKey(user.tenantId, featureKey);
    localStorage.setItem(key, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className={`
        group relative flex items-center gap-4 px-5 py-4
        bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-500/10 dark:to-violet-500/10
        border border-indigo-200 dark:border-indigo-500/25
        rounded-2xl shadow-sm
        animate-in slide-in-from-top-1 fade-in duration-300
        ${className}
      `}
    >
      {/* Sparkle icon */}
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20">
        <Sparkles className="w-4 h-4 text-white" />
      </div>

      {/* Message */}
      <p className="flex-1 text-sm text-indigo-900 dark:text-indigo-200 font-medium leading-snug">
        {message}
      </p>

      {/* CTA */}
      <Link
        href={ctaHref}
        className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
        onClick={dismiss}
      >
        {ctaLabel}
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>

      {/* Dismiss */}
      <button
        onClick={dismiss}
        className="shrink-0 w-7 h-7 flex items-center justify-center text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-lg transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
