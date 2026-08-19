import { Module, forwardRef } from '@nestjs/common';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { WhatsappLogger } from './whatsapp.logger';

import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [PrismaModule, RedisModule, forwardRef(() => QueueModule)],
  controllers: [WhatsappController],
  providers: [WhatsappService, WhatsappLogger],
  exports: [WhatsappService, WhatsappLogger],
})
export class WhatsappModule {}
