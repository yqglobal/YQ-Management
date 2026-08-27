import { Module } from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { AppointmentController } from './appointment.controller';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { RedisModule } from '../redis/redis.module';
import { GoogleModule } from '../integrations/google/google.module';

@Module({
  imports: [WhatsappModule, RedisModule, GoogleModule],
  providers: [AppointmentService],
  controllers: [AppointmentController],
  exports: [AppointmentService],
})
export class AppointmentModule {}
