import { Module, forwardRef } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { OutboxProcessorService } from './outbox-processor.service';
import { RedisModule } from '../redis/redis.module';
import { QueueModule } from '../queue/queue.module';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [RedisModule, forwardRef(() => QueueModule), WebhooksModule],
  providers: [TasksService, OutboxProcessorService],
})
export class TasksModule {}
