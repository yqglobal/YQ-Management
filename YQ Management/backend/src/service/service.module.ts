import { Module, forwardRef } from '@nestjs/common';
import { ServiceService } from './service.service';
import { ServiceController } from './service.controller';
import { QueueModule } from '../queue/queue.module';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [forwardRef(() => QueueModule), forwardRef(() => SubscriptionModule)],
  providers: [ServiceService],
  controllers: [ServiceController],
  exports: [ServiceService],
})
export class ServiceModule {}
