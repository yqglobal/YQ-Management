import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private redisService: RedisService,
  ) {}

  async getMessages(tokenId: string, tenantId: string) {
    const token = await this.prisma.token.findFirst({
      where: { id: tokenId, queue: { tenantId } },
    });
    if (!token) throw new NotFoundException('Token not found');

    return this.prisma.message.findMany({
      where: { tokenId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async sendMessageFromOperator(
    tokenId: string,
    text: string,
    tenantId: string,
  ) {
    const token = await this.prisma.token.findFirst({
      where: { id: tokenId, queue: { tenantId } },
      include: { queue: true },
    });
    if (!token) throw new NotFoundException('Token not found');

    const message = await this.prisma.message.create({
      data: {
        tokenId,
        body: text,
        sender: 'OPERATOR',
      },
    });

    // Notify customer via WhatsApp
    if (token.phone) {
      await this.notificationsService.sendWhatsAppMessage(token.phone, text, token.queue?.tenantId);
    }

    // Broadcast message to Dashboard & Live Status
    this.redisService.client.publish(
      'queue_events',
      JSON.stringify({ type: 'NEW_MESSAGE', queueId: token.queueId, message }),
    );

    return message;
  }
}
