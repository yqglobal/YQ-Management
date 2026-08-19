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

  async getMessages(visitId: string, tenantId: string) {
    const token = await this.prisma.visit.findFirst({
      where: { id: visitId, tenantId },
    });
    if (!token) throw new NotFoundException('Visit not found');

    return this.prisma.message.findMany({
      where: { visitId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async sendMessageFromOperator(
    visitId: string,
    text: string,
    tenantId: string,
  ) {
    const token = await this.prisma.visit.findFirst({
      where: { id: visitId, tenantId },
      include: { queue: true, customer: true },
    });
    if (!token) throw new NotFoundException('Visit not found');

    const message = await this.prisma.message.create({
      data: {
        visitId,
        body: text,
        sender: 'OPERATOR',
      },
    });

    // Notify customer via WhatsApp
    if (token.customer?.phone) {
      await this.notificationsService.sendWhatsAppMessage(
        token.customer.phone,
        text,
        token.tenantId,
      );
    }

    // Broadcast message to Dashboard & Live Status
    this.redisService.client.publish(
      'queue_events',
      JSON.stringify({ type: 'NEW_MESSAGE', queueId: token.queueId, message }),
    );

    return message;
  }
}
