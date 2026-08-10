import { Module } from '@nestjs/common';
import { QueueService } from './queue.service';
import { QueueController } from './queue.controller';
import { QueueGateway } from './queue.gateway';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [WebhooksModule],
  providers: [QueueService, QueueGateway],
  controllers: [QueueController],
  exports: [QueueService, QueueGateway],
})
export class QueueModule {}
