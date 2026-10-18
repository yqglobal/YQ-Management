import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../lib/api';

export type PlanStatus = 'TRIAL' | 'ACTIVE' | 'PENDING_PAYMENT' | 'CANCELLED' | 'EXPIRED' | 'PAST_DUE';

export interface PlanLimits {
  maxServices: number;
  maxQueues: number;
  maxTokens: number; // per month
  maxLocations: number;
  maxMembers: number;
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
  webhooks?: boolean;
}

export interface UsePlanResult {
  status: PlanStatus | null;
  planName: string | null;
  planTier: 'free' | 'standard' | 'pro' | 'enterprise' | null;
  isTrialActive: boolean;
  trialDaysLeft: number;
  limits: PlanLimits;
  features: PlanFeatures;
  usage: { queues: number; tokensThisMonth: number; locations: number; services: number; members: number };
  frozenCounts: { queues: number; locations: number; services: number; members: number };
  trialPermanentlyUsed: boolean;
  isFeatureEnabled: (key: keyof PlanFeatures) => boolean;
  isAtQueueLimit: boolean;
  isAtServiceLimit: boolean;
  isAtLocationLimit: boolean;
  isAtTokenLimit: boolean;
  isAtMemberLimit: boolean;
  queueUsagePct: number;
  serviceUsagePct: number;
  locationUsagePct: number;
  tokenUsagePct: number;
  memberUsagePct: number;
  subscriptionEndDate: Date | null;
  isLoading: boolean;
  canAccess: boolean; // false when expired/cancelled
  hasNoPlan: boolean; // true when status === null and user has a tenantId (needs to pick a plan)
}

const DEFAULT_LIMITS: PlanLimits = { maxTokens: 100, maxLocations: 1, maxServices: 5, maxQueues: 5, maxMembers: 2 };
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
    queryFn: () => fetchApi('/visits').then((res: any) => res.data || res).catch(() => []),
    staleTime: 30_000,
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => fetchApi('/location').catch(() => []),
    staleTime: 30_000,
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => fetchApi('/service').catch(() => []),
    staleTime: 30_000,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['staff'], // the queryKey used in team.tsx for users
    queryFn: () => fetchApi('/users').catch(() => []),
    staleTime: 30_000,
  });

  return useMemo((): UsePlanResult => {
    const rawStatus = (sub?.status as PlanStatus) ?? null;
    const isTrialExpired =
      rawStatus === 'TRIAL' &&
      Boolean(sub?.trialEndDate && new Date(sub.trialEndDate) <= new Date());
    const status: PlanStatus | null = isTrialExpired ? 'EXPIRED' : rawStatus;
    const canAccess =
      (status === null ||
        status === 'TRIAL' ||
        status === 'ACTIVE' ||
        status === 'PAST_DUE' ||
        status === 'PENDING_PAYMENT') &&
      !isTrialExpired;
    const plan = sub?.plan;
    const planNameRaw: string | null = plan?.name ?? null;
    const planName: string | null = canAccess ? planNameRaw : 'Free';
    const planTier = guessTier(planName ?? undefined);
    const rawLimits = plan?.limits;
    const parsedLimitsRaw = typeof rawLimits === 'string' ? JSON.parse(rawLimits) : rawLimits;
    
    // Parse backend limits accurately without stomping on distinct fields
    const parsedLimits: Partial<PlanLimits> = {};
    if (parsedLimitsRaw) {
      if (parsedLimitsRaw.maxServices !== undefined) {
        parsedLimits.maxServices = Number(parsedLimitsRaw.maxServices);
      } else if (parsedLimitsRaw.maxQueues !== undefined) {
        parsedLimits.maxServices = Number(parsedLimitsRaw.maxQueues);
      }

      if (parsedLimitsRaw.maxQueues !== undefined) {
        parsedLimits.maxQueues = Number(parsedLimitsRaw.maxQueues);
      } else if (parsedLimitsRaw.maxServices !== undefined) {
        parsedLimits.maxQueues = Number(parsedLimitsRaw.maxServices);
      }

      if (parsedLimitsRaw.maxLocations !== undefined) {
        parsedLimits.maxLocations = Number(parsedLimitsRaw.maxLocations);
      }

      if (parsedLimitsRaw.maxStaff !== undefined) {
        parsedLimits.maxMembers = Number(parsedLimitsRaw.maxStaff);
      } else if (parsedLimitsRaw.maxMembers !== undefined) {
        parsedLimits.maxMembers = Number(parsedLimitsRaw.maxMembers);
      }

      if (parsedLimitsRaw.maxTokens !== undefined) {
        parsedLimits.maxTokens = Number(parsedLimitsRaw.maxTokens);
      } else if (parsedLimitsRaw.maxVisits !== undefined) {
        parsedLimits.maxTokens = Number(parsedLimitsRaw.maxVisits);
      }
    }
    
    // Super Admin overrides from metadata take precedence
    const customLimits = (sub?.metadata as any)?.customLimits || {};
    const normalizedCustomLimits: Partial<PlanLimits> = {};
    if (customLimits.maxServices !== undefined) normalizedCustomLimits.maxServices = Number(customLimits.maxServices);
    if (customLimits.maxQueues !== undefined) normalizedCustomLimits.maxQueues = Number(customLimits.maxQueues);
    if (customLimits.maxLocations !== undefined) normalizedCustomLimits.maxLocations = Number(customLimits.maxLocations);
    if (customLimits.maxStaff !== undefined) normalizedCustomLimits.maxMembers = Number(customLimits.maxStaff);
    if (customLimits.maxMembers !== undefined) normalizedCustomLimits.maxMembers = Number(customLimits.maxMembers);
    if (customLimits.maxTokens !== undefined) normalizedCustomLimits.maxTokens = Number(customLimits.maxTokens);
    if (customLimits.maxVisits !== undefined) normalizedCustomLimits.maxTokens = Number(customLimits.maxVisits);

    const limits: PlanLimits = { 
      ...DEFAULT_LIMITS, 
      ...parsedLimits,
      ...normalizedCustomLimits 
    };

    const rawFeatures = plan?.features;
    const parsedFeatures = typeof rawFeatures === 'string' ? JSON.parse(rawFeatures) : rawFeatures;
    
    // Super Admin overrides from metadata take precedence
    const customFeatures = (sub?.metadata as any)?.customFeatures || {};
    const features: PlanFeatures = { 
      ...DEFAULT_FEATURES, 
      ...(parsedFeatures as Partial<PlanFeatures> ?? {}),
      ...customFeatures 
    };

    const isTrialActive = status === 'TRIAL';
    // Use trialEndDate for trial days (not currentPeriodEnd which may be overwritten on activation)
    const trialEndRaw = sub?.trialEndDate ?? sub?.currentPeriodEnd;
    const subscriptionEndDate: Date | null = sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null;
    
    let trialDaysLeft = 0;
    if (isTrialActive && trialEndRaw) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const end = new Date(trialEndRaw);
      end.setHours(0, 0, 0, 0);
      trialDaysLeft = Math.max(0, Math.round((end.getTime() - today.getTime()) / 86400000));
    }

    // Usage
    const queueCount = Array.isArray(queues) ? queues.length : 0;
    const locationCount = Array.isArray(locations) ? locations.length : 0;
    const serviceCount = Array.isArray(services) ? services.length : 0;
    const memberCount = Array.isArray(members) ? members.filter((m: { status?: string; isInvite?: boolean; frozenByQuota?: boolean }) => m.status === 'ACTIVE' || m.isInvite).length : 0;

    const frozenQueues = Array.isArray(queues) ? queues.filter((q: { frozenByQuota?: boolean }) => q.frozenByQuota).length : 0;
    const frozenLocations = Array.isArray(locations) ? locations.filter((l: { frozenByQuota?: boolean }) => l.frozenByQuota).length : 0;
    const frozenServices = Array.isArray(services) ? services.filter((s: { frozenByQuota?: boolean }) => s.frozenByQuota).length : 0;
    const frozenMembers = Array.isArray(members) ? members.filter((m: { status?: string; isInvite?: boolean; frozenByQuota?: boolean }) => m.frozenByQuota).length : 0;

    const trialPermanentlyUsed = Boolean(sub?.trialEndDate && new Date(sub.trialEndDate) < new Date()) || (status === 'EXPIRED') || Boolean(sub?.metadata?.downgradedFrom);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const tokensThisMonth = Array.isArray(visits)
      ? visits.filter((v: { createdAt?: string }) => v.createdAt && new Date(v.createdAt) >= monthStart).length
      : 0;

    const queueUsagePct = limits.maxQueues > 0 ? Math.min(100, (queueCount / Math.max(1, limits.maxQueues)) * 100) : 0;
    const serviceUsagePct = limits.maxServices > 0 ? Math.min(100, (serviceCount / Math.max(1, limits.maxServices)) * 100) : 0;
    const locationUsagePct = limits.maxLocations > 0 ? Math.min(100, (locationCount / Math.max(1, limits.maxLocations)) * 100) : 0;
    const tokenUsagePct = limits.maxTokens > 0 ? Math.min(100, (tokensThisMonth / Math.max(1, limits.maxTokens)) * 100) : 0;
    const memberUsagePct = limits.maxMembers > 0 ? Math.min(100, (memberCount / Math.max(1, limits.maxMembers)) * 100) : 0;

    const isAtQueueLimit = queueCount >= limits.maxQueues && limits.maxQueues > 0;
    const isAtServiceLimit = serviceCount >= limits.maxServices && limits.maxServices > 0;
    const isAtLocationLimit = locationCount >= limits.maxLocations && limits.maxLocations > 0;
    const isAtTokenLimit = tokensThisMonth >= limits.maxTokens && limits.maxTokens > 0;
    const isAtMemberLimit = memberCount >= limits.maxMembers && limits.maxMembers > 0;

    // If status is null (no subscription found — e.g. SUPER_ADMIN or API error), grant access by default.
    // Only block access when we explicitly know the subscription is EXPIRED or CANCELLED.
    const hasNoPlan = status === null;

    return {
      status,
      planName,
      planTier,
      isTrialActive,
      trialDaysLeft,
      limits,
      features,
      usage: { queues: queueCount, tokensThisMonth, locations: locationCount, services: serviceCount, members: memberCount },
      frozenCounts: { queues: frozenQueues, locations: frozenLocations, services: frozenServices, members: frozenMembers },
      trialPermanentlyUsed,
      isFeatureEnabled: (key: keyof PlanFeatures) => Boolean(features[key] && canAccess),
      isAtQueueLimit,
      isAtServiceLimit,
      isAtLocationLimit,
      isAtTokenLimit,
      isAtMemberLimit,
      queueUsagePct,
      serviceUsagePct,
      locationUsagePct,
      tokenUsagePct,
      memberUsagePct,
      subscriptionEndDate,
      isLoading: subLoading,
      canAccess,
      hasNoPlan,
    };
  }, [sub, queues, visits, locations, services, members, subLoading]);
}
