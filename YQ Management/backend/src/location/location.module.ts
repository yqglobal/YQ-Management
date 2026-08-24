import { Module } from '@nestjs/common';
import { LocationService } from './location.service';
import { LocationController } from './location.controller';

import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [SubscriptionModule],
  providers: [LocationService],
  controllers: [LocationController],
})
export class LocationModule {}
