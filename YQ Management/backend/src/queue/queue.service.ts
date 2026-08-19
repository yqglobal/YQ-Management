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

@Injectable()
export class QueueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    @Inject(forwardRef(() => QueueGateway))
    private readonly queueGateway: QueueGateway,
    private readonly webhooksService: WebhooksService,
    private readonly visitService: VisitService,
  ) {}

  async createQueue(
    tenantId: string,
    workspaceId: string | undefined,
    name: string,
    formConfig?: any,
    tokenDisplayConfig?: any,
    locationId?: string,
    serviceIds?: string[]
  ) {
    let resolvedWorkspaceId = workspaceId;
    if (workspaceId) {
      const ws = await this.prisma.workspace.findUnique({
        where: { id: workspaceId },
      });
      if (!ws && tenantId) {
        const tenantWs = await this.prisma.workspace.findFirst({
          where: { tenantId },
        });
        if (tenantWs) resolvedWorkspaceId = tenantWs.id;
        else resolvedWorkspaceId = undefined;
      }
    }

    if (!serviceIds || serviceIds.length === 0) {
      throw new BadRequestException('A queue must be linked to at least one service.');
    }

    // SECURITY: Enforce plan limits
    const subscription = await this.prisma.subscription.findFirst({
      where: { tenantId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' }
    });

    const maxQueues = subscription?.plan?.limits ? (subscription.plan.limits as any).maxQueues : 1;
    const currentQueuesCount = await this.prisma.queue.count({
      where: { tenantId },
    });

    if (currentQueuesCount >= maxQueues) {
      throw new BadRequestException(`Queue limit reached (${maxQueues}). Please upgrade your plan to create more queues.`);
    }

    const queue = await this.prisma.queue.create({
      data: {
        tenantId,
        workspaceId: resolvedWorkspaceId,
        name,
        status: QueueStatus.ACTIVE,
        formConfig,
        tokenDisplayConfig,
        locationId,
        services: serviceIds && serviceIds.length > 0 ? { connect: serviceIds.map(id => ({ id })) } : undefined,
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
      allowAppointments?: boolean;
      requireManualCheckIn?: boolean;
      appointmentGranularityMins?: number;
      locationId?: string | null;
      serviceIds?: string[];
    },
  ) {
    const { serviceIds, ...rest } = data;
    return this.prisma.queue.update({
      where: { id: queueId },
      data: {
        ...rest,
        services: serviceIds ? { set: serviceIds.map(id => ({ id })) } : undefined,
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
      allowAppointments?: boolean;
      requireManualCheckIn?: boolean;
      appointmentGranularityMins?: number;
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
        services: serviceIds ? { set: serviceIds.map(id => ({ id })) } : undefined,
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
    
    if (userTokenPayload.role === 'OPERATOR') {
      const user = await this.prisma.user.findUnique({ where: { id: userTokenPayload.userId } });
      if (user && user.allowedLocationIds && user.allowedLocationIds.length > 0) {
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
            currentState: 'WAITING',
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        _count: {
          select: {
            visits: {
              where: {
                currentState: 'WAITING',
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
          select: { id: true, name: true, description: true, expectedDuration: true },
        },
      },
    });
  }

  async getQueueById(id: string) {
    return this.prisma.queue.findUnique({
      where: { id },
      include: {
        services: {
          select: { id: true, name: true, description: true, expectedDuration: true },
        },
      },
    });
  }

  async getAvailableSlots(queueId: string, date: string) {
    const queue = await this.prisma.queue.findUnique({
      where: { id: queueId },
      include: { location: true },
    });

    if (!queue) throw new NotFoundException('Queue not found');
    if (!queue.allowAppointments)
      throw new BadRequestException(
        'Appointments are not enabled for this queue',
      );

    const granularityMins = queue.appointmentGranularityMins || 15;

    // Parse the date (assuming format YYYY-MM-DD)
    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      throw new BadRequestException('Invalid date format. Use YYYY-MM-DD');
    }

    // Default business hours: 09:00 to 17:00 local time.
    let startHour = 9;
    let startMinute = 0;
    let endHour = 17;
    let endMinute = 0;

    if (queue.location?.businessHours) {
      const bh = queue.location.businessHours as any;
      const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = days[dayOfWeek];

      if (bh[dayName]) {
        const { start, end, closed } = bh[dayName];
        if (closed) return []; // No slots if closed
        if (start) {
          const [h, m] = start.split(':');
          startHour = parseInt(h);
          startMinute = parseInt(m || '0');
        }
        if (end) {
          const [h, m] = end.split(':');
          endHour = parseInt(h);
          endMinute = parseInt(m || '0');
        }
      }
    }

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(startHour, startMinute, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(endHour, endMinute, 0, 0);

    const slots: string[] = [];
    let currentTime = startOfDay;

    while (currentTime < endOfDay) {
      slots.push(currentTime.toISOString());
      currentTime = new Date(currentTime.getTime() + granularityMins * 60000);
    }

    // Fetch existing appointments for that day that are not cancelled or missed
    const existingTokens = await this.prisma.visit.findMany({
      where: {
        queueId,
        currentState: { in: ['WAITING', 'SCHEDULED', 'CREATED'] },
        scheduledTime: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
      select: { scheduledTime: true },
    });

    const bookedSlots = existingTokens
      .filter((t) => t.scheduledTime)
      .map((t) => t.scheduledTime!.toISOString());

    const availableSlots = slots.filter((slot) => !bookedSlots.includes(slot));
    return availableSlots;
  }

  async getQueueByIdForTenant(id: string, tenantId: string) {
    const queue = await this.prisma.queue.findFirst({
      where: { id, tenantId },
      include: { location: true, services: true }
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
        currentState: { in: ['WAITING', 'IN_SERVICE'] },
      },
      orderBy: { createdAt: 'asc' },
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
    const queue = await this.prisma.queue.update({
      where: { id: queueId },
      data: { status },
    });
    await this.redisService.client.hset(
      `queue:${queue.id}:state`,
      'status',
      status,
    );

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
