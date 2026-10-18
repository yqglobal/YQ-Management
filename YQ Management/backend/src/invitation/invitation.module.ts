import { Module, forwardRef } from '@nestjs/common';
import { InvitationService } from './invitation.service';
import { InvitationController } from './invitation.controller';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [forwardRef(() => SubscriptionModule)],
  providers: [InvitationService],
  controllers: [InvitationController],
  exports: [InvitationService],
})
export class InvitationModule {}

