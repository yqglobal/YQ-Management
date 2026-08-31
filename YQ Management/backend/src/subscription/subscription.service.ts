import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubscriptionDto } from './dto/subscription.dto';
import { UpgradeSubscriptionDto } from './dto/subscription.dto';
import { DowngradeSubscriptionDto } from './dto/subscription.dto';
import { CancelSubscriptionDto } from './dto/subscription.dto';
import { ResumeSubscriptionDto } from './dto/subscription.dto';
import { Subscription, Plan } from '@prisma/client';
import { SubscriptionStatus } from '@prisma/client';
import { BillingException } from '../billing/errors/billing-exceptions';
import { EmailService } from '../email/email.service';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async getSubscription(
    tenantId: string,
  ): Promise<(Subscription & { plan: Plan }) | null> {
    const sub = await this.prisma.subscription.findUnique({
      where: { tenantId },
      include: {
        plan: true,
      },
    });

    return sub;
  }

  async checkLimit(
    tenantId: string,
    resource: 'queues' | 'locations' | 'visits',
    currentCount: number,
  ): Promise<void> {
    const sub = await this.getSubscription(tenantId);
    if (!sub || !sub.plan) return;

    if (
      sub.status !== SubscriptionStatus.ACTIVE &&
      sub.status !== SubscriptionStatus.TRIAL
    ) {
      throw new BillingException(
        'Active subscription required to add resources',
      );
    }

    const limitsStr = sub.plan.limits;
    const parsedLimits =
      typeof limitsStr === 'string' ? JSON.parse(limitsStr) : limitsStr || {};
    const maxQueues = parsedLimits?.maxQueues ?? sub.plan.maxQueues;

    if (resource === 'queues') {
      if (maxQueues !== undefined && maxQueues !== null) {
        if (currentCount >= maxQueues) {
          throw new BillingException(
            `Queue limit reached (${maxQueues}) for your current plan. Please upgrade to add more queues.`,
          );
        }
      }
    }

    if (resource === 'locations') {
      const maxLocations = parsedLimits?.maxLocations;
      if (maxLocations !== undefined && maxLocations !== null) {
        if (currentCount >= maxLocations) {
          throw new BillingException(
            `Location limit reached (${maxLocations}) for your current plan. Please upgrade to add more locations.`,
          );
        }
      }
    }

    // FIX (2C): Enforce visit/token quota against the plan's maxVisits limit or limits.maxTokens.
    if (resource === 'visits') {
      const maxVisits = sub.plan.maxVisits ?? parsedLimits?.maxTokens;

      if (maxVisits !== undefined && maxVisits !== null) {
        if (currentCount >= maxVisits) {
          throw new BillingException(
            `Visit limit reached (${maxVisits}) for your current plan. Please upgrade to allow more visits.`,
          );
        }
      }
    }
  }

  async createSubscription(
    tenantId: string,
    dto: CreateSubscriptionDto,
  ): Promise<Subscription> {
    const plan = await this.prisma.plan.findUnique({
      where: { id: dto.planId },
    });
    if (!plan) {
      throw new NotFoundException(`Plan with id ${dto.planId} not found`);
    }

    if (!plan.active) {
      throw new BillingException(`Plan ${plan.name} is not active`);
    }

    const existing = await this.prisma.subscription.findUnique({
      where: { tenantId },
    });

    if (existing) {
      throw new BillingException(
        'Workspace already has an active subscription',
      );
    }

    const billingInterval =
      dto.billingInterval || plan.billingInterval || 'monthly';
    const trialDays = dto.trialDays ?? plan.trialDays;
    const now = new Date();

    const trialStartDate = dto.startTrial ? now : null;
    const trialEndDate =
      dto.startTrial && trialDays > 0
        ? new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000)
        : null;

    let status: SubscriptionStatus;
    let currentPeriodStart: Date | null = null;
    let currentPeriodEnd: Date | null = null;
    let nextBillingDate: Date | null = null;

    if (dto.startTrial && trialDays > 0) {
      status = SubscriptionStatus.TRIAL;
      currentPeriodStart = now;
      currentPeriodEnd = trialEndDate;
    } else {
      status = SubscriptionStatus.PENDING_PAYMENT;
      currentPeriodStart = now;
      const periodMs = billingInterval === 'YEARLY' ? 365 : 30;
      currentPeriodEnd = new Date(
        now.getTime() + periodMs * 24 * 60 * 60 * 1000,
      );
      nextBillingDate = currentPeriodEnd;
    }

    const subscription = await this.prisma.subscription.create({
      data: {
        tenantId,
        planId: dto.planId,
        status,
        billingInterval,
        trialStartDate,
        trialEndDate,
        currentPeriodStart: currentPeriodStart || now,
        currentPeriodEnd: currentPeriodEnd || now,
        nextBillingDate,
        metadata: dto.metadata as any,
      },
      include: { plan: true },
    });

    this.logger.log(
      `Subscription created for workspace ${tenantId}, plan ${dto.planId}, status ${status}`,
    );
    return subscription;
  }

  async upgradeSubscription(
    tenantId: string,
    dto: UpgradeSubscriptionDto,
  ): Promise<Subscription> {
    const subscription = await this.getSubscription(tenantId);
    if (!subscription) throw new NotFoundException('No subscription found for workspace');

    const plan = await this.prisma.plan.findUnique({ where: { id: dto.planId } });
    if (!plan || !plan.active) throw new BillingException(`Plan not found or inactive`);

    const billingInterval = dto.billingInterval || subscription.billingInterval;

    const updated = await this.prisma.subscription.update({
      where: { tenantId },
      data: {
        planId: dto.planId,
        billingInterval,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: new Date(),
        currentPeriodEnd: this.calculatePeriodEnd(new Date(), billingInterval),
        nextBillingDate: this.calculatePeriodEnd(new Date(), billingInterval),
        metadata: {
          ...((subscription.metadata ?? {}) as Record<string, unknown>),
          upgradedFrom: subscription.planId,
          upgradedAt: new Date().toISOString(),
          prorated: dto.prorate ?? true,
        },
      },
      include: { plan: true },
    });

    await this.releaseQuotaFreeze(tenantId);

    // Send email
    try {
      const owner = await this.prisma.user.findFirst({
        where: { tenantId, role: { in: ['TENANT_ADMIN', 'ADMIN'] } },
        select: { email: true },
      });
      if (owner?.email) {
        await this.emailService.sendPlanUpgradedEmail(
          owner.email,
          subscription.plan?.name || 'Previous Plan',
          plan.name,
        );
      }
    } catch (e) {
      this.logger.error(`Failed to send upgrade email`, e);
    }

    this.logger.log(`Subscription upgraded for workspace ${tenantId} to plan ${dto.planId}`);
    return updated;
  }

  async downgradeSubscription(
    tenantId: string,
    dto: DowngradeSubscriptionDto,
  ): Promise<Subscription> {
    const subscription = await this.getSubscription(tenantId);
    if (!subscription) throw new NotFoundException('No subscription found for workspace');

    const plan = await this.prisma.plan.findUnique({ where: { id: dto.planId } });
    if (!plan || !plan.active) throw new BillingException(`Plan not found or inactive`);

    // Get downgrade preview for email before doing it
    const preview = await this.getDowngradePreview(tenantId, dto.planId);
    const frozenSummaryParts = [];
    if (preview.queues.excess > 0) frozenSummaryParts.push(`${preview.queues.excess} queues`);
    if (preview.locations.excess > 0) frozenSummaryParts.push(`${preview.locations.excess} locations`);
    if (preview.services.excess > 0) frozenSummaryParts.push(`${preview.services.excess} services`);
    const frozenSummary = frozenSummaryParts.length > 0 
      ? `Due to quota limits, ${frozenSummaryParts.join(', ')} have been temporarily frozen.`
      : undefined;

    const updated = await this.prisma.subscription.update({
      where: { tenantId },
      data: {
        planId: dto.planId,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: new Date(),
        currentPeriodEnd: this.calculatePeriodEnd(new Date(), subscription.billingInterval),
        nextBillingDate: this.calculatePeriodEnd(new Date(), subscription.billingInterval),
        metadata: {
          ...((subscription.metadata ?? {}) as Record<string, unknown>),
          downgradedFrom: subscription.planId,
          downgradedAt: new Date().toISOString(),
        },
      },
      include: { plan: true },
    });

    await this.applyQuotaFreeze(tenantId, preview.queues.newLimit, preview.locations.newLimit, preview.services.newLimit);

    // Send email
    try {
      const owner = await this.prisma.user.findFirst({
        where: { tenantId, role: { in: ['TENANT_ADMIN', 'ADMIN'] } },
        select: { email: true },
      });
      if (owner?.email) {
        await this.emailService.sendPlanDowngradedEmail(
          owner.email,
          subscription.plan?.name || 'Previous Plan',
          plan.name,
          frozenSummary
        );
      }
    } catch (e) {
      this.logger.error(`Failed to send downgrade email`, e);
    }

    this.logger.log(`Subscription downgraded for workspace ${tenantId} to plan ${dto.planId}`);
    return updated;
  }

  async cancelSubscription(
    tenantId: string,
    dto: CancelSubscriptionDto,
  ): Promise<Subscription> {
    const subscription = await this.getSubscription(tenantId);
    if (!subscription) {
      throw new NotFoundException('No subscription found for workspace');
    }

    const now = new Date();
    const isImmediate =
      dto.immediate || subscription.status === SubscriptionStatus.TRIAL;

    const dataToUpdate: any = {
      cancellationDate: now,
      metadata: {
        ...((subscription.metadata ?? {}) as Record<string, unknown>),
        cancellationReason: dto.reason,
        cancelledAt: now.toISOString(),
        effectiveDate: isImmediate
          ? now.toISOString()
          : subscription.currentPeriodEnd?.toISOString(),
      },
    };

    if (isImmediate) {
      dataToUpdate.status = SubscriptionStatus.CANCELLED;
      dataToUpdate.endedAt = now;
      dataToUpdate.nextBillingDate = null;
    } else {
      // Deferred cancellation - status remains ACTIVE until nextBillingDate
      dataToUpdate.metadata.cancelAtPeriodEnd = true;
    }

    const updated = await this.prisma.subscription.update({
      where: { tenantId },
      data: dataToUpdate,
      include: { plan: true },
    });

    this.logger.log(
      `Subscription cancelled for workspace ${tenantId}, immediate=${dto.immediate}`,
    );

    try {
      const owner = await this.prisma.user.findFirst({
        where: { tenantId, role: { in: ['TENANT_ADMIN', 'ADMIN'] } },
        select: { email: true },
      });
      if (owner?.email && updated.plan?.name) {
        await this.emailService.sendSubscriptionCancelledEmail(
          owner.email,
          updated.plan.name,
        );
      }
    } catch (e) {
      this.logger.error(
        `Failed to send cancellation email to workspace ${tenantId}`,
        e,
      );
    }

    return updated;
  }

  async resumeSubscription(
    tenantId: string,
    dto: ResumeSubscriptionDto,
  ): Promise<Subscription> {
    const subscription = await this.getSubscription(tenantId);
    if (!subscription) {
      throw new NotFoundException('No subscription found for workspace');
    }

    if (
      subscription.status !== SubscriptionStatus.CANCELLED &&
      subscription.status !== SubscriptionStatus.PAST_DUE
    ) {
      throw new BillingException(
        'Subscription is not in a state that allows resumption',
      );
    }

    const plan = await this.prisma.plan.findUnique({
      where: { id: dto.planId || subscription.planId },
    });
    if (!plan) {
      throw new NotFoundException(`Plan not found`);
    }

    const now = new Date();
    const billingInterval = subscription.billingInterval;

    const updated = await this.prisma.subscription.update({
      where: { tenantId },
      data: {
        planId: dto.planId || subscription.planId,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: this.calculatePeriodEnd(now, billingInterval),
        nextBillingDate: this.calculatePeriodEnd(now, billingInterval),
        cancellationDate: null,
        endedAt: null,
        metadata: {
          ...((subscription.metadata ?? {}) as Record<string, unknown>),
          resumedAt: now.toISOString(),
        },
      },
      include: { plan: true },
    });

    this.logger.log(`Subscription resumed for workspace ${tenantId}`);
    return updated;
  }

  async startFreeTrial(
    tenantId: string,
    planId: string,
    trialDays?: number,
  ): Promise<Subscription & { plan: Plan }> {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });
    if (!plan) {
      throw new NotFoundException(`Plan with id ${planId} not found`);
    }

    const actualTrialDays = trialDays ?? plan.trialDays ?? 14;

    const existing = await this.prisma.subscription.findUnique({
      where: { tenantId },
    });

    if (
      existing &&
      existing.status !== SubscriptionStatus.EXPIRED &&
      existing.status !== SubscriptionStatus.CANCELLED
    ) {
      throw new BillingException(
        'Workspace already has an active subscription',
      );
    }

    const now = new Date();
    const trialEndDate = new Date(
      now.getTime() + actualTrialDays * 24 * 60 * 60 * 1000,
    );

    const subscription = await this.prisma.subscription.create({
      data: {
        tenantId,
        planId,
        status: SubscriptionStatus.TRIAL,
        billingInterval: plan.billingInterval || 'monthly',
        trialStartDate: now,
        trialEndDate,
        currentPeriodStart: now,
        currentPeriodEnd: trialEndDate,
      },
      include: { plan: true },
    });

    this.logger.log(
      `Free trial started for workspace ${tenantId}, plan ${planId}, ${actualTrialDays} days`,
    );

    try {
      const workspaceOwner = await this.prisma.user.findFirst({
        where: { tenantId, role: 'TENANT_ADMIN' },
        select: { email: true },
      });
      if (workspaceOwner?.email) {
        await this.emailService.sendTrialStartedEmail(
          workspaceOwner.email,
          plan.name,
          actualTrialDays,
        );
      }
    } catch (e) {
      this.logger.error(
        `Failed to send trial started email for ${tenantId}`,
        e,
      );
    }

    return subscription;
  }

  async expireTrial(tenantId: string): Promise<Subscription | null> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });

    if (!subscription || subscription.status !== SubscriptionStatus.TRIAL) {
      return null;
    }

    const now = new Date();
    if (!subscription.trialEndDate || subscription.trialEndDate > now) {
      return null;
    }

    const plan = subscription.plan;
    const billingInterval = subscription.billingInterval;

    const updated = await this.prisma.subscription.update({
      where: { tenantId },
      data: {
        status: SubscriptionStatus.EXPIRED,
        trialStartDate: null,
        trialEndDate: null,
        currentPeriodStart: now,
        currentPeriodEnd: this.calculatePeriodEnd(now, billingInterval),
        nextBillingDate: this.calculatePeriodEnd(now, billingInterval),
      },
      include: { plan: true },
    });

    this.logger.log(`Trial expired for workspace ${tenantId}`);
    return updated;
  }

  async renewSubscription(tenantId: string): Promise<Subscription> {
    const subscription = await this.getSubscription(tenantId);
    if (!subscription) {
      throw new NotFoundException('No subscription found for workspace');
    }

    const now = new Date();
    const billingInterval = subscription.billingInterval;

    const updated = await this.prisma.subscription.update({
      where: { tenantId },
      data: {
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: this.calculatePeriodEnd(now, billingInterval),
        nextBillingDate: this.calculatePeriodEnd(now, billingInterval),
        renewalDate: now,
        cancellationDate: null,
        endedAt: null,
        metadata: {
          ...((subscription.metadata ?? {}) as Record<string, unknown>),
          renewedAt: now.toISOString(),
        },
      },
      include: { plan: true },
    });

    this.logger.log(`Subscription renewed for workspace ${tenantId}`);
    return updated;
  }

  async getSubscriptionHistory(
    tenantId: string,
    offset = 0,
    limit = 50,
  ): Promise<Subscription[]> {
    return this.prisma.subscription.findMany({
      where: { tenantId },
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { plan: true },
    });
  }

  private calculatePeriodEnd(startDate: Date, interval: string): Date {
    const ms =
      interval === 'YEARLY'
        ? 365 * 24 * 60 * 60 * 1000
        : 30 * 24 * 60 * 60 * 1000;
    return new Date(startDate.getTime() + ms);
  }

  async getDowngradePreview(tenantId: string, targetPlanId: string) {
    const plan = await this.prisma.plan.findUnique({ where: { id: targetPlanId } });
    if (!plan) throw new NotFoundException('Plan not found');

    const parsedLimits = typeof plan.limits === 'string' ? JSON.parse(plan.limits) : plan.limits || {};
    const maxQueues = parsedLimits?.maxQueues ?? plan.maxQueues ?? Infinity;
    const maxLocations = parsedLimits?.maxLocations ?? Infinity;
    const maxServices = parsedLimits?.maxServices ?? Infinity;

    const queues = await this.prisma.queue.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' }, select: { id: true, name: true, createdAt: true } });
    const locations = await this.prisma.location.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' }, select: { id: true, name: true, createdAt: true } });
    const services = await this.prisma.service.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' }, select: { id: true, name: true, createdAt: true } });

    const qExcess = Math.max(0, queues.length - maxQueues);
    const lExcess = Math.max(0, locations.length - maxLocations);
    const sExcess = Math.max(0, services.length - maxServices);

    return {
      queues: {
        current: queues.length,
        newLimit: maxQueues,
        excess: qExcess,
        protected: queues.slice(0, queues.length - qExcess),
        willFreeze: queues.slice(queues.length - qExcess),
      },
      locations: {
        current: locations.length,
        newLimit: maxLocations,
        excess: lExcess,
        protected: locations.slice(0, locations.length - lExcess),
        willFreeze: locations.slice(locations.length - lExcess),
      },
      services: {
        current: services.length,
        newLimit: maxServices,
        excess: sExcess,
        protected: services.slice(0, services.length - sExcess),
        willFreeze: services.slice(services.length - sExcess),
      }
    };
  }

  async applyQuotaFreeze(tenantId: string, maxQueues: number, maxLocations: number, maxServices: number) {
    // Queues
    const queues = await this.prisma.queue.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' }, select: { id: true } });
    if (queues.length > maxQueues) {
      const toFreeze = queues.slice(maxQueues).map((q: any) => q.id);
      await this.prisma.queue.updateMany({
        where: { id: { in: toFreeze } },
        data: { frozenByQuota: true, frozenAt: new Date() }
      });
    }

    // Locations
    const locations = await this.prisma.location.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' }, select: { id: true } });
    if (locations.length > maxLocations) {
      const toFreeze = locations.slice(maxLocations).map((l: any) => l.id);
      await this.prisma.location.updateMany({
        where: { id: { in: toFreeze } },
        data: { frozenByQuota: true, frozenAt: new Date() }
      });
    }

    // Services
    const services = await this.prisma.service.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' }, select: { id: true } });
    if (services.length > maxServices) {
      const toFreeze = services.slice(maxServices).map((s: any) => s.id);
      await this.prisma.service.updateMany({
        where: { id: { in: toFreeze } },
        data: { frozenByQuota: true, frozenAt: new Date() }
      });
    }
  }

  async releaseQuotaFreeze(tenantId: string) {
    await this.prisma.queue.updateMany({
      where: { tenantId, frozenByQuota: true },
      data: { frozenByQuota: false, frozenAt: null }
    });
    await this.prisma.location.updateMany({
      where: { tenantId, frozenByQuota: true },
      data: { frozenByQuota: false, frozenAt: null }
    });
    await this.prisma.service.updateMany({
      where: { tenantId, frozenByQuota: true },
      data: { frozenByQuota: false, frozenAt: null }
    });
  }

  async rebalanceQuota(tenantId: string) {
    const sub = await this.getSubscription(tenantId);
    if (!sub || !sub.plan || sub.status !== SubscriptionStatus.ACTIVE) return;
    const parsedLimits = typeof sub.plan.limits === 'string' ? JSON.parse(sub.plan.limits) : sub.plan.limits || {};
    const maxQueues = parsedLimits?.maxQueues ?? sub.plan.maxQueues ?? Infinity;
    const maxLocations = parsedLimits?.maxLocations ?? Infinity;
    const maxServices = parsedLimits?.maxServices ?? Infinity;

    await this.releaseQuotaFreeze(tenantId);
    await this.applyQuotaFreeze(tenantId, maxQueues, maxLocations, maxServices);
  }
}
