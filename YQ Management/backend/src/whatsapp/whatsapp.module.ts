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

import { BullModule } from '@nestjs/bullmq';
import { WhatsappWebhookProcessor } from './whatsapp-webhook.processor';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    forwardRef(() => QueueModule),
    forwardRef(() => SubscriptionModule),
    forwardRef(() => ServiceModule),
    forwardRef(() => AppointmentModule),
    BullModule.registerQueue({
      name: 'whatsapp-webhooks',
    }),
  ],
  controllers: [WhatsappController],
  providers: [WhatsappService, WhatsappLogger, WhatsappWebhookProcessor],
  exports: [WhatsappService, WhatsappLogger],
})
export class WhatsappModule {}
