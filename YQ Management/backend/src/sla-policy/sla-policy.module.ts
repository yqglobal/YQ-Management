import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SlaPolicyService } from './sla-policy.service';
import { SlaPolicyController } from './sla-policy.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SlaPolicyController],
  providers: [SlaPolicyService],
  exports: [SlaPolicyService]
})
export class SlaPolicyModule {}
