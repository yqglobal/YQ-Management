import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../lib/api';
import { Lock, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface PremiumFeatureGateProps {
  featureKey: string;
  featureName: string;
  description: string;
  children: React.ReactNode;
}

export function PremiumFeatureGate({ featureKey, featureName, description, children }: PremiumFeatureGateProps) {
  const { data: currentSub, isLoading } = useQuery({
    queryKey: ['current-subscription'],
    queryFn: () => fetchApi('/billing/subscriptions/current'),
  });

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500 animate-pulse">Checking feature access...</div>;
  }

  // If status is TRIAL, we can grant access to everything, OR we check the plan features.
  // Assuming plan features are in currentSub.plan.features
  const isTrial = currentSub?.status === 'TRIAL';
  const hasFeature = currentSub?.plan?.features?.[featureKey] === true;
  
  // Grant access if they have the feature explicitly in their plan, or if they are on an active Trial
  const hasAccess = isTrial || hasFeature;

  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="w-20 h-20 bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-yellow-100 dark:border-yellow-500/20">
        <Lock className="w-10 h-10" />
      </div>
      <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-3">
        {featureName} is a Premium Feature
      </h2>
      <p className="text-gray-500 dark:text-zinc-400 max-w-md mx-auto mb-8 leading-relaxed">
        {description} Upgrade your plan to unlock this and other advanced capabilities.
      </p>
      
      <Link href="/dashboard/settings/billing">
        <span className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-black font-bold rounded-xl transition-all shadow-md">
          View Plans & Upgrade <ArrowRight className="w-4 h-4" />
        </span>
      </Link>
    </div>
  );
}
