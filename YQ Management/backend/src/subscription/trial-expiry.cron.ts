import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { SubscriptionStatus } from '@prisma/client';

@Injectable()
export class TrialExpiryCron {
  private readonly logger = new Logger(TrialExpiryCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async handleTrialExpirations() {
    this.logger.log('Running trial expiration check...');
    try {
      const now = new Date();
      
      // Get all active trials with an end date
      const activeTrials = await this.prisma.subscription.findMany({
        where: {
          status: SubscriptionStatus.TRIAL,
          trialEndDate: { not: null },
        },
        include: {
          tenant: {
            include: {
              users: {
                where: { role: 'TENANT_ADMIN' },
              },
            },
          },
        },
      });

      for (const sub of activeTrials) {
        if (!sub.trialEndDate) continue;
        
        const msLeft = sub.trialEndDate.getTime() - now.getTime();
        const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
        
        // Notify at exactly 3 days and 1 day left
        if (daysLeft === 3 || daysLeft === 1) {
          const owner = sub.tenant.users[0];
          if (owner?.email) {
            await this.emailService.sendTrialExpiringEmail(owner.email, daysLeft);
            this.logger.log(`Sent trial expiry warning to ${owner.email} (${daysLeft} days left)`);
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to run trial expiration check', error);
    }
  }
}
