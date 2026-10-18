import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ServiceFlowModule } from '../service-flow/service-flow.module';
import { ServiceModule } from '../service/service.module';
import { QueueModule } from '../queue/queue.module';
import { LocationModule } from '../location/location.module';

@Module({
  imports: [
    PrismaModule,
    ServiceFlowModule,
    ServiceModule,
    QueueModule,
    LocationModule,
  ],
  controllers: [OnboardingController],
  providers: [OnboardingService],
})
export class OnboardingModule {}
