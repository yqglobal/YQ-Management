import { Module, forwardRef } from '@nestjs/common';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { WhatsappLogger } from './whatsapp.logger';

import { QueueModule } from '../queue/queue.module';

import { SubscriptionModule } from '../subscription/subscription.module';
import { ServiceModule } from '../service/service.module';
import { AppointmentModule } from '../appointment/appointment.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    forwardRef(() => QueueModule),
    forwardRef(() => SubscriptionModule),
    forwardRef(() => ServiceModule),
    forwardRef(() => AppointmentModule),
  ],
  controllers: [WhatsappController],
  providers: [WhatsappService, WhatsappLogger],
  exports: [WhatsappService, WhatsappLogger],
})
export class WhatsappModule {}
