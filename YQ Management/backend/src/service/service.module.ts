import { Module, forwardRef } from '@nestjs/common';
import { ServiceService } from './service.service';
import { ServiceController } from './service.controller';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [forwardRef(() => QueueModule)],
  providers: [ServiceService],
  controllers: [ServiceController],
})
export class ServiceModule {}
