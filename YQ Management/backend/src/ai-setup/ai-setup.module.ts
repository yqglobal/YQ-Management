import { Module } from '@nestjs/common';
import { AiSetupService } from './ai-setup.service';
import { AiSetupController } from './ai-setup.controller';

@Module({
  controllers: [AiSetupController],
  providers: [AiSetupService],
})
export class AiSetupModule {}
