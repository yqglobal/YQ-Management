import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from './token.service';
import { TemplateService } from '../communication/templates/template.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AppointmentCron {
  private readonly logger = new Logger(AppointmentCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly templateService: TemplateService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleAutoCheckIn() {
    const fifteenMinsFromNow = new Date(Date.now() + 15 * 60000);

    const appointmentsToAutoCheckIn = await this.prisma.token.findMany({
      where: {
        isAppointment: true,
        checkedIn: false,
        status: 'WAITING',
        scheduledFor: { lte: fifteenMinsFromNow },
        queue: {
          requireManualCheckIn: false,
        },
      },
      include: { queue: true },
    });

    for (const token of appointmentsToAutoCheckIn) {
      try {
        await this.tokenService.checkIn(token.id, token.queue.tenantId);
        this.logger.log(`Auto-checked in appointment token: ${token.id}`);
      } catch (e) {
        this.logger.error(`Failed to auto-check in token: ${token.id}`, e);
      }
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handle24HourReminders() {
    const now = Date.now();
    const startWindow = new Date(now + 23 * 60 * 60000); // 23 hours from now
    const endWindow = new Date(now + 25 * 60 * 60000); // 25 hours from now

    const appointmentsToRemind = await this.prisma.token.findMany({
      where: {
        isAppointment: true,
        status: 'WAITING',
        reminderSent: false,
        scheduledFor: {
          gte: startWindow,
          lte: endWindow,
        },
      },
      include: { queue: true },
    });

    for (const token of appointmentsToRemind) {
      try {
        if (token.phone) {
          const displayCode = token.displayId || token.id.substring(0, 5).toUpperCase();
          const message = await this.templateService.renderWhatsAppForWorkspace(
            token.queue.workspaceId,
            'appointment_reminder',
            {
              name: token.customerName,
              date: token.scheduledFor?.toLocaleString() || '',
              token: displayCode,
              link: `${(process.env.APP_URL ? (process.env.APP_URL.startsWith('http') ? process.env.APP_URL : 'https://' + process.env.APP_URL) : 'http://localhost:3001')}/customer/status/${token.id}`,
            },
          );
          
          if (message) {
            await this.notificationsService.sendWhatsAppMessage(
              token.phone,
              message,
              token.queue.tenantId,
            );
          }
        }
        
        await this.prisma.token.update({
          where: { id: token.id },
          data: { reminderSent: true },
        });
        
        this.logger.log(`Sent 24h reminder for token: ${token.id}`);
      } catch (e) {
        this.logger.error(`Failed to send 24h reminder for token: ${token.id}`, e);
      }
    }
  }
}
