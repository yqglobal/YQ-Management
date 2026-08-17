import { Module } from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { AppointmentController } from './appointment.controller';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [WhatsappModule, RedisModule],
  providers: [AppointmentService],
  controllers: [AppointmentController],
})
export class AppointmentModule {}
