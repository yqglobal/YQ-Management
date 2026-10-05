import { Module } from '@nestjs/common';
import { TenantPaymentsController } from './tenant-payments.controller';
import { TenantPaymentsService } from './tenant-payments.service';
import { PrismaModule } from '../prisma/prisma.module';
import { VisitStepModule } from '../visit-step/visit-step.module';
import { InvoiceModule } from '../invoice/invoice.module';

@Module({
  imports: [PrismaModule, VisitStepModule, InvoiceModule],
  controllers: [TenantPaymentsController],
  providers: [TenantPaymentsService],
  exports: [TenantPaymentsService],
})
export class TenantPaymentsModule {}
