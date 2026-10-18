import { Module, forwardRef } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [forwardRef(() => SubscriptionModule)],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
