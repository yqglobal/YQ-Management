import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RedisService } from '../redis/redis.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { QueueGateway } from '../queue/queue.gateway';
import { forwardRef, Inject } from '@nestjs/common';

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private redisService: RedisService,
    private whatsappService: WhatsappService,
    @Inject(forwardRef(() => QueueGateway))
    private queueGateway: QueueGateway,
  ) {}

  async getMessages(visitId: string, tenantId: string) {
    const token = await this.prisma.visit.findFirst({
      where: { id: visitId, tenantId },
      include: { customer: true },
    });
    if (!token) throw new NotFoundException('Visit not found');

    const customerPhone = token.customer?.phone;
    const cleanDigits = customerPhone ? customerPhone.replace(/\D/g, '') : null;
    const lastDigits = cleanDigits && cleanDigits.length >= 7 ? cleanDigits.slice(-9) : cleanDigits;

    const messageOrConditions: any[] = [{ visitId }];
    if (customerPhone) messageOrConditions.push({ customerPhone });
    if (cleanDigits) {
      messageOrConditions.push({ customerPhone: cleanDigits });
      messageOrConditions.push({ customerPhone: `+${cleanDigits}` });
    }
    if (lastDigits) {
      messageOrConditions.push({ customerPhone: { contains: lastDigits } });
    }

    const messages = await this.prisma.message.findMany({
      where: {
        tenantId,
        isDeleted: false,
        OR: messageOrConditions,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Also include automated messages sent via WhatsApp (ticket confirmation, reminders, status updates, OTP)
    const commConditions: any[] = [];
    if (customerPhone) commConditions.push({ recipient: customerPhone });
    if (cleanDigits) {
      commConditions.push({ recipient: cleanDigits });
      commConditions.push({ recipient: `+${cleanDigits}` });
    }
    if (lastDigits) {
      commConditions.push({ recipient: { contains: lastDigits } });
    }

    let commLogs: any[] = [];
    if (commConditions.length > 0) {
      commLogs = await this.prisma.communicationLog.findMany({
        where: {
          tenantId,
          channel: { in: ['whatsapp', 'WHATSAPP'] },
          OR: commConditions,
        },
        orderBy: { createdAt: 'asc' },
      });
    }

    const existingMessages = new Set(
      messages.map((m) => `${m.body.trim().slice(0, 40)}_${new Date(m.createdAt).getMinutes()}`),
    );

    const automatedMessages = commLogs
      .filter(
        (log) =>
          !existingMessages.has(
            `${(log.body || '').trim().slice(0, 40)}_${new Date(log.sentAt || log.createdAt).getMinutes()}`,
          ),
      )
      .map((log) => ({
        id: `comm-${log.id}`,
        body: log.body || '',
        sender: 'SYSTEM',
        createdAt: log.sentAt || log.createdAt,
        conversationId: null,
        customerPhone: log.recipient,
        isRead: true,
        tenantId: log.tenantId || tenantId,
        visitId: token.id,
        isDeleted: false,
        whatsappId: log.providerId || null,
        isAutomated: true,
        automatedType: log.type,
        status: log.status === 'SENT' || log.status === 'DELIVERED' ? 'delivered' : 'sent',
      }));

    const all = [...messages, ...automatedMessages];
    all.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return all;
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

      return this.prisma.customerConversation
        .findMany({
          where: { tenantId, customerPhone: { in: phones } },
          orderBy: { lastMessageAt: 'desc' },
          take: 50,
        })
        .then((convos) => this.attachCustomerDetails(tenantId, convos));
    }

    const convos = await this.prisma.customerConversation.findMany({
      where: { tenantId },
      orderBy: { lastMessageAt: 'desc' },
      take: 50,
    });
    return this.attachCustomerDetails(tenantId, convos);
  }

  private async attachCustomerDetails(tenantId: string, convos: any[]) {
    if (convos.length === 0) return convos;
    const phones = convos.map((c) => c.customerPhone);
    const orConditions = phones.map((p) => ({
      phone: { contains: p.replace(/\D/g, '').slice(-9) },
    }));

    const customers = await this.prisma.customer.findMany({
      where: { tenantId, OR: orConditions },
    });

    const customerMap = new Map();
    for (const c of customers) {
      if (c.phone) {
        const cleanPhone = c.phone.replace(/\D/g, '').slice(-9);
        customerMap.set(cleanPhone, c);
      }
    }

    return convos.map((c) => {
      const cleanPhone = c.customerPhone.replace(/\D/g, '').slice(-9);
      const cust = customerMap.get(cleanPhone);
      return {
        ...c,
        customerName: cust?.name || null,
        customerAvatar: cust?.avatarUrl || null,
      };
    });
  }

  async getInboxMessages(tenantId: string, phone: string) {
    // Reset unread count
    await this.prisma.customerConversation.updateMany({
      where: { tenantId, customerPhone: phone },
      data: { unreadCount: 0 },
    });

    const cleanDigits = phone ? phone.replace(/\D/g, '') : null;
    const lastDigits = cleanDigits && cleanDigits.length >= 7 ? cleanDigits.slice(-9) : cleanDigits;

    const messageOrConditions: any[] = [{ customerPhone: phone }];
    if (cleanDigits) {
      messageOrConditions.push({ customerPhone: cleanDigits });
      messageOrConditions.push({ customerPhone: `+${cleanDigits}` });
    }
    if (lastDigits) {
      messageOrConditions.push({ customerPhone: { contains: lastDigits } });
    }

    const messages = await this.prisma.message.findMany({
      where: {
        tenantId,
        isDeleted: false,
        OR: messageOrConditions,
      },
      orderBy: { createdAt: 'asc' },
    });

    const commConditions: any[] = [{ recipient: phone }];
    if (cleanDigits) {
      commConditions.push({ recipient: cleanDigits });
      commConditions.push({ recipient: `+${cleanDigits}` });
    }
    if (lastDigits) {
      commConditions.push({ recipient: { contains: lastDigits } });
    }

    const commLogs = await this.prisma.communicationLog.findMany({
      where: {
        tenantId,
        channel: { in: ['whatsapp', 'WHATSAPP'] },
        OR: commConditions,
      },
      orderBy: { createdAt: 'asc' },
    });

    const existingMessages = new Set(
      messages.map((m) => `${m.body.trim().slice(0, 40)}_${new Date(m.createdAt).getMinutes()}`),
    );

    const automatedMessages = commLogs
      .filter(
        (log) =>
          !existingMessages.has(
            `${(log.body || '').trim().slice(0, 40)}_${new Date(log.sentAt || log.createdAt).getMinutes()}`,
          ),
      )
      .map((log) => ({
        id: `comm-${log.id}`,
        body: log.body || '',
        sender: 'SYSTEM',
        createdAt: log.sentAt || log.createdAt,
        conversationId: null,
        customerPhone: log.recipient,
        isRead: true,
        tenantId: log.tenantId || tenantId,
        visitId: null,
        isDeleted: false,
        whatsappId: log.providerId || null,
        isAutomated: true,
        automatedType: log.type,
        status: log.status === 'SENT' || log.status === 'DELIVERED' ? 'delivered' : 'sent',
      }));

    const all = [...messages, ...automatedMessages];
    all.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return all;
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
      where: {
        tenantId_customerPhone: {
          tenantId,
          customerPhone: token.customer?.phone || '',
        },
      },
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
        sender: 'MANAGER',
      },
    });

    // Notify customer via WhatsApp
    if (token.customer?.phone) {
      await this.notificationsService.sendWhatsAppMessage(
        token.customer.phone,
        text,
        token.tenantId,
        message.id,
      );
    }

    // Broadcast message to Dashboard & Live Status
    if (token.queueId) {
      this.queueGateway.broadcastQueueUpdate(token.queueId, 'NEW_MESSAGE', {
        message,
      });
    }

    return message;
  }

  async sendInboxMessage(
    tenantId: string,
    phone: string,
    text: string,
    media?: string,
    mediaType?: string,
  ) {
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

    const bodyText = media
      ? text
        ? `[Media Attachment] ${text}`
        : '[Media Attachment]'
      : text;

    const message = await this.prisma.message.create({
      data: {
        tenantId,
        customerPhone: phone,
        conversationId: conversation.id,
        body: bodyText,
        sender: 'MANAGER',
      },
    });

    if (media && mediaType) {
      await this.whatsappService.sendMediaToTenant(
        tenantId,
        phone,
        media,
        mediaType,
        text,
      );
    } else {
      await this.notificationsService.sendWhatsAppMessage(
        phone,
        text,
        tenantId,
        message.id,
      );
    }

    this.queueGateway.broadcastTenantUpdate(tenantId, 'NEW_INBOX_MESSAGE', {
      phone,
    });

    return message;
  }

  async deleteMessage(tenantId: string, messageId: string) {
    return this.whatsappService.deleteMessage(tenantId, messageId);
  }
}
