import { Module, MiddlewareConsumer, NestModule, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { BillingController } from './billing.controller';
import { PlansService } from '../plans/plans.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { PaymentsService } from '../payments/payments.service';
import { InvoiceService } from '../invoice/invoice.service';
import { UsageService } from '../usage/usage.service';
import { ProviderRegistry } from './providers/provider-registry.service';
import { BillingConfigService } from './config/billing-config.service';
import { WebhookProcessService } from '../webhooks/webhook-process.service';
import { EnterpriseInquiryController } from './enterprise-inquiry.controller';
import { EnterpriseInquiryService } from './enterprise-inquiry.service';
import { EmailModule } from '../email/email.module';
import { SystemLogModule } from '../system-log/system-log.module';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => AuthModule),
    PermissionsModule,
    SystemLogModule,
    EmailModule,
    forwardRef(() => SubscriptionModule),
  ],
  controllers: [BillingController, EnterpriseInquiryController],
  providers: [
    PlansService,
    
    PaymentsService,
    InvoiceService,
    UsageService,
    ProviderRegistry,
    BillingConfigService,
    WebhookProcessService,
    EnterpriseInquiryService,
  ],
  exports: [
    PlansService,
    
    PaymentsService,
    InvoiceService,
    UsageService,
    ProviderRegistry,
    BillingConfigService,
    WebhookProcessService,
  ],
})
export class BillingModule {}
