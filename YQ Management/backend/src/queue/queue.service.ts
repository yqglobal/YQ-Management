import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { QueueStatus, VisitState } from '@prisma/client';
import { QueueGateway } from './queue.gateway';
import { WebhooksService } from '../webhooks/webhooks.service';
import { VisitService } from '../visit/visit.service';
import { SubscriptionService } from '../subscription/subscription.service';

@Injectable()
export class QueueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    @Inject(forwardRef(() => QueueGateway))
    private readonly queueGateway: QueueGateway,
    private readonly webhooksService: WebhooksService,
    private readonly visitService: VisitService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async createQueue(
    tenantId: string,
    name: string,
    formConfig?: any,
    tokenDisplayConfig?: any,
    locationId?: string,
    serviceIds?: string[],
    skipLimitCheck: boolean = false,
  ) {
    if (!serviceIds || serviceIds.length === 0) {
      throw new BadRequestException(
        'A queue must be linked to at least one service.',
      );
    }

    if (!skipLimitCheck) {
      // SECURITY: Enforce plan limits
      const currentQueuesCount = await this.prisma.queue.count({
        where: { tenantId },
      });

      await this.subscriptionService.checkLimit(
        tenantId,
        'queues',
        currentQueuesCount,
      );
    }

    const queue = await this.prisma.queue.create({
      data: {
        tenantId,
        name,
        status: QueueStatus.ACTIVE,
        formConfig,
        tokenDisplayConfig,
        locationId,
        services:
          serviceIds && serviceIds.length > 0
            ? { connect: serviceIds.map((id) => ({ id })) }
            : undefined,
      },
    });

    await this.redisService.client.hset(`queue:${queue.id}:state`, {
      status: QueueStatus.ACTIVE,
      name: queue.name,
    });
    return queue;
  }

  async updateQueue(
    queueId: string,
    data: {
      name?: string;
      formConfig?: any;
      tokenDisplayConfig?: any;
      nextQueueId?: string | null;
      locationId?: string | null;
      serviceIds?: string[];
    },
  ) {
    const { serviceIds, ...rest } = data;
    return this.prisma.queue.update({
      where: { id: queueId },
      data: {
        ...rest,
        services: serviceIds
          ? { set: serviceIds.map((id) => ({ id })) }
          : undefined,
      },
    });
  }

  async updateQueueForTenant(
    queueId: string,
    tenantId: string,
    data: {
      name?: string;
      formConfig?: any;
      tokenDisplayConfig?: any;
      nextQueueId?: string | null;
      locationId?: string | null;
      serviceIds?: string[];
    },
  ) {
    const queue = await this.prisma.queue.findFirst({
      where: { id: queueId, tenantId },
    });

    if (!queue) {
      throw new NotFoundException('Queue not found');
    }

    const { serviceIds, ...rest } = data;
    return this.prisma.queue.update({
      where: { id: queueId },
      data: {
        ...rest,
        services: serviceIds
          ? { set: serviceIds.map((id) => ({ id })) }
          : undefined,
      },
    });
  }

  async deleteQueueForTenant(queueId: string, tenantId: string) {
    await this.getQueueByIdForTenant(queueId, tenantId);
    await this.redisService.client
      .del(`queue:${queueId}:state`)
      .catch(() => {});
    await this.prisma.blockOff.deleteMany({ where: { queueId } });
    await this.prisma.visit.updateMany({
      where: { queueId },
      data: { queueId: null },
    });
    await this.prisma.queue.delete({
      where: { id: queueId },
    });
    return { success: true };
  }

  async purgeUnlinkedQueues(tenantId: string) {
    const unlinkedQueues = await this.prisma.queue.findMany({
      where: {
        tenantId,
        services: { none: {} },
      },
      select: { id: true, name: true },
    });

    const queueIds = unlinkedQueues.map((q) => q.id);
    if (queueIds.length > 0) {
      await this.prisma.blockOff.deleteMany({
        where: { queueId: { in: queueIds } },
      });
      await this.prisma.visit.updateMany({
        where: { queueId: { in: queueIds } },
        data: { queueId: null },
      });
      await this.prisma.queue.deleteMany({
        where: { id: { in: queueIds } },
      });
      for (const q of unlinkedQueues) {
        await this.redisService.client
          .del(`queue:${q.id}:state`)
          .catch(() => {});
      }
    }

    return { success: true, purgedCount: queueIds.length };
  }

  async getQueuesForTenant(userTokenPayload: any, locationId?: string) {
    const where: any = { tenantId: userTokenPayload.tenantId };

    if (locationId) {
      where.locationId = locationId;
    }

    if (
      userTokenPayload.role === 'MANAGER' ||
      userTokenPayload.role === 'MANAGER'
    ) {
      const user = await this.prisma.user.findUnique({
        where: { id: userTokenPayload.userId },
      });
      if (
        user &&
        user.allowedLocationIds &&
        user.allowedLocationIds.length > 0
      ) {
        where.locationId = { in: user.allowedLocationIds };
      }

      if (user && user.allowedServiceIds && user.allowedServiceIds.length > 0) {
        // Only return queues that are linked to at least one of the allowed services
        where.services = {
          some: {
            id: { in: user.allowedServiceIds },
          },
        };
      }
    }

    return this.prisma.queue.findMany({
      where,
      include: {
        location: true,
        services: true,
        visits: {
          where: {
            currentState: { in: ['WAITING', 'CHECKED_IN'] },
          },
          orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        },
        _count: {
          select: {
            visits: {
              where: {
                currentState: { in: ['WAITING', 'CHECKED_IN'] },
              },
            },
          },
        },
      },
    });
  }

  async getPublicQueuesForTenant(tenantId: string) {
    return this.prisma.queue.findMany({
      where: { tenantId, status: QueueStatus.ACTIVE },
      include: {
        services: {
          select: {
            id: true,
            name: true,
            description: true,
            expectedDuration: true,
          },
        },
      },
    });
  }

  async getQueueById(id: string) {
    const queue = await this.prisma.queue.findUnique({
      where: { id },
      include: {
        tenant: {
          include: {
            subscriptions: {
              include: { plan: true },
            },
          },
        },
        services: {
          select: {
            id: true,
            name: true,
            description: true,
            expectedDuration: true,
          },
        },
      },
    });

    if (queue && (queue as any).tenant) {
      const tenant = (queue as any).tenant;
      const planFeatures = tenant.subscriptions?.plan?.features;
      const hasCustomBranding = planFeatures?.customBranding === true;
      if (!hasCustomBranding) {
        tenant.branding = null;
      }

      const sub = tenant.subscriptions;
      const isSubscriptionActive =
        sub && (sub.status === 'ACTIVE' || sub.status === 'TRIAL');

      tenant.planFeatures = { customBranding: hasCustomBranding };
      tenant.isPaused = !isSubscriptionActive;
      delete tenant.subscriptions; // Don't expose billing details publicly
    }

    return queue;
  }

  async getQueueByIdForTenant(id: string, tenantId: string) {
    const queue = await this.prisma.queue.findFirst({
      where: { id, tenantId },
      include: { location: true, services: true },
    });

    if (!queue) {
      throw new NotFoundException('Queue not found');
    }

    return queue;
  }

  async getQueueTokens(queueId: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const visits = await this.prisma.visit.findMany({
      where: {
        queueId,
        OR: [
          {
            currentState: { in: ['WAITING', 'CHECKED_IN'] },
          },
          {
            currentState: { in: ['SCHEDULED', 'CREATED'] },
            scheduledTime: { gte: todayStart, lte: todayEnd },
          },
        ],
      },
      include: {
        customer: { select: { name: true } },
        service: {
          select: {
            name: true,
            expectedDuration: true,
            emaExpectedDuration: true,
          },
        },
        queue: { select: { name: true } },
      },
      take: 30,
    });

    return visits.sort((a, b) => {
      const timeA = a.scheduledTime
        ? new Date(a.scheduledTime).getTime()
        : new Date(a.waitingStart || a.createdAt).getTime();
      const timeB = b.scheduledTime
        ? new Date(b.scheduledTime).getTime()
        : new Date(b.waitingStart || b.createdAt).getTime();

      if ((b.priority || 0) !== (a.priority || 0)) {
        return (b.priority || 0) - (a.priority || 0);
      }
      return timeA - timeB;
    });
  }

  async getQueueTokensForTenant(queueId: string, tenantId: string) {
    await this.getQueueByIdForTenant(queueId, tenantId);
    return this.getQueueTokens(queueId);
  }

  async getRecentlyCalledTokens(queueId: string) {
    return this.prisma.visit.findMany({
      where: {
        queueId,
        currentState: { in: ['IN_SERVICE', 'COMPLETED', 'NO_SHOW'] },
        serviceStart: { not: null },
      },
      include: {
        customer: { select: { name: true } },
        queue: { select: { name: true } },
        service: { select: { name: true } },
      },
      orderBy: { serviceStart: 'desc' },
      take: 10,
    });
  }

  async getHistory(tenantId: string) {
    return this.prisma.visit.findMany({
      where: {
        queue: { tenantId },
        currentState: { in: ['COMPLETED', 'MISSED'] },
      },
      include: { queue: true },
      orderBy: { createdAt: 'desc' },
      take: 100, // Limit for MVP
    });
  }

  async updateQueueStatus(queueId: string, status: QueueStatus) {
    const queue = await this.prisma.$transaction(async (tx) => {
      const updatedQueue = await tx.queue.update({
        where: { id: queueId },
        data: { status },
      });

      if (status === 'PAUSED_FOR_EMERGENCY') {
        const waitingVisits = await tx.visit.findMany({
          where: { queueId, currentState: 'WAITING' },
          select: { id: true, tenantId: true },
        });

        for (const visit of waitingVisits) {
          await tx.outboxEvent.create({
            data: {
              type: 'QUEUE_EMERGENCY_PAUSED',
              payload: {
                visitId: visit.id,
                queueId,
                tenantId: visit.tenantId,
              },
            },
          });
        }
      }

      return updatedQueue;
    });

    try {
      await this.redisService.client.hset(
        `queue:${queue.id}:state`,
        'status',
        status,
      );
    } catch (err) {
      console.error('Failed to sync queue status to Redis', err);
    }

    this.queueGateway.broadcastQueueUpdate(queueId, 'queue_status_changed', {
      queueId,
      status,
    });
    this.queueGateway.broadcastTenantUpdate(
      queue.tenantId,
      'queue_status_changed',
      {
        queueId,
        status,
      },
    );
    return queue;
  }

  async updateQueueStatusForTenant(
    queueId: string,
    tenantId: string,
    status: QueueStatus,
  ) {
    await this.getQueueByIdForTenant(queueId, tenantId);
    return this.updateQueueStatus(queueId, status);
  }

  async advanceTurn(queueId: string) {
    const queue = await this.prisma.queue.findUnique({
      where: { id: queueId },
    });
    if (
      queue &&
      (queue.status === 'PAUSED' || queue.status === 'PAUSED_FOR_EMERGENCY')
    ) {
      throw new ConflictException(
        'Queue is currently paused. Please resume the queue to advance turns.',
      );
    }
    return this.visitService.advanceTurn(queueId);
  }

  /**
   * Announce-only: looks up the next WAITING/CHECKED_IN visit in the queue
   * and fires a VISIT_CALLED outbox event WITHOUT changing state.
   * Used by the "Call Next" button in the pipeline panel so the TV
   * announcement plays and WhatsApp is sent, but service does not start yet.
   */
  async announceNext(queueId: string) {
    const queue = await this.prisma.queue.findUnique({
      where: { id: queueId },
      include: {
        tenant: {
          select: {
            id: true,
            whatsappConnected: true,
            whatsappInstanceId: true,
          },
        },
      },
    });
    if (
      queue &&
      (queue.status === 'PAUSED' || queue.status === 'PAUSED_FOR_EMERGENCY')
    ) {
      return {
        announced: false,
        message:
          'Queue is currently paused. Please resume the queue to call the next customer.',
      };
    }

    const nextVisit = await this.prisma.visit.findFirst({
      where: { queueId, currentState: { in: ['WAITING', 'CHECKED_IN'] } },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      include: {
        customer: { select: { name: true, phone: true } },
        service: { select: { name: true } },
        queue: { select: { name: true } },
      },
    });

    if (!nextVisit) {
      return {
        announced: false,
        message: 'No waiting customers in this queue',
      };
    }

    await this.prisma.outboxEvent.create({
      data: {
        type: 'VISIT_CALLED',
        payload: {
          visitId: nextVisit.id,
          queueId,
          tenantId: nextVisit.tenantId,
          displayId: nextVisit.displayId,
          customerName: nextVisit.customer?.name,
          serviceName: nextVisit.service?.name,
          queueName: nextVisit.queue?.name,
          announceOnly: true,
        },
      },
    });

    const isWhatsappConnected = Boolean(
      queue?.tenant?.whatsappConnected && queue?.tenant?.whatsappInstanceId,
    );

    return {
      announced: true,
      visitId: nextVisit.id,
      displayId: nextVisit.displayId,
      customerName: nextVisit.customer?.name,
      whatsappConnected: isWhatsappConnected,
      hasCustomerPhone: Boolean(nextVisit.customer?.phone),
      whatsappSent: isWhatsappConnected && Boolean(nextVisit.customer?.phone),
    };
  }

  async completeToken(visitId: string, tenantId?: string, operatorId?: string) {
    return this.visitService.completeService(visitId, tenantId, operatorId);
  }

  async skipToken(visitId: string) {
    return this.visitService.skipVisit(visitId);
  }
}
