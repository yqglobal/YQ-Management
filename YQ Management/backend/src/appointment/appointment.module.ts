import { Module, forwardRef } from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { AppointmentReminderCron } from './appointment-reminder.cron';
import { AppointmentController } from './appointment.controller';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { RedisModule } from '../redis/redis.module';
import { GoogleModule } from '../integrations/google/google.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [forwardRef(() => WhatsappModule), RedisModule, GoogleModule, forwardRef(() => QueueModule)],
  providers: [AppointmentService, AppointmentReminderCron],
  controllers: [AppointmentController],
  exports: [AppointmentService],
})
export class AppointmentModule {}
