import React from 'react';
import { usePlan, PlanFeatures } from '../../hooks/usePlan';
import { useAuth } from '../AuthContext';
import { Lock } from 'lucide-react';
import Link from 'next/link';

interface FeatureGuardProps {
  featureKey: keyof PlanFeatures;
  featureName: string;
  description?: string;
  children: React.ReactNode;
}

export function FeatureGuard({ featureKey, featureName, description, children }: FeatureGuardProps) {
  const { user } = useAuth();
  const plan = usePlan();

  // Super admins bypass feature flags
  const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.email?.toLowerCase() === 'yqbuddysa@gmail.com';
  
  if (isSuperAdmin || plan.isFeatureEnabled(featureKey)) {
    return <>{children}</>;
  }

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-white dark:bg-zinc-950 border border-gray-200 dark:border-white/10 p-8 sm:p-12 flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-6">
        <Lock className="w-8 h-8 text-gray-400 dark:text-zinc-500" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        {featureName} Not Available
      </h3>
      <p className="text-gray-500 dark:text-zinc-400 max-w-md mb-8">
        {description || `This feature is not included in your current plan. Upgrade your subscription to unlock ${featureName} and other premium features.`}
      </p>
      {user?.role === 'ADMIN' || user?.role === 'TENANT_ADMIN' ? (
        <Link 
          href="/dashboard/settings?tab=billing" 
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors shadow-sm"
        >
          View Plans & Upgrade
        </Link>
      ) : (
        <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
          Please contact your administrator to upgrade.
        </p>
      )}
    </div>
  );
}
