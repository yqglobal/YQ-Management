import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { CommunicationService } from '../communication/communication.service';
import { CommunicationEvent } from '../communication/events/communication-events.enum';
import { EmailService } from '../email/email.service';

@Injectable()
export class SubscriptionCron {
  private readonly logger = new Logger(SubscriptionCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionService: SubscriptionService,
    private readonly communicationService: CommunicationService,
    private readonly emailService: EmailService,
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

    await Promise.allSettled(
      expired.map(async (sub) => {
        if (!sub.tenantId) return;
        try {
          await this.subscriptionService.expireTrial(sub.tenantId);
          this.logger.log(`Expired trial for workspace ${sub.tenantId}`);
        } catch (e) {
          this.logger.error(
            `Failed to expire trial for workspace ${sub.tenantId}`,
            e,
          );
        }
      }),
    );
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async sendTrialReminders() {
    this.logger.log('Running trial reminder cron');
    const targets = [7, 3, 1];

    for (const days of targets) {
      const targetDateStart = new Date();
      targetDateStart.setDate(targetDateStart.getDate() + days);
      targetDateStart.setHours(0, 0, 0, 0);

      const targetDateEnd = new Date(targetDateStart);
      targetDateEnd.setHours(23, 59, 59, 999);

      const upcoming = await this.prisma.subscription.findMany({
        where: {
          status: 'TRIAL',
          trialEndDate: {
            gte: targetDateStart,
            lte: targetDateEnd,
          },
        },
        include: {
          tenant: { select: { id: true, name: true } },
        },
      });

      await Promise.allSettled(
        upcoming.map(async (sub) => {
          if (!sub.tenantId) return;
          try {
            const workspaceOwner = await this.prisma.user.findFirst({
              where: { tenantId: sub.tenantId, role: 'TENANT_ADMIN' },
              select: { email: true },
            });

            const email = workspaceOwner?.email || 'admin@example.com';

            await this.communicationService.publish(
              CommunicationEvent.BILLING_TRIAL_ENDING,
              {
                email,
                workspaceName: sub.tenant?.name || 'Your Workspace',
                daysRemaining: days,
                tenantId: sub.tenantId,
              },
            );

            this.emailService.sendTrialExpiringEmail(email, days).catch((e) => {
              this.logger.error(
                `Failed to send ${days}-day trial reminder email to ${email}`,
                e,
              );
            });

            this.logger.log(
              `Sent ${days}-day trial reminder for workspace ${sub.tenantId}`,
            );
          } catch (e) {
            this.logger.error(
              `Failed to send ${days}-day trial reminder for workspace ${sub.tenantId}`,
              e,
            );
          }
        }),
      );
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
          cancellationDate: null,
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

      await Promise.allSettled(
        upcoming.map(async (sub) => {
          if (!sub.tenantId) return;
          try {
            const workspaceOwner = await this.prisma.user.findFirst({
              where: { tenantId: sub.tenantId, role: 'TENANT_ADMIN' },
              select: { email: true },
            });
            const adminOwner = await this.prisma.user.findFirst({
              where: { tenantId: sub.tenantId, role: 'ADMIN' },
              select: { email: true },
            });

            const email =
              workspaceOwner?.email || adminOwner?.email || 'admin@example.com';
            const planName = sub.plan?.name || 'Standard';

            await this.communicationService.publish(
              CommunicationEvent.BILLING_TRIAL_ENDING,
              {
                email,
                workspaceName: sub.tenant?.name || 'Your Workspace',
                daysRemaining: days,
                tenantId: sub.tenantId,
              },
            );

            this.emailService
              .sendPlanExpiringEmail(email, planName, days)
              .catch((e) => {
                this.logger.error(
                  `Failed to send ${days}-day renewal reminder email to ${email}`,
                  e,
                );
              });

            this.logger.log(
              `Sent ${days}-day renewal reminder for workspace ${sub.tenantId}`,
            );
          } catch (e) {
            this.logger.error(
              `Failed to send ${days}-day renewal reminder for workspace ${sub.tenantId}`,
              e,
            );
          }
        }),
      );
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cancelExpiredSubscriptions() {
    this.logger.log('Running expired subscription cancellation cron');
    // 1. Transition ACTIVE to PAST_DUE
    this.logger.log('Running expired subscription PAST_DUE transition cron');
    const recentlyExpired = await this.prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        nextBillingDate: { lt: new Date() },
      },
      include: { tenant: { select: { id: true, name: true } } },
    });

    await Promise.allSettled(
      recentlyExpired.map(async (sub) => {
        if (!sub.tenantId) return;
        try {
          await this.prisma.subscription.update({
            where: { id: sub.id },
            data: { status: 'PAST_DUE' },
          });
          this.logger.log(
            `Marked subscription PAST_DUE for workspace ${sub.tenantId}`,
          );
        } catch (e) {
          this.logger.error(
            `Failed to mark PAST_DUE for workspace ${sub.tenantId}`,
            e,
          );
        }
      }),
    );

    // 2. Cancel PAST_DUE after 3 days
    this.logger.log('Running PAST_DUE subscription cancellation cron');
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const pastDueExpired = await this.prisma.subscription.findMany({
      where: {
        status: 'PAST_DUE',
        nextBillingDate: { lt: threeDaysAgo },
      },
      include: {
        tenant: { select: { id: true, name: true } },
        plan: { select: { name: true } },
      },
    });

    await Promise.allSettled(
      pastDueExpired.map(async (sub) => {
        if (!sub.tenantId) return;
        try {
          await this.subscriptionService.cancelSubscription(sub.tenantId, {
            immediate: true,
            reason: 'Subscription expired - 3 day grace period ended',
          });

          const workspaceOwner = await this.prisma.user.findFirst({
            where: { tenantId: sub.tenantId, role: 'TENANT_ADMIN' },
            select: { email: true },
          });

          if (workspaceOwner?.email) {
            const planName = sub.plan?.name || 'Standard';
            await this.communicationService.publish(
              CommunicationEvent.BILLING_TRIAL_ENDING,
              {
                email: workspaceOwner.email,
                workspaceName: sub.tenant?.name || 'Your Workspace',
                daysRemaining: 0,
                tenantId: sub.tenantId,
              },
            );

            this.emailService
              .sendPlanExpiredEmail(workspaceOwner.email, planName)
              .catch((e) => {
                this.logger.error(
                  `Failed to send plan expired email to ${workspaceOwner?.email}`,
                  e,
                );
              });
          }

          this.logger.log(
            `Cancelled expired subscription for workspace ${sub.tenantId}`,
          );
        } catch (e) {
          this.logger.error(
            `Failed to cancel expired subscription for workspace ${sub.tenantId}`,
            e,
          );
        }
      }),
    );
  }
}
