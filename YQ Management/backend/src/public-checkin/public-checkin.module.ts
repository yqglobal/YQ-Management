import { Module } from '@nestjs/common';
import { PublicCheckinController } from './public-checkin.controller';
import { PublicCheckinService } from './public-checkin.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [PublicCheckinController],
  providers: [PublicCheckinService],
  exports: [PublicCheckinService],
})
export class PublicCheckinModule {}
