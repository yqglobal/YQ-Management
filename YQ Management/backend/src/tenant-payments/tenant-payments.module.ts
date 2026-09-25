import { Module } from '@nestjs/common';
import { TenantPaymentsController } from './tenant-payments.controller';
import { TenantPaymentsService } from './tenant-payments.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TenantPaymentsController],
  providers: [TenantPaymentsService],
  exports: [TenantPaymentsService],
})
export class TenantPaymentsModule {}
