import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../lib/api';

export type PlanStatus = 'TRIAL' | 'ACTIVE' | 'PENDING_PAYMENT' | 'CANCELLED' | 'EXPIRED' | 'PAST_DUE';

export interface PlanLimits {
  maxQueues: number;
  maxTokens: number; // per month
}

export interface PlanFeatures {
  whatsappNotifications?: boolean;
  whatsappChat?: boolean;
  whatsappChatbot?: boolean;
  advancedAnalytics?: boolean;
  customBranding?: boolean;
  apiAccess?: boolean;
  textToSpeech?: boolean;
  appointmentsModule?: boolean;
  multiLocation?: boolean;
  customDomain?: boolean;
}

export interface UsePlanResult {
  status: PlanStatus | null;
  planName: string | null;
  planTier: 'free' | 'standard' | 'pro' | 'enterprise' | null;
  isTrialActive: boolean;
  trialDaysLeft: number;
  limits: PlanLimits;
  features: PlanFeatures;
  usage: { queues: number; tokensThisMonth: number };
  isFeatureEnabled: (key: keyof PlanFeatures) => boolean;
  isAtQueueLimit: boolean;
  isAtTokenLimit: boolean;
  queueUsagePct: number;
  tokenUsagePct: number;
  subscriptionEndDate: Date | null;
  isLoading: boolean;
  canAccess: boolean; // false when expired/cancelled
}

const DEFAULT_LIMITS: PlanLimits = { maxQueues: 1, maxTokens: 100 };
const DEFAULT_FEATURES: PlanFeatures = { whatsappNotifications: false };

function guessTier(planName?: string): UsePlanResult['planTier'] {
  if (!planName) return 'free';
  const n = planName.toLowerCase();
  if (n.includes('enterprise')) return 'enterprise';
  if (n.includes('pro') || n.includes('premium')) return 'pro';
  if (n.includes('standard') || n.includes('basic')) return 'standard';
  return 'free';
}

export function usePlan(): UsePlanResult {
  const { data: sub, isLoading: subLoading } = useQuery({
    queryKey: ['billing-subscription'],
    queryFn: () => fetchApi('/billing/subscriptions/current').catch(() => null),
    staleTime: 60_000,
    retry: false,
  });

  const { data: queues = [] } = useQuery({
    queryKey: ['queues'],
    queryFn: () => fetchApi('/queue').catch(() => []),
    staleTime: 30_000,
  });

  const { data: visits = [] } = useQuery({
    queryKey: ['visits'],
    queryFn: () => fetchApi('/visits').catch(() => []),
    staleTime: 30_000,
  });

  return useMemo((): UsePlanResult => {
    const status = (sub?.status as PlanStatus) ?? null;
    const plan = sub?.plan;
    const planName: string | null = plan?.name ?? null;
    const planTier = guessTier(planName ?? undefined);
    const rawLimits = plan?.limits;
    const parsedLimits = typeof rawLimits === 'string' ? JSON.parse(rawLimits) : rawLimits;
    const limits: PlanLimits = { ...DEFAULT_LIMITS, ...(parsedLimits as Partial<PlanLimits> ?? {}) };
    const rawFeatures = plan?.features;
    const parsedFeatures = typeof rawFeatures === 'string' ? JSON.parse(rawFeatures) : rawFeatures;
    const features: PlanFeatures = { ...DEFAULT_FEATURES, ...(parsedFeatures as Partial<PlanFeatures> ?? {}) };

    const isTrialActive = status === 'TRIAL';
    const subscriptionEndDate: Date | null = sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null;
    
    let trialDaysLeft = 0;
    if (isTrialActive && subscriptionEndDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const end = new Date(subscriptionEndDate);
      end.setHours(0, 0, 0, 0);
      trialDaysLeft = Math.max(0, Math.round((end.getTime() - today.getTime()) / 86400000));
    }

    // Usage
    const queueCount = Array.isArray(queues) ? queues.length : 0;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const tokensThisMonth = Array.isArray(visits)
      ? visits.filter((v: any) => v.createdAt && new Date(v.createdAt) >= monthStart).length
      : 0;

    const queueUsagePct = limits.maxQueues > 0 ? Math.min(100, (queueCount / limits.maxQueues) * 100) : 0;
    const tokenUsagePct = limits.maxTokens > 0 ? Math.min(100, (tokensThisMonth / limits.maxTokens) * 100) : 0;

    // If status is null (no subscription found — e.g. SUPER_ADMIN or API error), grant access by default.
    // Only block access when we explicitly know the subscription is EXPIRED or CANCELLED.
    const canAccess = status === null || status === 'TRIAL' || status === 'ACTIVE' || status === 'PAST_DUE' || status === 'PENDING_PAYMENT';

    return {
      status,
      planName,
      planTier,
      isTrialActive,
      trialDaysLeft,
      limits,
      features,
      usage: { queues: queueCount, tokensThisMonth },
      isFeatureEnabled: (key) => isTrialActive || features[key] === true,
      isAtQueueLimit: queueCount >= limits.maxQueues,
      isAtTokenLimit: tokensThisMonth >= limits.maxTokens,
      queueUsagePct,
      tokenUsagePct,
      subscriptionEndDate,
      isLoading: subLoading,
      canAccess,
    };
  }, [sub, queues, visits, subLoading]);
}
