import { Module } from '@nestjs/common';
import { TenantPaymentsController } from './tenant-payments.controller';
import { TenantPaymentsService } from './tenant-payments.service';
import { PrismaModule } from '../prisma/prisma.module';
import { VisitStepModule } from '../visit-step/visit-step.module';

@Module({
  imports: [PrismaModule, VisitStepModule],
  controllers: [TenantPaymentsController],
  providers: [TenantPaymentsService],
  exports: [TenantPaymentsService],
})
export class TenantPaymentsModule {}
