import { Injectable, OnModuleInit, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { QueueGateway } from '../queue/queue.gateway';
import { WebhooksService } from '../webhooks/webhooks.service';

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
  ) {}

  onModuleInit() {
    this.processOutbox();
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
            this.logger.error(`Failed to process outbox event ${event.id}`, err.stack);
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
        // Broadcast via Redis / Gateway
        if (payload.queueId) {
          this.queueGateway.broadcastQueueUpdate(payload.queueId, type.toLowerCase(), payload);
        }
        
        // Fire webhooks
        if (payload.tenantId) {
          await this.webhooksService.triggerWebhooks(payload.tenantId, type, payload);
        }
        break;

      case 'QUEUE_STATE_CHANGED':
        if (payload.queueId) {
          this.queueGateway.broadcastQueueUpdate(payload.queueId, 'queue_status_changed', payload);
        }
        break;

      default:
        this.logger.warn(`Unknown outbox event type: ${type}`);
    }
  }
}
