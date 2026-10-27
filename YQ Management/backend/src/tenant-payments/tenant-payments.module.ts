import { Module, forwardRef } from '@nestjs/common';
import { TenantPaymentsController } from './tenant-payments.controller';
import { TenantPaymentsService } from './tenant-payments.service';
import { PrismaModule } from '../prisma/prisma.module';
import { VisitStepModule } from '../visit-step/visit-step.module';
import { InvoiceModule } from '../invoice/invoice.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [
    PrismaModule,
    VisitStepModule,
    InvoiceModule,
    forwardRef(() => WhatsappModule),
    forwardRef(() => QueueModule),
  ],
  controllers: [TenantPaymentsController],
  providers: [TenantPaymentsService],
  exports: [TenantPaymentsService],
})
export class TenantPaymentsModule {}
