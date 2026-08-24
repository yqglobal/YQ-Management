import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCleanupExpiredInvitations() {
    this.logger.log('Running daily cleanup of expired invitations...');
    const now = new Date();

    const expiredInvites = await this.prisma.invitation.findMany({
      where: {
        OR: [
          { expiresAt: { lt: now }, used: false },
          {
            usedCount: { gte: this.prisma.invitation.fields.maxUses },
            used: false,
          },
        ],
      },
      include: { workspace: true },
    });

    if (expiredInvites.length === 0) {
      this.logger.log('No expired invitations to clean up.');
      return;
    }

    let cleanupCount = 0;

    for (const invite of expiredInvites) {
      try {
        await this.prisma.invitation.update({
          where: { id: invite.id },
          data: { used: true },
        });
        cleanupCount++;

        // Try to notify the tenant admin
        if (invite.email) {
          const tenantAdmin = await this.prisma.user.findFirst({
            where: {
              tenantId: invite.workspace.tenantId,
              role: 'TENANT_ADMIN',
            },
          });

          if (tenantAdmin?.email) {
            this.emailService.sendInvitationExpiredNotification(
              tenantAdmin.email,
              invite.email,
              invite.workspace.name,
            );
          }
        }
      } catch (err) {
        this.logger.error(`Failed to cleanup invite ${invite.id}`, err);
      }
    }

    this.logger.log(`Cleaned up ${cleanupCount} expired invitations.`);
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDataRetentionLifecycle() {
    this.logger.log('Running data retention lifecycle check...');
    // GDPR / data retention: Wipe Visits and legacy Tokens older than 2 years
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    try {
      // FIX (1D): Previously both deleteMany calls targeted prisma.visit (copy-paste bug).
      // The second call now correctly targets prisma.token for legacy Token record cleanup.
      const visitResult = await this.prisma.visit.deleteMany({
        where: { createdAt: { lt: twoYearsAgo } }
      });

      // Legacy Token model cleanup (model deprecated but still exists in schema)
      const tokenResult = await this.prisma.token.deleteMany({
        where: { joinedAt: { lt: twoYearsAgo } }
      });

      this.logger.log(
        `Data Retention: Cleaned up ${visitResult.count} old visits and ${tokenResult.count} legacy tokens.`
      );
    } catch (err) {
      this.logger.error('Failed to run data retention cleanup', err);
    }
  }
}
