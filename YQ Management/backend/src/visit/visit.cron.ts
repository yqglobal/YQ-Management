import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Injectable()
export class VisitCron {
  private readonly logger = new Logger(VisitCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsappService,
  ) {}

  /**
   * FIX (4B): Timezone-safe End-of-Day sweep.
   * Previous: Ran at 00:00 UTC, which is 05:30 AM IST — would sweep active evening visitors.
   * Now:      Runs at 23:00 UTC. For IST (+5:30), this is 04:30 AM, which is safely after
   *           business hours for most tenants in Asia/Kolkata, AEST, and most of Asia.
   *
   * TODO (future): Store a timezone string on each Location and sweep per-location
   *                rather than using a global UTC time.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleSlaMonitor() {
    this.logger.debug('Running SLA Monitor...');
    
    try {
      const waitingVisits = await this.prisma.visit.findMany({
        where: {
          currentState: { in: ['WAITING', 'CHECKED_IN'] },
          slaStatus: { not: 'BREACHED' },
          service: { slaPolicyId: { not: null } }
        },
        include: {
          service: { include: { slaPolicy: true } },
          customer: true,
          tenant: true
        }
      });

      for (const visit of waitingVisits) {
        if (!visit.waitingStart || !visit.service?.slaPolicy) continue;

        const waitTimeMs = Date.now() - new Date(visit.waitingStart).getTime();
        const waitTimeMins = Math.floor(waitTimeMs / 60000);
        const policy = visit.service.slaPolicy;
        
        let newStatus = visit.slaStatus;
        if (waitTimeMins >= policy.breachThresholdMins) {
          newStatus = 'BREACHED';
        } else if (waitTimeMins >= policy.warningThresholdMins) {
          newStatus = 'WARNING';
        }

        if (newStatus !== visit.slaStatus) {
          await this.prisma.visit.update({
            where: { id: visit.id },
            data: { slaStatus: newStatus }
          });

          this.logger.log(`Visit ${visit.id} SLA status changed to ${newStatus}`);

          await this.prisma.outboxEvent.create({
            data: {
              type: 'queue_status_changed',
              payload: { tenantId: visit.tenantId, queueId: visit.queueId }
            }
          });

          // Notify managers on breach
          if (newStatus === 'BREACHED' && policy.escalationPhones && policy.escalationPhones.length > 0) {
            const message = `🚨 SLA BREACH: Customer ${visit.customer.name} has been waiting for ${waitTimeMins} mins for ${visit.service.name}.`;
            for (const phone of policy.escalationPhones) {
              if (visit.tenant?.whatsappConnected && visit.tenant?.whatsappInstanceId) {
                try {
                  await this.whatsappService.sendMessage(visit.tenant.whatsappInstanceId, phone, message);
                } catch (e) {
                  this.logger.error(`Failed to send SLA breach alert to ${phone}: ${e}`);
                }
              }
            }
          }
        }
      }
    } catch (err) {
      this.logger.error('Error running SLA monitor', err);
    }
  }

  @Cron('0 23 * * *') // 23:00 UTC daily — safely past business hours for IST/AEST tenants
  async handleEndOfDaySweeps() {
    this.logger.log('Starting End-of-Day Visit Sweep...');

    try {
      // 1. Sweep WAITING and CHECKED_IN to NO_SHOW
      const waitingVisits = await this.prisma.visit.findMany({
        where: {
          currentState: { in: ['WAITING', 'CHECKED_IN'] },
        },
        include: {
          customer: true,
          tenant: true,
        },
      });

      if (waitingVisits.length > 0) {
        this.logger.log(
          `Found ${waitingVisits.length} waiting visits to mark as NO_SHOW.`,
        );

        await this.prisma.visit.updateMany({
          where: {
            id: { in: waitingVisits.map((v) => v.id) },
          },
          data: {
            currentState: 'NO_SHOW',
            updatedAt: new Date(),
          },
        });

        // Try to notify them
        for (const visit of waitingVisits) {
          if (
            visit.customer?.phone &&
            visit.tenant?.whatsappConnected &&
            visit.tenant?.whatsappInstanceId
          ) {
            try {
              const message = `Hi ${visit.customer.name}, we're sorry we missed you today! We have closed for the day and your place in the waitlist has been cancelled. Please visit us again tomorrow.`;
              await this.whatsappService.sendMessage(
                visit.tenant.whatsappInstanceId,
                visit.customer.phone,
                message,
              );
            } catch (err) {
              this.logger.warn(
                `Failed to send closing message to ${visit.customer.phone}: ${err}`,
              );
            }
          }
        }
      }

      // 2. Sweep IN_SERVICE to COMPLETED
      const inServiceVisits = await this.prisma.visit.findMany({
        where: {
          currentState: 'IN_SERVICE',
        },
      });

      if (inServiceVisits.length > 0) {
        this.logger.log(
          `Found ${inServiceVisits.length} in-service visits to mark as COMPLETED.`,
        );

        await this.prisma.visit.updateMany({
          where: {
            id: { in: inServiceVisits.map((v) => v.id) },
          },
          data: {
            currentState: 'COMPLETED',
            completedAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }

      this.logger.log('End-of-Day Visit Sweep completed successfully.');
    } catch (error) {
      this.logger.error('Error during End-of-Day Visit Sweep:', error);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleAppointmentReminders() {
    this.logger.log('Starting Appointment Reminders check...');
    try {
      const now = new Date();

      // Calculate time windows
      const in24hStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
      const in24hEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

      const in2hStart = new Date(now.getTime() + 1 * 60 * 60 * 1000);
      const in2hEnd = new Date(now.getTime() + 3 * 60 * 60 * 1000);

      // We will check Visits that have scheduledTime
      const upcomingVisits = await this.prisma.visit.findMany({
        where: {
          scheduledTime: { not: null },
          currentState: { in: ['SCHEDULED', 'CREATED'] },
          OR: [
            { scheduledTime: { gte: in24hStart, lte: in24hEnd } },
            { scheduledTime: { gte: in2hStart, lte: in2hEnd } },
          ],
        },
        include: {
          customer: true,
          tenant: {
            include: {
              subscriptions: {
                include: { plan: true },
                where: { status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE'] } },
              },
            },
          },
        },
      });

      for (const visit of upcomingVisits) {
        if (
          !visit.customer?.phone ||
          !visit.tenant?.whatsappConnected ||
          !visit.tenant?.whatsappInstanceId
        )
          continue;

        // Check if reminder was already sent via metadata
        const metadata = (visit.metadata as any) || {};
        const remindersSent = metadata.remindersSent || [];

        // Determine which reminder window this falls into
        const is24h =
          visit.scheduledTime! >= in24hStart &&
          visit.scheduledTime! <= in24hEnd;
        const reminderType = is24h ? '24h' : '2h';

        if (remindersSent.includes(reminderType)) continue;

        // Construct message
        const sub = visit.tenant.subscriptions?.[0];
        let planFeatures: any = sub?.plan?.features || {};
        if (typeof planFeatures === 'string') {
          try {
            planFeatures = JSON.parse(planFeatures);
          } catch (e) {}
        }
        const hasCustomBranding =
          sub?.status === 'TRIAL' || planFeatures.customBranding === true;
        const watermark = hasCustomBranding ? '' : '\n\nPowered by Qmova';

        const statusUrl = process.env.APP_URL
          ? `${process.env.APP_URL}/customer/status/${visit.accessToken}`
          : null;
        const linkText = statusUrl
          ? ` Track your status here: ${statusUrl}`
          : '';
        const formattedDate = new Intl.DateTimeFormat('en-US', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }).format(new Date(visit.scheduledTime!));

        const message = `Reminder: Hi ${visit.customer.name}, your appointment is scheduled for ${formattedDate}.${linkText}${watermark}`;

        try {
          await this.whatsappService.sendMessage(
            visit.tenant.whatsappInstanceId,
            visit.customer.phone,
            message,
          );

          // Update metadata to record sent reminder
          remindersSent.push(reminderType);
          await this.prisma.visit.update({
            where: { id: visit.id },
            data: { metadata: { ...metadata, remindersSent } },
          });
          this.logger.log(
            `Sent ${reminderType} reminder to ${visit.customer.phone} for visit ${visit.id}`,
          );
        } catch (err) {
          this.logger.error(
            `Failed to send ${reminderType} reminder for visit ${visit.id}`,
            err,
          );
        }
      }

      // Also do the same for the Appointment CRM model
      const upcomingAppointments = await this.prisma.appointment.findMany({
        where: {
          status: { in: ['SCHEDULED'] },
          OR: [
            { scheduledStart: { gte: in24hStart, lte: in24hEnd } },
            { scheduledStart: { gte: in2hStart, lte: in2hEnd } },
          ],
        },
        include: {
          customer: true,
          tenant: {
            include: {
              subscriptions: {
                include: { plan: true },
                where: { status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE'] } },
              },
            },
          },
        },
      });

      for (const appt of upcomingAppointments) {
        if (
          !appt.customer?.phone ||
          !appt.tenant?.whatsappConnected ||
          !appt.tenant?.whatsappInstanceId
        )
          continue;

        const is24h =
          appt.scheduledStart >= in24hStart && appt.scheduledStart <= in24hEnd;
        const reminderType = is24h ? '24h' : '2h';

        // For Appointment model, we can parse reminderStatus
        // e.g. reminderStatus = "SENT_24H,SENT_2H"
        const sentList = appt.reminderStatus
          ? appt.reminderStatus.split(',')
          : [];
        if (sentList.includes(reminderType)) continue;

        const sub = appt.tenant.subscriptions?.[0];
        let planFeatures: any = sub?.plan?.features || {};
        if (typeof planFeatures === 'string') {
          try {
            planFeatures = JSON.parse(planFeatures);
          } catch (e) {}
        }
        const hasCustomBranding =
          sub?.status === 'TRIAL' || planFeatures.customBranding === true;
        const watermark = hasCustomBranding ? '' : '\n\nPowered by Qmova';

        const formattedDate = new Intl.DateTimeFormat('en-US', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }).format(new Date(appt.scheduledStart));

        const message = `Reminder: Hi ${appt.customer.name}, your appointment is scheduled for ${formattedDate}.${watermark}`;

        try {
          await this.whatsappService.sendMessage(
            appt.tenant.whatsappInstanceId,
            appt.customer.phone,
            message,
          );

          sentList.push(reminderType);
          await this.prisma.appointment.update({
            where: { id: appt.id },
            data: { reminderStatus: sentList.join(',') },
          });
          this.logger.log(
            `Sent ${reminderType} reminder to ${appt.customer.phone} for appointment ${appt.id}`,
          );
        } catch (err) {
          this.logger.error(
            `Failed to send ${reminderType} reminder for appointment ${appt.id}`,
            err,
          );
        }
      }

      this.logger.log('Appointment Reminders check completed.');
    } catch (error) {
      this.logger.error('Error during Appointment Reminders check:', error);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleSlaMonitor() {
    try {
      const now = new Date();
      const waitingVisits = await this.prisma.visit.findMany({
        where: {
          currentState: 'WAITING',
          waitingStart: { not: null },
          slaStatus: { not: 'BREACHED' },
          service: { slaPolicyId: { not: null } }
        },
        include: {
          customer: true,
          service: { include: { slaPolicy: true } },
          tenant: true
        }
      });

      for (const visit of waitingVisits) {
        const policy = visit.service?.slaPolicy;
        if (!policy) continue;

        const waitMins = Math.floor((now.getTime() - visit.waitingStart!.getTime()) / 60000);
        let newStatus = visit.slaStatus;

        if (waitMins >= policy.breachThresholdMins) {
          newStatus = 'BREACHED';
        } else if (waitMins >= policy.warningThresholdMins && visit.slaStatus === 'OK') {
          newStatus = 'WARNING';
        }

        if (newStatus !== visit.slaStatus) {
          await this.prisma.visit.update({
            where: { id: visit.id },
            data: { slaStatus: newStatus }
          });

          if (visit.tenant?.whatsappConnected && visit.tenant?.whatsappInstanceId && policy.escalationPhones?.length > 0) {
            const message = `\u26A0\uFE0F SLA ${newStatus}: Visit ${visit.displayId || visit.id} for ${visit.customer.name} has been waiting for ${waitMins} mins. (Service: ${visit.service.name})`;
            for (const phone of policy.escalationPhones) {
              try {
                await this.whatsappService.sendMessage(visit.tenant.whatsappInstanceId, phone, message);
              } catch (e) {
                this.logger.error(`Failed to send SLA alert to ${phone}: ${e}`);
              }
            }
          }
        }
      }
    } catch (e) {
      this.logger.error('Error during SLA Monitor sweep:', e);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCsatSurveys() {
    try {
      const oneHourAgoStart = new Date(Date.now() - 61 * 60000); // 61 mins ago
      const oneHourAgoEnd = new Date(Date.now() - 60 * 60000);   // 60 mins ago

      const completedVisits = await this.prisma.visit.findMany({
        where: {
          currentState: 'COMPLETED',
          completedAt: { gte: oneHourAgoStart, lte: oneHourAgoEnd },
          surveySent: false
        },
        include: {
          customer: true,
          tenant: true
        }
      });

      for (const visit of completedVisits) {
        if (!visit.customer?.phone || !visit.tenant?.whatsappConnected || !visit.tenant?.whatsappInstanceId) {
          continue;
        }

        try {
          const message = `Hi ${visit.customer.name}, thank you for visiting ${visit.tenant.name}! How would you rate your experience today out of 5? (Please reply with a number from 1 to 5)`;
          await this.whatsappService.sendMessage(visit.tenant.whatsappInstanceId, visit.customer.phone, message);

          await this.prisma.visit.update({
            where: { id: visit.id },
            data: { surveySent: true }
          });
        } catch (e) {
          this.logger.error(`Failed to send CSAT survey to ${visit.customer.phone}: ${e}`);
        }
      }
    } catch (e) {
      this.logger.error('Error during CSAT Survey sweep:', e);
    }
  }
}
