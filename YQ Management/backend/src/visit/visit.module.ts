import { Module } from '@nestjs/common';
import { VisitService } from './visit.service';
import { VisitController } from './visit.controller';
import { VisitCron } from './visit.cron';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

import { PublicVisitController } from './public-visit.controller';

@Module({
  imports: [WhatsappModule],
  providers: [VisitService, VisitCron],
  controllers: [VisitController, PublicVisitController],
})
export class VisitModule {}
