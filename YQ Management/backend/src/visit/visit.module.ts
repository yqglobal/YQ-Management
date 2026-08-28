import { Module, forwardRef } from '@nestjs/common';
import { VisitService } from './visit.service';
import { VisitController } from './visit.controller';
import { VisitCron } from './visit.cron';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { PublicVisitController } from './public-visit.controller';
import { AppointmentModule } from '../appointment/appointment.module';
import { TokenController } from './token.controller';
import { CommunicationModule } from '../communication/communication.module';

@Module({
  imports: [
    WhatsappModule,
    forwardRef(() => SubscriptionModule),
    forwardRef(() => AppointmentModule),
    CommunicationModule,
  ],
  providers: [VisitService, VisitCron],
  controllers: [VisitController, PublicVisitController, TokenController],
  exports: [VisitService],
})
export class VisitModule {}
