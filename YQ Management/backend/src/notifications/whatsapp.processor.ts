import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { NotificationsService } from './notifications.service';
import { Logger } from '@nestjs/common';

@Processor('whatsapp')
export class WhatsappProcessor extends WorkerHost {
  private readonly logger = new Logger(WhatsappProcessor.name);

  constructor(private readonly notificationsService: NotificationsService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing whatsapp job ${job.id}`);
    const { to, body, tenantId } = job.data;
    await this.notificationsService.executeWhatsAppMessage(to, body, tenantId);
  }
}
