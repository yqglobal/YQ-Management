import { Module, forwardRef } from '@nestjs/common';
import { VisitService } from './visit.service';
import { VisitController } from './visit.controller';
import { VisitCron } from './visit.cron';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { PublicVisitController } from './public-visit.controller';

@Module({
  imports: [WhatsappModule, forwardRef(() => SubscriptionModule)],
  providers: [VisitService, VisitCron],
  controllers: [VisitController, PublicVisitController],
  exports: [VisitService],
})
export class VisitModule {}
