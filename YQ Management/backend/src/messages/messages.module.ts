import { Module, forwardRef } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [forwardRef(() => NotificationsModule), WhatsappModule, forwardRef(() => QueueModule)],
  controllers: [MessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}
