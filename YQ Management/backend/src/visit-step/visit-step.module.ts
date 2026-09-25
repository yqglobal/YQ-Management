import { Module } from '@nestjs/common';
import { VisitStepController } from './visit-step.controller';
import { VisitStepService } from './visit-step.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [VisitStepController],
  providers: [VisitStepService],
  exports: [VisitStepService],
})
export class VisitStepModule {}
