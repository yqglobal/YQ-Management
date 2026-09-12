import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { VisitNotificationService, VisitNotificationType } from '../../communication/visit-notification.service';

@Processor('queue_whatsapp')
export class WhatsappConsumer extends WorkerHost {
  private readonly logger = new Logger(WhatsappConsumer.name);

  constructor(private readonly visitNotificationService: VisitNotificationService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { type, payload } = job.data;
    
    this.logger.debug(`Processing WhatsApp job ${job.id} for visit ${payload.visitId}, event ${type}`);

    try {
      await this.visitNotificationService.notify(type as VisitNotificationType, {
        visitId: payload.visitId as string,
        tenantId: payload.tenantId as string,
        displayId: payload.displayId as string | undefined,
      });
      this.logger.debug(`Successfully processed WhatsApp job ${job.id}`);
    } catch (error: any) {
      this.logger.error(`Failed to process WhatsApp job ${job.id}: ${error.message}`, error.stack);
      throw error; // Let BullMQ handle retries
    }
  }
}
