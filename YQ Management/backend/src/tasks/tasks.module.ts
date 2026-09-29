import { Module, forwardRef } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { OutboxProcessorService } from './outbox-processor.service';
import { RedisModule } from '../redis/redis.module';
import { QueueModule } from '../queue/queue.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { CommunicationModule } from '../communication/communication.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { VisitStepModule } from '../visit-step/visit-step.module';

import { BullModule } from '@nestjs/bullmq';
import { WebhookConsumer } from './consumers/webhook.consumer';
import { WhatsappConsumer } from './consumers/whatsapp.consumer';

@Module({
  imports: [
    RedisModule,
    forwardRef(() => QueueModule),
    WebhooksModule,
    CommunicationModule,
    forwardRef(() => NotificationsModule),
    forwardRef(() => VisitStepModule),
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
