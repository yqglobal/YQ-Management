import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AnalyticsDigestCron } from './analytics-digest.cron';
import { CommunicationModule } from '../communication/communication.module';

@Module({
  imports: [PrismaModule, CommunicationModule],
  providers: [AuditService, AnalyticsDigestCron],
  controllers: [AuditController],
  exports: [AuditService],
})
export class AuditModule {}
