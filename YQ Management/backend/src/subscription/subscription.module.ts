import { Module, forwardRef } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionCron } from './subscription.cron';
import { PrismaModule } from '../prisma/prisma.module';
import { BillingModule } from '../billing/billing.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { CommunicationModule } from '../communication/communication.module';

import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => BillingModule),
    PermissionsModule,
    CommunicationModule,
    EmailModule,
  ],
  controllers: [SubscriptionController],
  providers: [SubscriptionService, SubscriptionCron],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
