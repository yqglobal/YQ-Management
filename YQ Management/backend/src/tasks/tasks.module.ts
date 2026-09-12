import { Module, forwardRef } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { OutboxProcessorService } from './outbox-processor.service';
import { RedisModule } from '../redis/redis.module';
import { QueueModule } from '../queue/queue.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { CommunicationModule } from '../communication/communication.module';

import { BullModule } from '@nestjs/bullmq';
import { WebhookConsumer } from './consumers/webhook.consumer';
import { WhatsappConsumer } from './consumers/whatsapp.consumer';

// NOTE: WhatsappModule is intentionally NOT imported here.
// WhatsApp notification logic is fully encapsulated in VisitNotificationService,
// which is exported by CommunicationModule. This eliminates the forwardRef
// circular dependency that previously existed between TasksModule and WhatsappModule.
@Module({
  imports: [
    RedisModule,
    forwardRef(() => QueueModule),
    WebhooksModule,
    CommunicationModule,
    BullModule.registerQueue(
      { name: 'queue_webhooks' },
      { name: 'queue_whatsapp' },
    ),
  ],
  providers: [
    TasksService, 
    OutboxProcessorService,
    WebhookConsumer,
    WhatsappConsumer,
  ],
})
export class TasksModule {}

