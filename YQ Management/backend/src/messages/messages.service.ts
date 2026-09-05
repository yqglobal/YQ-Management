import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RedisService } from '../redis/redis.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private redisService: RedisService,
    private whatsappService: WhatsappService,
  ) {}

  async getMessages(visitId: string, tenantId: string) {
    const token = await this.prisma.visit.findFirst({
      where: { id: visitId, tenantId },
    });
    if (!token) throw new NotFoundException('Visit not found');

    return this.prisma.message.findMany({
      where: { visitId, tenantId, isDeleted: false },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getInbox(tenantId: string, locationId?: string) {
    if (locationId) {
      // Filter to conversations where the customer had at least one visit at this location
      const visits = await this.prisma.visit.findMany({
        where: {
          tenantId,
          queue: { locationId },
        },
        include: { customer: true },
        distinct: ['customerId'],
      });
      const phones = visits
        .map((v) => v.customer.phone)
        .filter((p): p is string => !!p);

      return this.prisma.customerConversation.findMany({
        where: { tenantId, customerPhone: { in: phones } },
        orderBy: { lastMessageAt: 'desc' },
        take: 50,
      });
    }

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
      where: { tenantId, customerPhone: phone, isDeleted: false },
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

    const conversation = await this.prisma.customerConversation.upsert({
      where: { tenantId_customerPhone: { tenantId, customerPhone: token.customer?.phone || '' } },
      update: { lastMessageAt: new Date(), status: 'OPEN' },
      create: {
        tenantId,
        customerPhone: token.customer?.phone || '',
        status: 'OPEN',
        unreadCount: 0,
      },
    });

    const message = await this.prisma.message.create({
      data: {
        tenantId,
        customerPhone: token.customer?.phone || '',
        conversationId: conversation.id,
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
        message.id
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

    await this.notificationsService.sendWhatsAppMessage(phone, text, tenantId, message.id);

    this.redisService.client.publish(
      'queue_events',
      JSON.stringify({ type: 'NEW_INBOX_MESSAGE', tenantId, phone }),
    );

    return message;
  }

  async deleteMessage(tenantId: string, messageId: string) {
    return this.whatsappService.deleteMessage(tenantId, messageId);
  }
}
