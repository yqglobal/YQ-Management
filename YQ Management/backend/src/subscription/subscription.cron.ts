import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { CommunicationService } from '../communication/communication.service';
import { CommunicationEvent } from '../communication/events/communication-events.enum';

@Injectable()
export class SubscriptionCron {
  private readonly logger = new Logger(SubscriptionCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionService: SubscriptionService,
    private readonly communicationService: CommunicationService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async expireTrials() {
    this.logger.log('Running trial expiration cron');
    const expired = await this.prisma.subscription.findMany({
      where: {
        status: 'TRIAL',
        trialEndDate: { lte: new Date() },
      },
      include: { tenant: { select: { id: true, name: true } } },
    });

    for (const sub of expired) {
      try {
        await this.subscriptionService.expireTrial(sub.tenantId);
        this.logger.log(`Expired trial for workspace ${sub.tenantId}`);
      } catch (e) {
        this.logger.error(
          `Failed to expire trial for workspace ${sub.tenantId}`,
          e,
        );
      }
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async sendRenewalReminders() {
    this.logger.log('Running renewal reminder cron');
    
    // Find subscriptions expiring in exactly 7, 3, or 1 days
    const targets = [7, 3, 1];
    
    for (const days of targets) {
      const targetDateStart = new Date();
      targetDateStart.setDate(targetDateStart.getDate() + days);
      targetDateStart.setHours(0, 0, 0, 0);
      
      const targetDateEnd = new Date(targetDateStart);
      targetDateEnd.setHours(23, 59, 59, 999);

      const upcoming = await this.prisma.subscription.findMany({
        where: {
          status: 'ACTIVE',
          nextBillingDate: {
            gte: targetDateStart,
            lte: targetDateEnd,
          },
        },
        include: {
          tenant: { select: { id: true, name: true } },
          plan: { select: { name: true } },
        },
      });

      for (const sub of upcoming) {
        try {
          const workspaceOwner = await this.prisma.user.findFirst({
            where: { tenantId: sub.tenantId, role: 'TENANT_ADMIN' },
            select: { email: true },
          });
          const adminOwner = await this.prisma.user.findFirst({
            where: { tenantId: sub.tenantId, role: 'ADMIN' },
            select: { email: true },
          });

          const email = workspaceOwner?.email || adminOwner?.email || 'admin@example.com';

          await this.communicationService.publish(
            CommunicationEvent.BILLING_TRIAL_ENDING,
            {
              email,
              workspaceName: sub.tenant?.name || 'Your Workspace',
              daysRemaining: days,
              tenantId: sub.tenantId,
            },
          );
          this.logger.log(`Sent ${days}-day renewal reminder for workspace ${sub.tenantId}`);
        } catch (e) {
          this.logger.error(`Failed to send ${days}-day renewal reminder for workspace ${sub.tenantId}`, e);
        }
      }
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cancelExpiredSubscriptions() {
    this.logger.log('Running expired subscription cancellation cron');
    const expired = await this.prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        nextBillingDate: { lt: new Date() },
      },
      include: { tenant: { select: { id: true, name: true } } },
    });

    for (const sub of expired) {
      try {
        await this.subscriptionService.cancelSubscription(sub.tenantId, {
          immediate: true,
          reason: 'Subscription expired - Next billing date passed',
        });
        
        const workspaceOwner = await this.prisma.user.findFirst({
          where: { tenantId: sub.tenantId, role: 'TENANT_ADMIN' },
          select: { email: true },
        });

        if (workspaceOwner?.email) {
          await this.communicationService.publish(
            CommunicationEvent.BILLING_TRIAL_ENDING,
            {
              email: workspaceOwner.email,
              workspaceName: sub.tenant?.name || 'Your Workspace',
              daysRemaining: 0,
              tenantId: sub.tenantId,
            },
          );
        }

        this.logger.log(`Cancelled expired subscription for workspace ${sub.tenantId}`);
      } catch (e) {
        this.logger.error(`Failed to cancel expired subscription for workspace ${sub.tenantId}`, e);
      }
    }
  }
}
