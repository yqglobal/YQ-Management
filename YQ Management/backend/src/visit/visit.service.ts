import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVisitDto } from './dto/create-visit.dto';
import { UpdateVisitDto } from './dto/update-visit.dto';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { RedisService } from '../redis/redis.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { AppointmentService } from '../appointment/appointment.service';
import { CommunicationService } from '../communication/communication.service';
import { CommunicationEvent } from '../communication/events/communication-events.enum';

@Injectable()
export class VisitService {
  private readonly logger = new Logger(VisitService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => WhatsappService))
    private readonly whatsappService: WhatsappService,
    @Inject(forwardRef(() => SubscriptionService))
    private readonly subscriptionService: SubscriptionService,
    @Inject(forwardRef(() => AppointmentService))
    private readonly appointmentService: AppointmentService,
    private readonly redisService: RedisService,
    @Inject(forwardRef(() => CommunicationService))
    private readonly communicationService: CommunicationService,
  ) {}

  // Basic CRUD for controllers
  async create(createVisitDto: CreateVisitDto) {
    return this.prisma.visit.create({
      data: createVisitDto,
    });
  }

  async findAll(userTokenPayload: any, scope?: 'today' | 'history', locationId?: string) {
    const where: any = { tenantId: userTokenPayload.tenantId };
    if (locationId) {
      where.locationId = locationId;
    }
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
    if (scope === 'today') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      where.createdAt = { gte: start, lte: end };
    } else if (scope === 'history') {
      where.currentState = { in: ['COMPLETED', 'NO_SHOW', 'CANCELLED'] };
    }
    return this.prisma.visit.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        service: true,
        location: true,
      },
    });
  }

  async findOne(id: string, tenantId: string) {
    const visit = await this.prisma.visit.findFirst({
      where: { id, tenantId },
      include: { customer: true, service: true, location: true },
    });
    if (!visit) throw new NotFoundException(`Visit with ID ${id} not found`);
    return visit;
  }

  async findOnePublic(accessToken: string) {
    const visit = await this.prisma.visit.findUnique({
      where: { accessToken },
      select: {
        id: true,
        queueId: true,
        serviceId: true,
        displayId: true,
        accessToken: true,
        currentState: true,
        waitingStart: true,
        createdAt: true,
        customer: { select: { name: true } },
        service: {
          select: {
            name: true,
            expectedDuration: true,
            requireManualCheckIn: true,
          },
        },
        queue: { select: { name: true } },
        location: { select: { name: true, address: true } },
        scheduledTime: true,
        language: true,
        tenant: { select: { name: true } },
      },
    });
    if (!visit)
      throw new NotFoundException(
        `Visit with accessToken ${accessToken} not found`,
      );

    let position = 0;
    let ewt = 0;

    if (
      visit.currentState === 'WAITING' ||
      visit.currentState === 'CHECKED_IN'
    ) {
      const waitingAhead = await this.prisma.visit.count({
        where: {
          queueId: visit.queueId,
          currentState: { in: ['WAITING', 'CHECKED_IN'] },
          createdAt: { lt: visit.createdAt },
        },
      });
      position = waitingAhead + 1;
      ewt = waitingAhead * (visit.service?.expectedDuration || 5);
    }

    return {
      token: {
        ...visit,
        status: visit.currentState,
        customerName: visit.customer?.name,
        scheduledFor: visit.scheduledTime,
        checkedIn: visit.currentState !== 'SCHEDULED',
        queue: {
          requireManualCheckIn: visit.service?.requireManualCheckIn || false,
        },
      },
      position,
      estimatedWaitTime: ewt,
      isScheduled: !!visit.scheduledTime,
    };
  }

  async findMultiplePublic(accessTokens: string[]) {
    return this.prisma.visit.findMany({
      where: { accessToken: { in: accessTokens } },
      select: {
        id: true,
        queueId: true,
        displayId: true,
        accessToken: true,
        currentState: true,
        waitingStart: true,
        createdAt: true,
        customer: { select: { name: true } },
        service: { select: { name: true, expectedDuration: true } },
        location: { select: { name: true, address: true } },
        tenant: { select: { name: true } },
      },
    });
  }


  async update(id: string, tenantId: string, updateVisitDto: UpdateVisitDto) {
    await this.findOne(id, tenantId);
    return this.prisma.visit.update({ where: { id }, data: updateVisitDto });
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.visit.delete({ where: { id } });
  }

  // --- STATE MACHINE METHODS ---

  async joinQueue(
    queueId: string,
    customerData: { name: string; phone?: string | null; serviceId?: string },
  ) {
    const queue = await this.prisma.queue.findUnique({
      where: { id: queueId },
      include: { services: true },
    });

    if (!queue) throw new NotFoundException('Queue not found');
    if (!queue.services || queue.services.length === 0) {
      throw new BadRequestException('Queue has no linked services');
    }

    let serviceId = queue.services[0].id;
    if (customerData.serviceId) {
      const validService = queue.services.find(
        (s) => s.id === customerData.serviceId,
      );
      if (!validService) {
        throw new BadRequestException('Invalid service ID for this queue');
      }
      serviceId = validService.id;
    }

    const locationId = queue.locationId;
    if (!locationId)
      throw new BadRequestException('Queue is not assigned to a Location');

    return this.prisma.$transaction(async (tx) => {
      // FIX (2C): Check subscription visit quota before creating a new visit
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayVisitCount = await tx.visit.count({
        where: { tenantId: queue.tenantId, createdAt: { gte: todayStart } },
      });
      await this.subscriptionService.checkLimit(
        queue.tenantId,
        'visits',
        todayVisitCount,
      );

      let customer = await tx.customer.findFirst({
        where: {
          phone: customerData.phone || undefined,
          tenantId: queue.tenantId,
        },
      });

      if (!customer) {
        customer = await tx.customer.create({
          data: {
            tenantId: queue.tenantId,
            name: customerData.name || 'Walk-in',
            phone: customerData.phone,
          },
        });
      }

      const config = (queue.tokenDisplayConfig as any) || {};
      const prefix = config.prefix || 'Q';
      const numberPart = Math.floor(1000 + Math.random() * 9000).toString();
      const displayId = `${prefix}${numberPart}`;

      const visit = await tx.visit.create({
        data: {
          tenantId: queue.tenantId,
          customerId: customer.id,
          locationId: locationId,
          queueId,
          serviceId,
          displayId,
          currentState: 'WAITING',
          waitingStart: new Date(),
          metadata: {
            customerName: customerData.name,
            phone: customerData.phone,
          },
        },
      });

      await tx.outboxEvent.create({
        data: {
          type: 'VISIT_CREATED',
          payload: {
            visitId: visit.id,
            queueId: queue.id,
            tenantId: queue.tenantId,
            displayId,
          },
        },
      });

      return visit;
    });
  }

  async joinMultiple(data: {
    customerName: string;
    phone?: string | null;
    otp?: string;
    language?: string;
    bookings: {
      serviceId: string;
      queueId?: string;
      scheduledFor?: string;
      formResponses?: any;
    }[];
  }) {
    if (!data.bookings || data.bookings.length === 0) {
      throw new BadRequestException('No bookings provided');
    }

    return this.prisma.$transaction(async (tx) => {
      // Find the first service to get tenantId and locationId (assuming all bookings are for the same location/tenant)
      const firstService = await tx.service.findUnique({
        where: { id: data.bookings[0].serviceId },
        include: { queues: true, location: true },
      });
      if (!firstService) throw new BadRequestException('Service not found');

      const tenantId = firstService.tenantId;
      const locationId = firstService.locationId;

      const tenant = await tx.tenant.findUnique({ where: { id: tenantId } });
      if (tenant?.whatsappConnected && data.phone) {
        if (!data.otp) {
          throw new BadRequestException('OTP is required');
        }
        const redisKey = `otp:booking:${data.phone}`;
        const storedOtp = await this.redisService.client.get(redisKey);
        if (storedOtp !== data.otp) {
          throw new BadRequestException('Invalid or expired OTP');
        }
        await this.redisService.client.del(redisKey);
      }

      if (!locationId)
        throw new BadRequestException('Service is not assigned to a Location');

      let customer = await tx.customer.findFirst({
        where: { phone: data.phone || undefined, tenantId },
      });

      if (!customer) {
        customer = await tx.customer.create({
          data: {
            tenantId,
            name: data.customerName || 'Walk-in',
            phone: data.phone,
          },
        });
      }

      const visits = [];

      for (const booking of data.bookings) {
        const service = await tx.service.findUnique({
          where: { id: booking.serviceId },
          include: { queues: true },
        });

        if (!service)
          throw new BadRequestException(
            `Service ${booking.serviceId} not found`,
          );

        let queueId = booking.queueId;

        if (!queueId) {
          const activeQueues = service.queues.filter(
            (q) => q.status === 'ACTIVE',
          );
          if (activeQueues.length > 0) {
            queueId = activeQueues[0].id;
          } else {
            throw new BadRequestException(
              `No active queue found for service ${service.name}`,
            );
          }
        } else {
          const queue = await tx.queue.findUnique({ where: { id: queueId } });
          if (!queue || queue.status !== 'ACTIVE') {
            throw new BadRequestException(
              `Queue ${queueId} is not active or doesn't exist`,
            );
          }
        }

        const q = await tx.queue.findUnique({ where: { id: queueId } });
        const config = (q?.tokenDisplayConfig as any) || {};
        const prefix = config.prefix || 'Q';
        const numberPart = Math.floor(1000 + Math.random() * 9000).toString();
        const displayId = `${prefix}${numberPart}`;

        let scheduledTime: Date | undefined;
        let currentState = 'WAITING';

        if (booking.scheduledFor && service.allowAppointments) {
          scheduledTime = new Date(booking.scheduledFor);
          currentState = service.requireManualCheckIn ? 'CREATED' : 'SCHEDULED';

          // Lock the service record to serialize concurrent bookings for this service
          await tx.$executeRaw`SELECT 1 FROM "Service" WHERE id = ${service.id} FOR UPDATE`;

          // Pessimistic slot check
          const durationMins =
            service.expectedDuration ||
            service.appointmentGranularityMins ||
            15;
          const bufferMins = service.bufferDuration || 0;
          const totalMins = durationMins + bufferMins;
          const concurrentSlots = service.concurrentSlots || 1;
          const slotEnd = new Date(scheduledTime.getTime() + totalMins * 60000);
          const searchStart = new Date(
            scheduledTime.getTime() - totalMins * 60000,
          );

          const overlappingCount = await tx.visit.count({
            where: {
              serviceId: service.id,
              currentState: {
                notIn: ['CANCELLED', 'NO_SHOW', 'MISSED', 'COMPLETED'],
              },
              scheduledTime: {
                lt: slotEnd,
                gt: searchStart,
              },
            },
          });

          if (overlappingCount >= concurrentSlots) {
            throw new ConflictException(
              `The selected time slot is no longer available for service ${service.name}`,
            );
          }
        }

        const visit = await tx.visit.create({
          data: {
            tenantId,
            customerId: customer.id,
            locationId: locationId,
            queueId,
            serviceId: service.id,
            displayId,
            currentState: currentState as any,
            scheduledTime,
            priority: scheduledTime ? 10 : 0,
            waitingStart: currentState === 'WAITING' ? new Date() : null,
            language: data.language || 'en',
            formResponses: booking.formResponses || {},
            metadata: {
              customerName: data.customerName,
              phone: data.phone,
            },
          },
        });

        await tx.outboxEvent.create({
          data: {
            type: 'VISIT_CREATED',
            payload: { visitId: visit.id, queueId, tenantId, displayId },
          },
        });

        // FIX (6B): Removed inline WhatsApp call from joinMultiple.
        // WhatsApp confirmation is now handled by OutboxProcessorService when it processes
        // the VISIT_CREATED outbox event above. This ensures atomicity: the visit is committed
        // to the DB first, and then notification fires asynchronously — a WhatsApp failure
        // cannot cause the DB transaction to roll back or retry.

        visits.push(visit);
      }

      return visits;
    });
  }

  async advanceTurn(queueId: string, operatorId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const oldestWaiting = await tx.visit.findFirst({
        where: { queueId, currentState: { in: ['WAITING', 'CHECKED_IN'] } },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      });

      if (!oldestWaiting) return null; // Queue is empty

      const visit = await tx.visit.update({
        where: { id: oldestWaiting.id },
        data: {
          currentState: 'IN_SERVICE',
          serviceStart: new Date(),
          operatorId,
        },
      });

      await tx.outboxEvent.create({
        data: {
          type: 'VISIT_CALLED',
          payload: {
            visitId: visit.id,
            queueId,
            tenantId: visit.tenantId,
            displayId: visit.displayId,
          },
        },
      });

      return visit;
    });
  }

  async checkIn(id: string, tenantId: string) {
    const visit = await this.findOne(id, tenantId);
    if (
      visit.currentState === 'CHECKED_IN' ||
      visit.currentState === 'IN_SERVICE' ||
      visit.currentState === 'COMPLETED'
    ) {
      throw new ConflictException(
        `Visit is already ${visit.currentState.toLowerCase()}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.visit.update({
        where: { id },
        data: {
          currentState: 'CHECKED_IN',
          waitingStart: new Date(),
          priority: 10,
        },
      });

      await tx.outboxEvent.create({
        data: {
          type: 'VISIT_CHECKED_IN',
          payload: {
            visitId: updated.id,
            queueId: updated.queueId,
            tenantId: updated.tenantId,
          },
        },
      });

      return updated;
    });
  }

  async startService(id: string, tenantId: string) {
    const visit = await this.findOne(id, tenantId);
    if (
      visit.currentState === 'IN_SERVICE' ||
      visit.currentState === 'COMPLETED'
    ) {
      throw new ConflictException(
        `Visit is already ${visit.currentState.toLowerCase()}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.visit.update({
        where: { id },
        data: { currentState: 'IN_SERVICE', serviceStart: new Date() },
      });

      await tx.outboxEvent.create({
        data: {
          type: 'VISIT_CALLED',
          payload: {
            visitId: updated.id,
            queueId: updated.queueId,
            tenantId: updated.tenantId,
          },
        },
      });

      return updated;
    });
  }

  async completeService(id: string, tenantId?: string, operatorId?: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const visit = await tx.visit.findUnique({ where: { id } });
      if (!visit) throw new NotFoundException('Visit not found');

      if (tenantId && visit.tenantId !== tenantId) {
        throw new NotFoundException('Visit not found');
      }

      if (
        visit.currentState === 'COMPLETED' ||
        visit.currentState === 'MISSED' ||
        visit.currentState === 'CANCELLED'
      ) {
        throw new BadRequestException(
          `Visit is already ${visit.currentState.toLowerCase()}`,
        );
      }

      const updated = await tx.visit.update({
        where: { id },
        data: {
          currentState: 'COMPLETED',
          completedAt: new Date(),
          serviceEnd: new Date(),
          operatorId: operatorId || visit.operatorId,
        },
      });

      await tx.outboxEvent.create({
        data: {
          type: 'VISIT_COMPLETED',
          payload: {
            visitId: updated.id,
            queueId: updated.queueId,
            tenantId: updated.tenantId,
          },
        },
      });

      return updated;
    });

    // Fire-and-forget: update rolling avg actual duration for this service
    if (result?.serviceId && result?.tenantId) {
      this.appointmentService
        .updateAvgActualDuration(result.serviceId, result.tenantId)
        .catch(() => {}); // Non-critical
    }

    return result;
  }

  async skipVisit(visitId: string) {
    return this.prisma.$transaction(async (tx) => {
      const visit = await tx.visit.findUnique({ where: { id: visitId } });
      if (!visit) throw new NotFoundException('Visit not found');

      const updated = await tx.visit.update({
        where: { id: visitId },
        data: {
          currentState: 'MISSED',
          completedAt: new Date(),
        },
      });

      await tx.outboxEvent.create({
        data: {
          type: 'VISIT_MISSED',
          payload: {
            visitId: updated.id,
            queueId: updated.queueId,
            tenantId: updated.tenantId,
          },
        },
      });

      return updated;
    });
  }

  async cancelVisit(visitId: string, tenantId?: string, operatorId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const visit = await tx.visit.findUnique({ where: { id: visitId } });
      if (!visit) throw new NotFoundException('Visit not found');

      if (tenantId && visit.tenantId !== tenantId) {
        throw new NotFoundException('Visit not found in this tenant');
      }

      if (
        visit.currentState === 'COMPLETED' ||
        visit.currentState === 'MISSED' ||
        visit.currentState === 'CANCELLED'
      ) {
        throw new BadRequestException(
          `Visit is already ${visit.currentState.toLowerCase()}`,
        );
      }

      const updated = await tx.visit.update({
        where: { id: visitId },
        data: {
          currentState: 'CANCELLED',
          completedAt: new Date(),
          operatorId: operatorId || visit.operatorId,
        },
      });

      await tx.outboxEvent.create({
        data: {
          type: 'VISIT_CANCELLED',
          payload: {
            visitId: updated.id,
            queueId: updated.queueId,
            tenantId: updated.tenantId,
          },
        },
      });

      return updated;
    });
  }

  async validateToken(tokenString: string, tenantId: string, locationId?: string) {
    let tokenValue = tokenString;
    try {
      if (tokenString.includes('http')) {
        const url = new URL(tokenString);
        const parts = url.pathname.split('/');
        tokenValue = parts[parts.length - 1];
      }
    } catch (e) {
      // Ignore
    }

    const whereClause: any = {
      OR: [{ id: tokenValue }, { accessToken: tokenValue }],
      tenantId: tenantId,
    };

    if (locationId && locationId !== 'all') {
      whereClause.locationId = locationId;
    }

    const visit = await this.prisma.visit.findFirst({
      where: whereClause,
      include: {
        customer: true,
        queue: {
          include: { location: true },
        },
        service: true,
      },
    });

    if (!visit) {
      return {
        valid: false,
        reason: 'Invalid token or not found for this workspace',
      };
    }

    if (
      visit.currentState === 'COMPLETED' ||
      visit.currentState === 'CANCELLED' ||
      visit.currentState === 'MISSED'
    ) {
      return {
        valid: false,
        reason: `Visit is already ${visit.currentState.toLowerCase()}`,
      };
    }

    return {
      valid: true,
      status: visit.currentState,
      tokenId: visit.id,
      customerName: visit.customer?.name || 'Unknown',
      queueName: visit.queue?.name || 'Unknown Queue',
      locationName: visit.queue?.location?.name || 'Unknown Location',
      serviceBooked: visit.service?.name || 'Unknown Service',
      scheduledFor: visit.scheduledTime,
      checkedIn: visit.currentState !== 'SCHEDULED',
    };
  }

  async cancelPublicVisit(accessToken: string) {
    const visit = await this.prisma.visit.findUnique({
      where: { accessToken },
      include: { queue: { include: { location: true } }, customer: true },
    });

    if (!visit) throw new NotFoundException('Visit not found');

    if (
      visit.currentState === 'COMPLETED' ||
      visit.currentState === 'CANCELLED' ||
      visit.currentState === 'MISSED'
    ) {
      throw new BadRequestException(`Visit is already ${visit.currentState.toLowerCase()}`);
    }

    const updated = await this.prisma.visit.update({
      where: { id: visit.id },
      data: { currentState: 'CANCELLED' },
      include: { customer: true, queue: true, service: true, tenant: true },
    });

    await this.communicationService.publish(CommunicationEvent.QUEUE_CANCELLED, {
      tenantId: updated.tenantId,
      visitId: updated.id,
      oldState: visit.currentState,
      newState: 'CANCELLED',
      customerPhone: updated.customer?.phone,
      customerName: updated.customer?.name,
      queueName: updated.queue?.name,
    });

    return { success: true, visit: updated };
  }

  async transferVisit(
    visitId: string,
    nextQueueId: string,
    tenantId: string,
    operatorId?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const visit = await tx.visit.findUnique({
        where: { id: visitId, tenantId },
      });
      if (!visit) throw new NotFoundException('Visit not found');

      const nextQueue = await tx.queue.findUnique({
        where: { id: nextQueueId, tenantId },
      });
      if (!nextQueue) throw new NotFoundException('Target queue not found');

      const updated = await tx.visit.update({
        where: { id: visitId },
        data: {
          queueId: nextQueueId,
          currentState: 'WAITING',
        },
      });

      await tx.outboxEvent.create({
        data: {
          type: 'TOKEN_TRANSFERRED',
          payload: {
            visitId: updated.id,
            previousQueueId: visit.queueId,
            queueId: updated.queueId,
            tenantId: updated.tenantId,
          },
        },
      });
      return updated;
    });
  }
}
