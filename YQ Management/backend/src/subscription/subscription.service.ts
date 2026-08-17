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

  async getSubscription(workspaceId: string): Promise<(Subscription & { plan: Plan }) | null> {
    let sub = await this.prisma.subscription.findUnique({
      where: { workspaceId },
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
          workspaceId,
          starterPlan.id,
          starterPlan.trialDays || 14,
        );
      }
    }

    return sub;
  }

  async createSubscription(
    workspaceId: string,
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
      where: { workspaceId },
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
        workspaceId,
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

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { subscriptionStatus: status },
    });

    this.logger.log(
      `Subscription created for workspace ${workspaceId}, plan ${dto.planId}, status ${status}`,
    );
    return subscription;
  }

  async upgradeSubscription(
    workspaceId: string,
    dto: UpgradeSubscriptionDto,
  ): Promise<Subscription> {
    const subscription = await this.getSubscription(workspaceId);
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
      where: { workspaceId },
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
      `Subscription upgraded for workspace ${workspaceId} to plan ${dto.planId}`,
    );
    return updated;
  }

  async downgradeSubscription(
    workspaceId: string,
    dto: DowngradeSubscriptionDto,
  ): Promise<Subscription> {
    const subscription = await this.getSubscription(workspaceId);
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
      where: { workspaceId },
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
      `Subscription downgraded for workspace ${workspaceId} to plan ${dto.planId}`,
    );
    return updated;
  }

  async cancelSubscription(
    workspaceId: string,
    dto: CancelSubscriptionDto,
  ): Promise<Subscription> {
    const subscription = await this.getSubscription(workspaceId);
    if (!subscription) {
      throw new NotFoundException('No subscription found for workspace');
    }

    const now = new Date();
    const updated = await this.prisma.subscription.update({
      where: { workspaceId },
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

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { subscriptionStatus: 'CANCELLED' },
    });

    this.logger.log(
      `Subscription cancelled for workspace ${workspaceId}, immediate=${dto.immediate}`,
    );
    return updated;
  }

  async resumeSubscription(
    workspaceId: string,
    dto: ResumeSubscriptionDto,
  ): Promise<Subscription> {
    const subscription = await this.getSubscription(workspaceId);
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
      where: { workspaceId },
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

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { subscriptionStatus: 'ACTIVE' },
    });

    this.logger.log(`Subscription resumed for workspace ${workspaceId}`);
    return updated;
  }

  async startFreeTrial(
    workspaceId: string,
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
      where: { workspaceId },
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
        workspaceId,
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

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { subscriptionStatus: 'TRIAL' },
    });

    this.logger.log(
      `Free trial started for workspace ${workspaceId}, plan ${planId}, ${trialDays} days`,
    );
    return subscription;
  }

  async expireTrial(workspaceId: string): Promise<Subscription | null> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { workspaceId },
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
      where: { workspaceId },
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

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { subscriptionStatus: 'PENDING_PAYMENT' },
    });

    this.logger.log(`Trial expired for workspace ${workspaceId}`);
    return updated;
  }

  async renewSubscription(workspaceId: string): Promise<Subscription> {
    const subscription = await this.getSubscription(workspaceId);
    if (!subscription) {
      throw new NotFoundException('No subscription found for workspace');
    }

    const now = new Date();
    const billingInterval = subscription.billingInterval;

    const updated = await this.prisma.subscription.update({
      where: { workspaceId },
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

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { subscriptionStatus: 'ACTIVE' },
    });

    this.logger.log(`Subscription renewed for workspace ${workspaceId}`);
    return updated;
  }

  async getSubscriptionHistory(
    workspaceId: string,
    offset = 0,
    limit = 50,
  ): Promise<Subscription[]> {
    return this.prisma.subscription.findMany({
      where: { workspaceId },
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
