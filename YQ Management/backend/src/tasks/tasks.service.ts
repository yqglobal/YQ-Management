import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleOutboxRetention() {
    this.logger.log('Running daily cleanup of completed OutboxEvents...');
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count } = await this.prisma.outboxEvent.deleteMany({
      where: {
        status: 'COMPLETED',
        createdAt: { lt: sevenDaysAgo },
      },
    });

    this.logger.log(`Deleted ${count} expired OutboxEvents.`);
  }

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
      include: { tenant: { select: { name: true, id: true } } },
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

        if (invite.email) {
          const tenantAdmin = await this.prisma.user.findFirst({
            where: {
              tenantId: invite.tenantId,
              role: 'TENANT_ADMIN',
            },
          });

          if (tenantAdmin?.email) {
            this.emailService.sendInvitationExpiredNotification(
              tenantAdmin.email,
              invite.email,
              invite.tenant?.name || 'Your Team',
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
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    try {
      const visitResult = await this.prisma.visit.deleteMany({
        where: { createdAt: { lt: twoYearsAgo } },
      });

      this.logger.log(
        `Data Retention: Cleaned up ${visitResult.count} old visits.`,
      );
    } catch (err) {
      this.logger.error('Failed to run data retention cleanup', err);
    }
  }

  /**
   * Check-in reminders: runs every minute and sends WhatsApp nudges
   * to customers who have upcoming or overdue appointments.
   */
  @Cron('* * * * *') // Every minute
  async handleCheckinReminders() {
    const now = new Date();

    // Find scheduled visits where service has requireManualCheckIn = true
    const upcomingVisits = await this.prisma.visit.findMany({
      where: {
        currentState: { in: ['SCHEDULED', 'CREATED'] },
        scheduledTime: { not: null },
        service: { requireManualCheckIn: true },
      },
      include: {
        customer: { select: { name: true, phone: true } },
        service: { select: { name: true, expectedDuration: true } },
        location: { select: { name: true } },
        tenant: { select: { name: true, id: true } },
      },
    });

    for (const visit of upcomingVisits) {
      const phone = visit.customer?.phone;
      if (!phone || !visit.scheduledTime) continue;

      const diffMins = (visit.scheduledTime.getTime() - now.getTime()) / 60000;
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.qmova.yqbuddy.com';
      const statusUrl = `${baseUrl}/status/${visit.accessToken}`;

      let message: string | null = null;

      // T-15: Get ready reminder
      if (diffMins > 14 && diffMins <= 15) {
        message =
          `🔔 *Reminder!* Your appointment at *${visit.location?.name || visit.tenant?.name}* is in *15 minutes*.\n\n` +
          `📋 Service: *${visit.service?.name}*\n\n` +
          `Head to the location and check in when you arrive: ${statusUrl}`;
      }

      // T-5: Head there now
      if (diffMins > 4 && diffMins <= 5) {
        message =
          `🚶 *Time to head over!* Your appointment at *${visit.location?.name}* is in *5 minutes*.\n\n` +
          `Check in when you arrive: ${statusUrl}`;
      }

      // T+0 to T+10: Overdue — gentle nudge
      if (diffMins < 0 && diffMins >= -10) {
        message =
          `⚠️ *You're late!* Your appointment at *${visit.location?.name}* was scheduled for now.\n\n` +
          `Please check in immediately or your spot may be released: ${statusUrl}\n\n` +
          `Reply *CANCEL* to free your spot.`;
      }

      if (message) {
        await this.notificationsService
          .sendWhatsAppMessage(phone, message, visit.tenant?.id)
          .catch((e) => this.logger.warn(`Reminder send failed for visit ${visit.id}: ${e.message}`));
      }
    }
  }

  /**
   * Clean up expired, unverified OTPs every 10 minutes.
   */
  @Cron('*/10 * * * *')
  async handleOtpCleanup() {
    const result = await this.prisma.checkInOtp.deleteMany({
      where: { expiresAt: { lt: new Date() }, verified: false },
    });
    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} expired check-in OTPs`);
    }
  }

  /**
   * SLA Monitor: runs every minute to check if WAITING customers breached their SLA.
   */
  @Cron('* * * * *')
  async handleSlaMonitoring() {
    const visits = await this.prisma.visit.findMany({
      where: {
        currentState: 'WAITING',
        slaStatus: { not: 'BREACHED' },
        service: { slaPolicyId: { not: null } }
      },
      include: {
        service: { include: { slaPolicy: true } },
        customer: { select: { name: true } },
        tenant: { select: { id: true, name: true } }
      }
    });

    const now = new Date();
    for (const v of visits) {
      if (!v.waitingStart || !v.service?.slaPolicy) continue;
      const waitMins = (now.getTime() - v.waitingStart.getTime()) / 60000;
      const policy = v.service.slaPolicy;
      let newStatus = v.slaStatus;

      if (waitMins >= policy.breachThresholdMins && v.slaStatus !== 'BREACHED') {
        newStatus = 'BREACHED';
      } else if (waitMins >= policy.warningThresholdMins && v.slaStatus === 'OK') {
        newStatus = 'WARNING';
      }

      if (newStatus !== v.slaStatus) {
        await this.prisma.visit.update({ where: { id: v.id }, data: { slaStatus: newStatus } });
        
        if (newStatus === 'BREACHED' && policy.escalationPhones && policy.escalationPhones.length > 0) {
          const msg = `🚨 *SLA BREACH* 🚨\nCustomer *${v.customer.name}* has been waiting *${Math.floor(waitMins)} mins* for *${v.service.name}* at *${v.tenant.name}*.`;
          for (const phone of policy.escalationPhones) {
             await this.notificationsService.sendWhatsAppMessage(phone, msg, v.tenant.id).catch(e => this.logger.error(e));
          }
        }
      }
    }
  }

  /**
   * CSAT Surveys: runs every 5 mins, checks for COMPLETED visits ~1hr ago, sends survey.
   */
  @Cron('*/5 * * * *')
  async handleCsatSurveys() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const oneHourFiveMinsAgo = new Date(Date.now() - 65 * 60 * 1000);

    const visits = await this.prisma.visit.findMany({
      where: {
        currentState: 'COMPLETED',
        surveySent: false,
        completedAt: {
          lte: oneHourAgo,
          gte: oneHourFiveMinsAgo
        },
        customer: { phone: { not: null } }
      },
      include: { customer: { select: { name: true, phone: true } }, tenant: { select: { id: true } }, location: { select: { name: true } } }
    });

    for (const v of visits) {
      if (!v.customer?.phone) continue;
      const msg = `Hi ${v.customer.name}, thanks for visiting ${v.location.name}! How was your experience? Reply 1 (Terrible) to 5 (Excellent).`;
      await this.notificationsService.sendWhatsAppMessage(v.customer.phone, msg, v.tenant.id).catch(e => this.logger.error(e));
      await this.prisma.visit.update({ where: { id: v.id }, data: { surveySent: true } });
    }
  }
}

