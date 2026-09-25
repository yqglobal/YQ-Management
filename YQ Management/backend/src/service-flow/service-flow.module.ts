import { Module } from '@nestjs/common';
import { ServiceFlowController } from './service-flow.controller';
import { ServiceFlowService } from './service-flow.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ServiceFlowController],
  providers: [ServiceFlowService],
  exports: [ServiceFlowService],
})
export class ServiceFlowModule {}
