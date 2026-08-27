import {
  Injectable,
  NotFoundException,
  BadRequestException,
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
  ) {
    if (!serviceIds || serviceIds.length === 0) {
      throw new BadRequestException(
        'A queue must be linked to at least one service.',
      );
    }

    // SECURITY: Enforce plan limits
    const currentQueuesCount = await this.prisma.queue.count({
      where: { tenantId },
    });

    await this.subscriptionService.checkLimit(
      tenantId,
      'queues',
      currentQueuesCount,
    );

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
    await this.redisService.client.del(`queue:${queueId}:state`);
    await this.prisma.queue.delete({
      where: { id: queueId },
    });
    return { success: true };
  }

  async getQueuesForTenant(userTokenPayload: any) {
    const where: any = { tenantId: userTokenPayload.tenantId };

    if (
      userTokenPayload.role === 'OPERATOR' ||
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
              take: 1,
              orderBy: { createdAt: 'desc' },
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

    if (queue && queue.tenant) {
      const tenant = queue.tenant as any;
      const planFeatures = tenant.subscriptions?.[0]?.plan?.features as any;
      const hasCustomBranding = planFeatures?.customBranding === true;
      if (!hasCustomBranding) {
        tenant.branding = null;
      }
      tenant.planFeatures = { customBranding: hasCustomBranding };
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
    return this.prisma.visit.findMany({
      where: {
        queueId,
        currentState: { in: ['WAITING', 'CHECKED_IN', 'IN_SERVICE'] },
      },
      include: {
        customer: { select: { name: true } },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async getQueueTokensForTenant(queueId: string, tenantId: string) {
    await this.getQueueByIdForTenant(queueId, tenantId);
    return this.getQueueTokens(queueId);
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
      return tx.queue.update({
        where: { id: queueId },
        data: { status },
      });
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
      status,
    });
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
    return this.visitService.advanceTurn(queueId);
  }

  async completeToken(visitId: string, tenantId?: string, operatorId?: string) {
    return this.visitService.completeService(visitId, tenantId, operatorId);
  }

  async skipToken(visitId: string) {
    return this.visitService.skipVisit(visitId);
  }
}
