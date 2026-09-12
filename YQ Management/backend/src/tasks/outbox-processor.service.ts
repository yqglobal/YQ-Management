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
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  VisitNotificationService,
  VisitNotificationType,
} from '../communication/visit-notification.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

const VISIT_NOTIFICATION_TYPES: VisitNotificationType[] = [
  'VISIT_CREATED',
  'VISIT_CALLED',
  'VISIT_CANCELLED',
  'VISIT_MISSED',
  'VISIT_COMPLETED',
];

/**
 * OutboxProcessorService — transactional outbox poller.
 *
 * Responsibilities (and ONLY these):
 *  1. Poll the `OutboxEvent` table for PENDING events.
 *  2. Atomically claim events (PENDING → PROCESSING) to prevent double-processing
 *     across multiple backend instances.
 *  3. Dispatch each event to the appropriate handler:
 *     - WebSocket broadcast (via QueueGateway)
 *     - Webhook firing (via BullMQ queue_webhooks)
 *     - WhatsApp lifecycle notifications (via BullMQ queue_whatsapp)
 *  4. Mark events as COMPLETED or FAILED.
 *  5. Recover stuck PROCESSING events via a cron job.
 *
 * All WhatsApp notification logic lives in VisitNotificationService.
 * This class has zero knowledge of message content or WhatsApp APIs.
 */
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
    private readonly visitNotificationService: VisitNotificationService,
    @InjectQueue('queue_webhooks') private readonly webhooksQueue: Queue,
    @InjectQueue('queue_whatsapp') private readonly whatsappQueue: Queue,
  ) {}

  onModuleInit() {
    this.processOutbox();

    // Zero-Latency Event Streaming: wake up the processor immediately when a
    // new event is published to Redis instead of waiting for the next poll cycle.
    this.redisService.subscriber.subscribe('outbox_events', (err) => {
      if (err) this.logger.error('Failed to subscribe to outbox_events', err);
    });

    this.redisService.subscriber.on('message', (channel, message) => {
      if (channel === 'outbox_events' && message === 'WAKE_UP') {
        if (!this.isProcessing) this.processOutbox();
      }
    });
  }

  /** Recovers events stuck in PROCESSING state for more than 5 minutes. */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async recoverStuckEvents() {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const recovered = await this.prisma.outboxEvent.updateMany({
        where: { status: 'PROCESSING', createdAt: { lt: fiveMinutesAgo } },
        data: { status: 'PENDING' },
      });
      if (recovered.count > 0) {
        this.logger.warn(`Recovered ${recovered.count} stuck outbox events → PENDING`);
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

      for (const event of events) {
        // Atomic claim — prevents duplicate processing across multiple nodes
        const claimed = await this.prisma.outboxEvent.updateMany({
          where: { id: event.id, status: 'PENDING' },
          data: { status: 'PROCESSING' },
        });
        if (claimed.count === 0) continue; // Another instance claimed it first

        try {
          await this.handleEvent(event.type, event.payload as Record<string, unknown>);
          await this.prisma.outboxEvent.update({
            where: { id: event.id },
            data: { status: 'COMPLETED', processedAt: new Date() },
          });
        } catch (err: any) {
          this.logger.error(`Failed to process outbox event ${event.id}`, err.stack);
          await this.prisma.outboxEvent.update({
            where: { id: event.id },
            data: { status: 'FAILED', error: err.message || 'Unknown error' },
          });
        }
      }
    } catch (err) {
      this.logger.error('Error polling outbox', err);
    } finally {
      this.isProcessing = false;
      setTimeout(() => this.processOutbox(), 1000); // Safe 1s poll cycle
    }
  }

  private async handleEvent(type: string, payload: Record<string, unknown>) {
    const isVisitEvent = [
      'VISIT_CREATED', 'VISIT_UPDATED', 'VISIT_CALLED', 'VISIT_COMPLETED',
      'VISIT_MISSED', 'VISIT_CANCELLED', 'VISIT_CHECKED_IN',
    ].includes(type);

    if (isVisitEvent) {
      // 1. Broadcast via WebSocket so the operator UI updates in real-time
      if (payload.queueId) {
        this.queueGateway.broadcastQueueUpdate(
          payload.queueId as string,
          type.toLowerCase(),
          payload,
        );
      }
      // Also broadcast to the visit-specific room for the customer wait screen
      if (payload.visitId) {
        this.queueGateway.broadcastQueueUpdate(
          `visit_${payload.visitId as string}`,
          type.toLowerCase(),
          payload,
        );
      }

      // 2. Fire tenant webhooks (Enqueue to BullMQ)
      if (payload.tenantId) {
        await this.webhooksQueue.add('process', {
          tenantId: payload.tenantId as string,
          type,
          payload,
        }, {
          attempts: 5,
          backoff: { type: 'exponential', delay: 2000 }, // 2s, 4s, 8s, 16s...
          removeOnComplete: true,
        });
      }

      // 3. Send WhatsApp lifecycle notification (Enqueue to BullMQ)
      if (VISIT_NOTIFICATION_TYPES.includes(type as VisitNotificationType)) {
        await this.whatsappQueue.add('process', {
          type,
          payload,
        }, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: true,
        });
      }
      return;
    }

    if (type === 'QUEUE_STATE_CHANGED') {
      if (payload.queueId) {
        this.queueGateway.broadcastQueueUpdate(
          payload.queueId as string,
          'queue_status_changed',
          payload,
        );
      }
      return;
    }

    this.logger.warn(`Unknown outbox event type: ${type}`);
  }
}
