import { Module, forwardRef } from '@nestjs/common';
import { BlockOffService } from './block-off.service';
import { BlockOffController } from './block-off.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [PrismaModule, forwardRef(() => QueueModule)],
  controllers: [BlockOffController],
  providers: [BlockOffService],
  exports: [BlockOffService],
})
export class BlockOffModule {}
