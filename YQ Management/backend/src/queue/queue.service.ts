import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { QueueStatus, TokenStatus } from '@prisma/client';
import { QueueGateway } from './queue.gateway';
import { WebhooksService } from '../webhooks/webhooks.service';

@Injectable()
export class QueueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    @Inject(forwardRef(() => QueueGateway))
    private readonly queueGateway: QueueGateway,
    private readonly webhooksService: WebhooksService,
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
        tokens: {
          where: {
            status: TokenStatus.WAITING,
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
        _count: {
          select: {
            tokens: {
              where: {
                status: TokenStatus.WAITING,
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
    const existingTokens = await this.prisma.token.findMany({
      where: {
        queueId,
        isAppointment: true,
        scheduledFor: {
          gte: startOfDay,
          lt: endOfDay,
        },
        status: {
          notIn: ['COMPLETED', 'MISSED'],
        },
      },
    });

    const bookedSlots = existingTokens
      .filter((t) => t.scheduledFor)
      .map((t) => t.scheduledFor!.toISOString());

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
    return this.prisma.token.findMany({
      where: {
        queueId,
        status: { in: [TokenStatus.WAITING, TokenStatus.SERVING] },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async getQueueTokensForTenant(queueId: string, tenantId: string) {
    await this.getQueueByIdForTenant(queueId, tenantId);
    return this.getQueueTokens(queueId);
  }

  async getHistory(tenantId: string) {
    return this.prisma.token.findMany({
      where: {
        queue: { tenantId },
        status: { in: [TokenStatus.COMPLETED, TokenStatus.MISSED] },
      },
      include: { queue: true },
      orderBy: { joinedAt: 'desc' },
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

  // --- Advanced Queue Logic ---

  async joinQueue(
    queueId: string,
    customerName: string,
    phone: string | null,
    isAppointment = false,
  ) {
    const queueWithConfig = await this.prisma.queue.findUnique({
      where: { id: queueId },
      select: { tokenDisplayConfig: true, tenantId: true },
    });

    let displayId: string | undefined;
    const config = (queueWithConfig?.tokenDisplayConfig as any) || {};
    const mode = config.generationMode || 'random';
    const format = config.format || 'alphanumeric';
    const prefix = config.prefix || 'CC';
    let counter = config.counter || 0;

    if (mode === 'sequential') {
      counter = await this.redisService.client.incr(
        `queue:${queueId}:sequence`,
      );
      const numberPart = counter.toString();
      displayId =
        format === 'alphanumeric' ? `${prefix}${numberPart}` : numberPart;
    } else {
      const numberPart = Math.floor(1000 + Math.random() * 9000).toString();
      displayId =
        format === 'alphanumeric' ? `${prefix}${numberPart}` : numberPart;
    }

    const token = await this.prisma.token.create({
      data: {
        queueId,
        customerName,
        phone,
        displayId,
        status: 'WAITING',
        isAppointment,
      },
    });

    // Add to Redis sorted set for position tracking (score is timestamp)
    await this.redisService.client.zadd(
      `queue:${queueId}:waiting`,
      Date.now(),
      token.id,
    );

    // --- LEGACY QUEUE INTERCEPT: Parallel Visit Creation ---
    // Look up or create Customer
    const customer =
      (await this.prisma.customer.findFirst({
        where: { phone, tenantId: queueWithConfig?.tenantId || '' },
      })) ||
      (await this.prisma.customer
        .create({
          data: {
            name: customerName,
            phone,
            tenantId: queueWithConfig?.tenantId || '',
          },
        })
        .catch(() => null));

    // Fallback Location and Service for legacy queues
    const location = await this.prisma.location.findFirst({
      where: { tenantId: queueWithConfig?.tenantId || '' },
    });
    const service = await this.prisma.service.findFirst({
      where: { tenantId: queueWithConfig?.tenantId || '' },
    });

    if (customer && location && service) {
      await this.prisma.visit.create({
        data: {
          tenantId: location.tenantId,
          customerId: customer.id,
          locationId: location.id,
          serviceId: service.id,
          queueId: queueId,
          source: isAppointment ? 'APPOINTMENT' : 'WALK_IN',
          currentState: 'WAITING',
          waitingStart: new Date(),
        },
      });
    }
    // -------------------------------------------------------

    this.queueGateway.broadcastQueueUpdate(queueId, 'token_joined', { token });
    const queue = await this.prisma.queue.findUnique({
      where: { id: queueId },
    });
    if (queue) {
      this.webhooksService.triggerWebhooks(
        queue.tenantId,
        'TOKEN_JOINED',
        token,
      );
    }
    return token;
  }

  async getEstimatedWaitTime(queueId: string, tokenId: string) {
    const rank = await this.redisService.client.zrank(
      `queue:${queueId}:waiting`,
      tokenId,
    );
    if (rank === null) return 0; // Not waiting

    // Dynamic EWT: average service time of last 10 customers
    const avgServiceTimeRaw = await this.redisService.client.get(
      `queue:${queueId}:avg_time`,
    );
    const avgServiceTime = avgServiceTimeRaw
      ? parseInt(avgServiceTimeRaw, 10)
      : 5; // Default 5 mins

    return rank * avgServiceTime;
  }

  async advanceTurn(queueId: string) {
    // Pop the lowest score (oldest) from waiting set
    const nextTokenIds = await this.redisService.client.zpopmin(
      `queue:${queueId}:waiting`,
    );
    if (!nextTokenIds || nextTokenIds.length === 0) return null;

    const tokenId = nextTokenIds[0];

    // Update DB
    const token = await this.prisma.token.update({
      where: { id: tokenId },
      data: {
        status: TokenStatus.SERVING,
        servedAt: new Date(),
      },
    });

    // Broadcast
    this.queueGateway.broadcastQueueUpdate(queueId, 'token_serving', { token });
    const queue = await this.prisma.queue.findUnique({
      where: { id: queueId },
    });
    if (queue) {
      this.webhooksService.triggerWebhooks(
        queue.tenantId,
        'TOKEN_SERVING',
        token,
      );
    }
    return token;
  }

  async completeToken(tokenId: string, tenantId?: string, operatorId?: string) {
    const token = await this.prisma.token.findUnique({
      where: { id: tokenId },
      include: { queue: true },
    });
    if (!token) throw new NotFoundException();

    if (tenantId && token.queue.tenantId !== tenantId) {
      throw new NotFoundException(); // Treat as not found to prevent leaking existence
    }

    const updatedToken = await this.prisma.token.update({
      where: { id: tokenId },
      data: {
        status: TokenStatus.COMPLETED,
        completedAt: new Date(),
        operatorId: operatorId || undefined,
      },
    });

    await this.redisService.client.zrem(
      `queue:${updatedToken.queueId}:waiting`,
      tokenId,
    );

    if (updatedToken.servedAt && updatedToken.completedAt) {
      const diffMs =
        updatedToken.completedAt.getTime() - updatedToken.servedAt.getTime();
      let diffMins = Math.max(1, Math.floor(diffMs / 60000));
      diffMins = Math.min(diffMins, 60); // Cap at 60 mins to prevent outliers

      const currentAvgRaw = await this.redisService.client.get(
        `queue:${updatedToken.queueId}:avg_time`,
      );
      let newAvg = diffMins;
      if (currentAvgRaw) {
        newAvg = Math.max(
          1,
          Math.floor((parseInt(currentAvgRaw, 10) * 9 + diffMins) / 10),
        ); // Exponential moving average over ~10 customers
      }
      await this.redisService.client.set(
        `queue:${updatedToken.queueId}:avg_time`,
        newAvg,
      );
    }

    // Multi-step routing logic
    if (token.queue.nextQueueId) {
      await this.joinQueue(
        token.queue.nextQueueId,
        token.customerName,
        token.phone,
        token.isAppointment,
      );
    }

    this.queueGateway.broadcastQueueUpdate(token.queueId, 'token_completed', {
      tokenId,
    });
    this.webhooksService.triggerWebhooks(
      token.queue.tenantId,
      'TOKEN_COMPLETED',
      token,
    );
    return true;
  }

  async skipToken(tokenId: string) {
    const token = await this.prisma.token.update({
      where: { id: tokenId },
      data: { status: TokenStatus.MISSED },
      include: { queue: true },
    });

    await this.redisService.client.zrem(
      `queue:${token.queueId}:waiting`,
      tokenId,
    );

    this.queueGateway.broadcastQueueUpdate(token.queueId, 'token_missed', {
      tokenId,
    });
    this.webhooksService.triggerWebhooks(
      token.queue.tenantId,
      'TOKEN_MISSED',
      token,
    );
    return token;
  }
}
