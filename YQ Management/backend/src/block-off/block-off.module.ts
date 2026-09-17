import { Module } from '@nestjs/common';
import { BlockOffService } from './block-off.service';
import { BlockOffController } from './block-off.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [PrismaModule, QueueModule],
  controllers: [BlockOffController],
  providers: [BlockOffService],
  exports: [BlockOffService],
})
export class BlockOffModule {}
