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
            { scheduledTime: { gte: in2hStart, lte: in2hEnd } }
          ]
        },
        include: {
          customer: true,
          tenant: { include: { subscriptions: { include: { plan: true }, where: { status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE'] } } } } }
        }
      });

      for (const visit of upcomingVisits) {
        if (!visit.customer?.phone || !visit.tenant?.whatsappConnected || !visit.tenant?.whatsappInstanceId) continue;
        
        // Check if reminder was already sent via metadata
        const metadata = (visit.metadata as any) || {};
        const remindersSent = metadata.remindersSent || [];
        
        // Determine which reminder window this falls into
        const is24h = visit.scheduledTime! >= in24hStart && visit.scheduledTime! <= in24hEnd;
        const reminderType = is24h ? '24h' : '2h';
        
        if (remindersSent.includes(reminderType)) continue;

        // Construct message
        const sub = visit.tenant.subscriptions?.[0];
        let planFeatures: any = sub?.plan?.features || {};
        if (typeof planFeatures === 'string') {
          try { planFeatures = JSON.parse(planFeatures); } catch (e) {}
        }
        const hasCustomBranding = sub?.status === 'TRIAL' || planFeatures.customBranding === true;
        const watermark = hasCustomBranding ? '' : '\n\nPowered by Qmova';

        const statusUrl = process.env.APP_URL ? `${process.env.APP_URL}/customer/status/${visit.accessToken}` : null;
        const linkText = statusUrl ? ` Track your status here: ${statusUrl}` : '';
        const formattedDate = new Intl.DateTimeFormat('en-US', {
          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true
        }).format(new Date(visit.scheduledTime!));

        const message = `Reminder: Hi ${visit.customer.name}, your appointment is scheduled for ${formattedDate}.${linkText}${watermark}`;

        try {
          await this.whatsappService.sendMessage(visit.tenant.whatsappInstanceId, visit.customer.phone, message);
          
          // Update metadata to record sent reminder
          remindersSent.push(reminderType);
          await this.prisma.visit.update({
            where: { id: visit.id },
            data: { metadata: { ...metadata, remindersSent } }
          });
          this.logger.log(`Sent ${reminderType} reminder to ${visit.customer.phone} for visit ${visit.id}`);
        } catch (err) {
          this.logger.error(`Failed to send ${reminderType} reminder for visit ${visit.id}`, err);
        }
      }

      // Also do the same for the Appointment CRM model
      const upcomingAppointments = await this.prisma.appointment.findMany({
        where: {
          status: { in: ['SCHEDULED'] },
          OR: [
            { scheduledStart: { gte: in24hStart, lte: in24hEnd } },
            { scheduledStart: { gte: in2hStart, lte: in2hEnd } }
          ]
        },
        include: {
          customer: true,
          tenant: { include: { subscriptions: { include: { plan: true }, where: { status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE'] } } } } }
        }
      });

      for (const appt of upcomingAppointments) {
        if (!appt.customer?.phone || !appt.tenant?.whatsappConnected || !appt.tenant?.whatsappInstanceId) continue;
        
        const is24h = appt.scheduledStart >= in24hStart && appt.scheduledStart <= in24hEnd;
        const reminderType = is24h ? '24h' : '2h';
        
        // For Appointment model, we can parse reminderStatus 
        // e.g. reminderStatus = "SENT_24H,SENT_2H"
        const sentList = appt.reminderStatus ? appt.reminderStatus.split(',') : [];
        if (sentList.includes(reminderType)) continue;

        const sub = appt.tenant.subscriptions?.[0];
        let planFeatures: any = sub?.plan?.features || {};
        if (typeof planFeatures === 'string') {
          try { planFeatures = JSON.parse(planFeatures); } catch (e) {}
        }
        const hasCustomBranding = sub?.status === 'TRIAL' || planFeatures.customBranding === true;
        const watermark = hasCustomBranding ? '' : '\n\nPowered by Qmova';

        const formattedDate = new Intl.DateTimeFormat('en-US', {
          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true
        }).format(new Date(appt.scheduledStart));

        const message = `Reminder: Hi ${appt.customer.name}, your appointment is scheduled for ${formattedDate}.${watermark}`;

        try {
          await this.whatsappService.sendMessage(appt.tenant.whatsappInstanceId, appt.customer.phone, message);
          
          sentList.push(reminderType);
          await this.prisma.appointment.update({
            where: { id: appt.id },
            data: { reminderStatus: sentList.join(',') }
          });
          this.logger.log(`Sent ${reminderType} reminder to ${appt.customer.phone} for appointment ${appt.id}`);
        } catch (err) {
          this.logger.error(`Failed to send ${reminderType} reminder for appointment ${appt.id}`, err);
        }
      }

      this.logger.log('Appointment Reminders check completed.');
    } catch (error) {
      this.logger.error('Error during Appointment Reminders check:', error);
    }
  }
}
