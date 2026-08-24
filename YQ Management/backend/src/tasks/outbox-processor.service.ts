import {
  Injectable,
  OnModuleInit,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { QueueGateway } from '../queue/queue.gateway';
import { WebhooksService } from '../webhooks/webhooks.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as QRCode from 'qrcode';

@Injectable()
export class OutboxProcessorService implements OnModuleInit {
  private readonly logger = new Logger(OutboxProcessorService.name);
  private isProcessing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly webhooksService: WebhooksService,
    @Inject(forwardRef(() => QueueGateway))
    private readonly queueGateway: QueueGateway,
    @Inject(forwardRef(() => WhatsappService))
    private readonly whatsappService: WhatsappService,
  ) {}

  onModuleInit() {
    this.processOutbox();
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async recoverStuckEvents() {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const recovered = await this.prisma.outboxEvent.updateMany({
        where: {
          status: 'PROCESSING',
          createdAt: { lt: fiveMinutesAgo },
        },
        data: {
          status: 'PENDING',
        },
      });

      if (recovered.count > 0) {
        this.logger.warn(
          `Recovered ${recovered.count} stuck outbox events from PROCESSING back to PENDING`,
        );
      }
    } catch (err) {
      this.logger.error('Failed to recover stuck outbox events', err);
    }
  }

  private async processOutbox() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const events = await this.prisma.outboxEvent.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        take: 50,
      });

      if (events.length > 0) {
        for (const event of events) {
          // Atomically claim the event to prevent race conditions across multiple nodes
          const claimed = await this.prisma.outboxEvent.updateMany({
            where: { id: event.id, status: 'PENDING' },
            data: { status: 'PROCESSING' },
          });

          if (claimed.count === 0) {
            continue; // Another instance already claimed it
          }

          try {
            await this.handleEvent(event.type, event.payload as any);
            await this.prisma.outboxEvent.update({
              where: { id: event.id },
              data: { status: 'COMPLETED', processedAt: new Date() },
            });
          } catch (err: any) {
            this.logger.error(
              `Failed to process outbox event ${event.id}`,
              err.stack,
            );
            await this.prisma.outboxEvent.update({
              where: { id: event.id },
              data: { status: 'FAILED', error: err.message || 'Unknown error' },
            });
          }
        }
      }
    } catch (err) {
      this.logger.error('Error polling outbox', err);
    } finally {
      this.isProcessing = false;
      setTimeout(() => this.processOutbox(), 1000); // Poll every second safely
    }
  }

  private async handleEvent(type: string, payload: any) {
    switch (type) {
      case 'VISIT_CREATED':
      case 'VISIT_UPDATED':
      case 'VISIT_CALLED':
      case 'VISIT_COMPLETED':
      case 'VISIT_MISSED':
      case 'VISIT_CANCELLED':
      case 'VISIT_CHECKED_IN':
        // 1. Broadcast via WebSocket Gateway
        if (payload.queueId) {
          this.queueGateway.broadcastQueueUpdate(
            payload.queueId,
            type.toLowerCase(),
            payload,
          );
        }
        // Also broadcast to visit-specific room so customer wait screen updates
        if (payload.visitId) {
          this.queueGateway.broadcastQueueUpdate(
            `visit_${payload.visitId}`,
            type.toLowerCase(),
            payload,
          );
        }

        // 2. Fire webhooks
        if (payload.tenantId) {
          await this.webhooksService.triggerWebhooks(
            payload.tenantId,
            type,
            payload,
          );
        }

        // 3. FIX (6A): Send WhatsApp notifications for key lifecycle events
        if (type === 'VISIT_CREATED') {
          await this.sendVisitCreatedNotification(payload).catch((e) =>
            this.logger.warn(
              `WhatsApp VISIT_CREATED notification failed: ${e.message}`,
            ),
          );
        } else if (type === 'VISIT_CALLED') {
          await this.sendVisitCalledNotification(payload).catch((e) =>
            this.logger.warn(
              `WhatsApp VISIT_CALLED notification failed: ${e.message}`,
            ),
          );
        } else if (type === 'VISIT_CANCELLED') {
          await this.sendVisitCancelledNotification(payload).catch((e) =>
            this.logger.warn(
              `WhatsApp VISIT_CANCELLED notification failed: ${e.message}`,
            ),
          );
        } else if (type === 'VISIT_MISSED') {
          await this.sendVisitMissedNotification(payload).catch((e) =>
            this.logger.warn(
              `WhatsApp VISIT_MISSED notification failed: ${e.message}`,
            ),
          );
        }
        break;

      case 'QUEUE_STATE_CHANGED':
        if (payload.queueId) {
          this.queueGateway.broadcastQueueUpdate(
            payload.queueId,
            'queue_status_changed',
            payload,
          );
        }
        break;

      default:
        this.logger.warn(`Unknown outbox event type: ${type}`);
    }
  }

  /**
   * FIX (6A): Sends a WhatsApp confirmation when a customer joins the queue.
   * Fetches full visit+customer+tenant details to build a personalised message.
   * Fires asynchronously AFTER the DB transaction has committed.
   */
  private async sendVisitCreatedNotification(payload: {
    visitId: string;
    tenantId: string;
    displayId?: string;
  }) {
    if (!payload.visitId || !payload.tenantId) return;

    const visit = await this.prisma.visit.findUnique({
      where: { id: payload.visitId },
      include: {
        customer: { select: { name: true, phone: true } },
        service: { select: { name: true } },
        location: { select: { name: true } },
        tenant: {
          select: { whatsappConnected: true, whatsappInstanceId: true },
        },
      },
    });

    if (!visit) return;
    if (!visit.tenant?.whatsappConnected || !visit.tenant?.whatsappInstanceId)
      return;
    if (!visit.customer?.phone) return;

    const locationText = visit.location?.name
      ? ` at ${visit.location.name}`
      : '';
    const serviceName = visit.service?.name || 'the service';
    const displayId = visit.displayId || payload.displayId || 'Unknown';

    // Include the customer status link in the message
    const statusUrl = process.env.APP_URL
      ? `${process.env.APP_URL}/customer/status/${visit.accessToken}`
      : null;
    const linkText = statusUrl ? `\n\nTrack your status: ${statusUrl}` : '';

    const message =
      `Hello ${visit.customer.name} 👋 Your ticket *${displayId}* has been issued${locationText} for *${serviceName}*.` +
      `\n\nWe\'ll notify you when it\'s almost your turn. You can also type *STATUS* to check your position.${linkText}`;

    if (statusUrl) {
      try {
        const qrBase64 = await QRCode.toDataURL(statusUrl);
        await this.whatsappService.sendMediaMessage(
          visit.tenant.whatsappInstanceId,
          visit.customer.phone,
          qrBase64,
          'image',
          message,
        );
        return;
      } catch (err) {
        this.logger.warn(
          'Failed to generate/send QR code, falling back to text message',
        );
      }
    }

    await this.whatsappService.sendMessage(
      visit.tenant.whatsappInstanceId,
      visit.customer.phone,
      message,
    );
  }

  /**
   * FIX (6A): Sends a "it's your turn" WhatsApp message when a visit is called to be served.
   */
  private async sendVisitCalledNotification(payload: {
    visitId: string;
    tenantId: string;
    displayId?: string;
  }) {
    if (!payload.visitId || !payload.tenantId) return;

    const visit = await this.prisma.visit.findUnique({
      where: { id: payload.visitId },
      include: {
        customer: { select: { name: true, phone: true } },
        service: { select: { name: true } },
        location: { select: { name: true } },
        tenant: {
          select: { whatsappConnected: true, whatsappInstanceId: true },
        },
      },
    });

    if (!visit) return;
    if (!visit.tenant?.whatsappConnected || !visit.tenant?.whatsappInstanceId)
      return;
    if (!visit.customer?.phone) return;

    const serviceName = visit.service?.name || 'the service';
    const displayId = visit.displayId || payload.displayId || 'Unknown';

    const message = `🔔 *It\'s Your Turn!* \n\nHello ${visit.customer.name}, ticket *${displayId}* for *${serviceName}* is now being called.\n\nPlease proceed to the counter immediately.`;

    await this.whatsappService.sendMessage(
      visit.tenant.whatsappInstanceId,
      visit.customer.phone,
      message,
    );
  }

  private async sendVisitCancelledNotification(payload: {
    visitId: string;
    tenantId: string;
    displayId?: string;
  }) {
    if (!payload.visitId || !payload.tenantId) return;

    const visit = await this.prisma.visit.findUnique({
      where: { id: payload.visitId },
      include: {
        customer: { select: { name: true, phone: true } },
        service: { select: { name: true } },
        tenant: {
          select: { whatsappConnected: true, whatsappInstanceId: true },
        },
      },
    });

    if (
      !visit ||
      !visit.tenant?.whatsappConnected ||
      !visit.tenant?.whatsappInstanceId ||
      !visit.customer?.phone
    )
      return;

    const message = `❌ *Booking Cancelled*\n\nHello ${visit.customer.name}, your booking for *${visit.service?.name || 'the service'}* (Ticket: ${visit.displayId || payload.displayId || 'Unknown'}) has been cancelled.`;

    await this.whatsappService.sendMessage(
      visit.tenant.whatsappInstanceId,
      visit.customer.phone,
      message,
    );
  }

  private async sendVisitMissedNotification(payload: {
    visitId: string;
    tenantId: string;
    displayId?: string;
  }) {
    if (!payload.visitId || !payload.tenantId) return;

    const visit = await this.prisma.visit.findUnique({
      where: { id: payload.visitId },
      include: {
        customer: { select: { name: true, phone: true } },
        service: { select: { name: true } },
        tenant: {
          select: { whatsappConnected: true, whatsappInstanceId: true },
        },
      },
    });

    if (
      !visit ||
      !visit.tenant?.whatsappConnected ||
      !visit.tenant?.whatsappInstanceId ||
      !visit.customer?.phone
    )
      return;

    const message = `⚠️ *Missed Turn*\n\nHello ${visit.customer.name}, we called your ticket *${visit.displayId || payload.displayId || 'Unknown'}* for *${visit.service?.name || 'the service'}* but you were not present. Please speak to the receptionist.`;

    await this.whatsappService.sendMessage(
      visit.tenant.whatsappInstanceId,
      visit.customer.phone,
      message,
    );
  }
}
