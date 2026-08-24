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
}
