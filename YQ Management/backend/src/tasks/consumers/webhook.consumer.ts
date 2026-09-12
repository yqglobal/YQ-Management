import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { WebhooksService } from '../../webhooks/webhooks.service';

@Processor('queue_webhooks')
export class WebhookConsumer extends WorkerHost {
  private readonly logger = new Logger(WebhookConsumer.name);

  constructor(private readonly webhooksService: WebhooksService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { tenantId, type, payload } = job.data;
    
    this.logger.debug(`Processing webhook job ${job.id} for tenant ${tenantId}, event ${type}`);

    try {
      await this.webhooksService.triggerWebhooks(tenantId, type, payload);
      this.logger.debug(`Successfully processed webhook job ${job.id}`);
    } catch (error: any) {
      this.logger.error(`Failed to process webhook job ${job.id}: ${error.message}`, error.stack);
      throw error; // Let BullMQ handle retries
    }
  }
}
