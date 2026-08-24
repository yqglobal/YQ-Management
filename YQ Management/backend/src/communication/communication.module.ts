import { Module, Global, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { CommunicationService } from './communication.service';
import { TemplateService } from './templates/template.service';
import { CommunicationLogService } from './logging/communication-log.service';
import { BrevoProvider } from './providers/brevo.provider';
import { CommunicationProcessor } from './communication.processor';
import { CommunicationController } from './communication.controller';
import { WhatsAppTemplateService } from './templates/whatsapp-template.service';

@Global()
@Module({
  imports: [
    PrismaModule,
    forwardRef(() => WhatsappModule),
    BullModule.registerQueue({
      name: 'communication',
    }),
  ],
  providers: [
    CommunicationService,
    TemplateService,
    CommunicationLogService,
    WhatsAppTemplateService,
    BrevoProvider,
    CommunicationProcessor,
    {
      provide: 'EmailProvider',
      useClass: BrevoProvider,
    },
  ],
  controllers: [CommunicationController],
  exports: [
    CommunicationService,
    TemplateService,
    CommunicationLogService,
    WhatsAppTemplateService,
    'EmailProvider',
  ],
})
export class CommunicationModule {}
