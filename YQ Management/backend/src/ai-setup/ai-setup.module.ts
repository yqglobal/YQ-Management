import { Module } from '@nestjs/common';
import { AiSetupService } from './ai-setup.service';
import { AiSetupController } from './ai-setup.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AiSetupController],
  providers: [AiSetupService],
})
export class AiSetupModule {}
