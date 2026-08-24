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
      where: { visitId, tenantId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getInbox(tenantId: string) {
    return this.prisma.customerConversation.findMany({
      where: { tenantId },
      orderBy: { lastMessageAt: 'desc' },
      take: 50,
    });
  }

  async getInboxMessages(tenantId: string, phone: string) {
    // Reset unread count
    await this.prisma.customerConversation.updateMany({
      where: { tenantId, customerPhone: phone },
      data: { unreadCount: 0 },
    });

    return this.prisma.message.findMany({
      where: { tenantId, customerPhone: phone },
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
        tenantId,
        customerPhone: token.customer?.phone || '',
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

  async sendInboxMessage(tenantId: string, phone: string, text: string) {
    // Upsert conversation to keep it active
    const conversation = await this.prisma.customerConversation.upsert({
      where: { tenantId_customerPhone: { tenantId, customerPhone: phone } },
      update: { lastMessageAt: new Date(), status: 'OPEN' },
      create: {
        tenantId,
        customerPhone: phone,
        status: 'OPEN',
        unreadCount: 0,
      },
    });

    const message = await this.prisma.message.create({
      data: {
        tenantId,
        customerPhone: phone,
        conversationId: conversation.id,
        body: text,
        sender: 'OPERATOR',
      },
    });

    await this.notificationsService.sendWhatsAppMessage(phone, text, tenantId);

    this.redisService.client.publish(
      'queue_events',
      JSON.stringify({ type: 'NEW_INBOX_MESSAGE', tenantId, phone }),
    );

    return message;
  }
}
