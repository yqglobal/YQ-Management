import { Module, Global, forwardRef } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { ServiceModule } from '../service/service.module';
import { ServiceFlowModule } from '../service-flow/service-flow.module';

@Global()
@Module({
  imports: [
    forwardRef(() => ServiceModule),
    forwardRef(() => ServiceFlowModule),
  ],
  providers: [TenantService],
  controllers: [TenantController],
  exports: [TenantService],
})
export class TenantModule {}
