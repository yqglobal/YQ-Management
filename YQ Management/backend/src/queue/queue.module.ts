import { Module, forwardRef } from '@nestjs/common';
import { QueueService } from './queue.service';
import { QueueController } from './queue.controller';
import { QueueGateway } from './queue.gateway';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { VisitModule } from '../visit/visit.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    WebhooksModule,
    forwardRef(() => VisitModule),
    forwardRef(() => SubscriptionModule),
    PrismaModule,
  ],
  providers: [QueueService, QueueGateway],
  controllers: [QueueController],
  exports: [QueueService, QueueGateway],
})
export class QueueModule {}
