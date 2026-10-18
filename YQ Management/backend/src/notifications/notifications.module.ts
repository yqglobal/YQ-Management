import { Module, forwardRef } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

import { BullModule } from '@nestjs/bullmq';
import { WhatsappProcessor } from './whatsapp.processor';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'whatsapp',
    }),
    forwardRef(() => WhatsappModule),
  ],
  providers: [NotificationsService, WhatsappProcessor],
  controllers: [],
  exports: [NotificationsService],
})
export class NotificationsModule {}
