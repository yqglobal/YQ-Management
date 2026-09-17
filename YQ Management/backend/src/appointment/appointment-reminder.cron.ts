import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Injectable()
export class AppointmentReminderCron {
  private readonly logger = new Logger(AppointmentReminderCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsappService,
  ) {}

  @Cron('0 */15 * * * *')
  async handleReminders() {
    this.logger.log('Running appointment reminder check...');
    try {
      const now = new Date();
      const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const in24HoursAnd15Mins = new Date(in24Hours.getTime() + 15 * 60 * 1000);

      const upcomingAppointments = await this.prisma.appointment.findMany({
        where: {
          status: 'SCHEDULED',
          scheduledStart: {
            gte: now,
            lte: in24HoursAnd15Mins,
          },
          reminderStatus: null,
        },
        include: {
          customer: true,
          tenant: true,
          service: true,
        },
      });

      for (const apt of upcomingAppointments) {
        if (!apt.customer?.phone) continue;

        // Skip if tenant doesn't have WhatsApp connected
        if (!apt.tenant.whatsappConnected || !apt.tenant.whatsappInstanceId) continue;

        const timeString = apt.scheduledStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateString = apt.scheduledStart.toLocaleDateString();

        const message = `Reminder: You have an appointment for ${apt.service.name} at ${timeString} on ${dateString}. Please arrive 5 minutes early. To reschedule, contact us.`;

        try {
          await this.whatsappService.testMessage(apt.tenantId, apt.customer.phone, message);
          
          await this.prisma.appointment.update({
            where: { id: apt.id },
            data: { reminderStatus: 'SENT_24H' },
          });

          this.logger.log(`Sent reminder for appointment ${apt.id} to ${apt.customer.phone}`);
        } catch (err) {
          this.logger.warn(`Failed to send reminder for appointment ${apt.id}: ${err.message}`);
        }
      }
    } catch (error) {
      this.logger.error('Failed to run appointment reminder check', error);
    }
  }
}
