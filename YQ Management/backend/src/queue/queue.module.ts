import { Module, forwardRef } from '@nestjs/common';
import { QueueService } from './queue.service';
import { QueueController } from './queue.controller';
import { QueueGateway } from './queue.gateway';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { VisitModule } from '../visit/visit.module';

@Module({
  imports: [WebhooksModule, forwardRef(() => VisitModule)],
  providers: [QueueService, QueueGateway],
  controllers: [QueueController],
  exports: [QueueService, QueueGateway],
})
export class QueueModule {}
