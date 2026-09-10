import { Module, forwardRef } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { OutboxProcessorService } from './outbox-processor.service';
import { RedisModule } from '../redis/redis.module';
import { QueueModule } from '../queue/queue.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { CommunicationModule } from '../communication/communication.module';

@Module({
  imports: [
    RedisModule,
    forwardRef(() => QueueModule),
    WebhooksModule,
    forwardRef(() => WhatsappModule),
    CommunicationModule,
  ],
  providers: [TasksService, OutboxProcessorService],
})
export class TasksModule {}
