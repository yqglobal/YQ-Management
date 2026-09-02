import { Module } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [NotificationsModule, WhatsappModule],
  controllers: [MessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}
