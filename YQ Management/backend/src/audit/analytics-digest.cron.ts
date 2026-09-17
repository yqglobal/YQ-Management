import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import type { EmailProvider } from '../communication/interfaces/email.provider';

@Injectable()
export class AnalyticsDigestCron {
  private readonly logger = new Logger(AnalyticsDigestCron.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('EmailProvider') private readonly emailProvider: EmailProvider,
  ) {}

  @Cron(CronExpression.EVERY_WEEK)
  async sendWeeklyDigests() {
    this.logger.log('Starting weekly analytics digest generation...');

    const tenants = await this.prisma.tenant.findMany({
      include: {
        subscriptions: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: { plan: true },
        },
      },
    });

    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);

    for (const tenant of tenants) {
      // Check if feature is enabled in their plan (e.g. premium/business plans)
      const subscription = tenant.subscriptions?.[0];
      const plan = subscription?.plan;
      let planFeatures = plan?.features as any;
      if (typeof planFeatures === 'string') {
        try {
          planFeatures = JSON.parse(planFeatures);
        } catch (e) {
          planFeatures = {};
        }
      }

      const isTrial = subscription?.status === 'TRIAL';
      const hasDigest = isTrial || planFeatures?.analyticsDigest === true;

      if (!hasDigest) {
        continue;
      }

      try {
        const users = await this.prisma.user.findMany({
          where: {
            tenantId: tenant.id,
            role: 'ADMIN', // Send to admins
          },
        });

        if (users.length === 0) continue;

        // Calculate basic metrics for the last week
        const totalVisits = await this.prisma.visit.count({
          where: { tenantId: tenant.id, createdAt: { gte: lastWeek } },
        });

        const completedVisits = await this.prisma.visit.findMany({
          where: { 
            tenantId: tenant.id, 
            createdAt: { gte: lastWeek },
            currentState: 'COMPLETED',
            waitingStart: { not: null },
            serviceStart: { not: null },
            completedAt: { not: null }
          },
          select: { waitingStart: true, serviceStart: true, completedAt: true },
        });

        let totalWait = 0;
        let totalService = 0;
        for (const v of completedVisits) {
          if (v.waitingStart && v.serviceStart && v.completedAt) {
            const waitTimeMins = (v.serviceStart.getTime() - v.waitingStart.getTime()) / 60000;
            const serviceTimeMins = (v.completedAt.getTime() - v.serviceStart.getTime()) / 60000;
            totalWait += waitTimeMins;
            totalService += serviceTimeMins;
          }
        }

        const avgWaitTime = completedVisits.length > 0 ? Math.round(totalWait / completedVisits.length) : 0;
        const avgServiceTime = completedVisits.length > 0 ? Math.round(totalService / completedVisits.length) : 0;

        const emailHtml = `
          <h2>Weekly Analytics Digest - ${tenant.name}</h2>
          <p>Here's a summary of your operations for the past week:</p>
          <ul>
            <li><strong>Total Visits:</strong> ${totalVisits}</li>
            <li><strong>Completed Visits:</strong> ${completedVisits.length}</li>
            <li><strong>Average Wait Time:</strong> ${avgWaitTime} mins</li>
            <li><strong>Average Service Time:</strong> ${avgServiceTime} mins</li>
          </ul>
          <p>Log in to your dashboard to view more detailed insights.</p>
        `;

        for (const user of users) {
          if (user.email) {
            await this.emailProvider.send({
              to: user.email,
              subject: `Your Weekly Analytics Digest - ${tenant.name}`,
              htmlContent: emailHtml,
            });
          }
        }
        
        this.logger.debug(`Sent weekly digest to ${users.length} admins for tenant ${tenant.id}`);
      } catch (err) {
        this.logger.error(`Failed to generate digest for tenant ${tenant.id}: ${err.message}`);
      }
    }

    this.logger.log('Weekly analytics digest generation completed.');
  }
}
