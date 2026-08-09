import { Module } from '@nestjs/common';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { WhatsappLogger } from './whatsapp.logger';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [WhatsappController],
  providers: [WhatsappService, WhatsappLogger],
  exports: [WhatsappService, WhatsappLogger],
})
export class WhatsappModule {}
