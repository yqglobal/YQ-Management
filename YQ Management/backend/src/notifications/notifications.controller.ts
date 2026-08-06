import { Controller, Post, Req, Res, Logger } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import type { Request, Response } from 'express';

@Controller('notifications')
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('whatsapp/webhook')
  async handleIncomingWhatsApp(@Req() req: Request, @Res() res: Response) {
    const payload = req.body;

    // Evolution API typically sends { event: 'messages.upsert', data: { key: { remoteJid }, message: { conversation } } }
    if (payload?.event === 'messages.upsert' && payload?.data?.message) {
      const remoteJid = payload.data.key?.remoteJid || '';
      const text =
        payload.data.message.conversation ||
        payload.data.message.extendedTextMessage?.text;
      const fromMe = payload.data.key?.fromMe;

      if (!fromMe && remoteJid && text) {
        // Extract number from JID (e.g., 1234567890@s.whatsapp.net)
        const fromNumber = remoteJid.split('@')[0];
        // Try to resolve tenant by instanceName in header or query if provided
        const instanceName = req.query.instanceName as string || req.headers['x-evolution-instance'] as string;
        // The NotificationsService currently does not need tenantId for replies,
        // but in future we may route these to the correct tenant if provided.
        await this.notificationsService.processWebhookReply(fromNumber, text);
      }
    }

    // Acknowledge webhook
    res.status(200).send({ success: true });
  }
}
