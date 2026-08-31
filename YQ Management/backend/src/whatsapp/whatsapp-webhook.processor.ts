import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';

@Processor('whatsapp-webhooks')
export class WhatsappWebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(WhatsappWebhookProcessor.name);

  constructor(private readonly whatsappService: WhatsappService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { instanceName, body } = job.data;
    this.logger.debug(
      `Processing webhook for instance ${instanceName} from queue`,
    );

    try {
      await this.whatsappService.handleWebhook(instanceName, body);
    } catch (err) {
      this.logger.error(
        `Failed to process webhook for instance ${instanceName}`,
        err,
      );
      throw err; // Allow BullMQ to handle retries
    }
  }
}
