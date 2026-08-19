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

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getSubscription(tenantId: string): Promise<(Subscription & { plan: Plan }) | null> {
    let sub = await this.prisma.subscription.findUnique({
      where: { tenantId },
      include: {
        plan: true,
      },
    });

    if (!sub) {
      const starterPlan = await this.prisma.plan.findFirst({
        where: { name: { contains: 'Starter' } },
      });
      if (starterPlan) {
        sub = await this.startFreeTrial(
          tenantId,
          starterPlan.id,
          starterPlan.trialDays || 14,
        );
      }
    }

    return sub;
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
    if (!subscription) {
      throw new NotFoundException('No subscription found for workspace');
    }

    const plan = await this.prisma.plan.findUnique({
      where: { id: dto.planId },
    });
    if (!plan) {
      throw new NotFoundException(`Plan with id ${dto.planId} not found`);
    }

    if (!plan.active) {
      throw new BillingException(`Plan ${plan.name} is not active`);
    }

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

    this.logger.log(
      `Subscription upgraded for workspace ${tenantId} to plan ${dto.planId}`,
    );
    return updated;
  }

  async downgradeSubscription(
    tenantId: string,
    dto: DowngradeSubscriptionDto,
  ): Promise<Subscription> {
    const subscription = await this.getSubscription(tenantId);
    if (!subscription) {
      throw new NotFoundException('No subscription found for workspace');
    }

    const plan = await this.prisma.plan.findUnique({
      where: { id: dto.planId },
    });
    if (!plan) {
      throw new NotFoundException(`Plan with id ${dto.planId} not found`);
    }

    if (!plan.active) {
      throw new BillingException(`Plan ${plan.name} is not active`);
    }

    const updated = await this.prisma.subscription.update({
      where: { tenantId },
      data: {
        planId: dto.planId,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: new Date(),
        currentPeriodEnd: this.calculatePeriodEnd(
          new Date(),
          subscription.billingInterval,
        ),
        nextBillingDate: this.calculatePeriodEnd(
          new Date(),
          subscription.billingInterval,
        ),
        metadata: {
          ...((subscription.metadata ?? {}) as Record<string, unknown>),
          downgradedFrom: subscription.planId,
          downgradedAt: new Date().toISOString(),
        },
      },
      include: { plan: true },
    });

    this.logger.log(
      `Subscription downgraded for workspace ${tenantId} to plan ${dto.planId}`,
    );
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
    const updated = await this.prisma.subscription.update({
      where: { tenantId },
      data: {
        status: SubscriptionStatus.CANCELLED,
        cancellationDate: now,
        endedAt: dto.immediate ? now : null,
        nextBillingDate: null,
        metadata: {
          ...((subscription.metadata ?? {}) as Record<string, unknown>),
          cancellationReason: dto.reason,
          cancelledAt: now.toISOString(),
          effectiveDate: dto.immediate
            ? now.toISOString()
            : subscription.currentPeriodEnd?.toISOString(),
        },
      },
      include: { plan: true },
    });

    this.logger.log(
      `Subscription cancelled for workspace ${tenantId}, immediate=${dto.immediate}`,
    );
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
    trialDays: number,
  ): Promise<Subscription & { plan: Plan }> {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });
    if (!plan) {
      throw new NotFoundException(`Plan with id ${planId} not found`);
    }

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
      now.getTime() + trialDays * 24 * 60 * 60 * 1000,
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
      `Free trial started for workspace ${tenantId}, plan ${planId}, ${trialDays} days`,
    );
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
        status: SubscriptionStatus.PENDING_PAYMENT,
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
}
