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
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

import { ServiceService } from '../service/service.service';
import { BlockOffService } from '../block-off/block-off.service';
import { VisitStepService } from '../visit-step/visit-step.service';

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
    @Inject(forwardRef(() => ServiceService))
    private readonly serviceService: ServiceService,
    @Inject(forwardRef(() => BlockOffService))
    private readonly blockOffService: BlockOffService,
    private readonly visitStepService: VisitStepService,
  ) {}


  private async generateNextToken(locationId: string, prefix: string, timezone: string = 'UTC'): Promise<string> {
    const zonedNow = toZonedTime(new Date(), timezone);
    const dateStr = zonedNow.toISOString().split('T')[0]; // YYYY-MM-DD
    const key = `queue:token_seq:${locationId}:${prefix}:${dateStr}`;
    const seq = await this.redisService.client.incr(key);
    // Expire the key after 24 hours to prevent memory leak
    if (seq === 1) {
      await this.redisService.client.expire(key, 86400 * 2);
    }
    return `${prefix}${seq.toString().padStart(3, '0')}`;
  }

  // Basic CRUD for controllers
  async create(createVisitDto: CreateVisitDto) {
    return this.prisma.visit.create({
      data: createVisitDto,
    });
  }

  async findAll(
    userTokenPayload: any,
    scope?: 'today' | 'history',
    locationId?: string,
    queueId?: string,
    tzParam?: string,
  ) {
    const where: any = { tenantId: userTokenPayload.tenantId };
    if (locationId) {
      where.locationId = locationId;
    }
    if (queueId) {
      where.queueId = queueId;
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

      if (user && user.allowedServiceIds && user.allowedServiceIds.length > 0) {
        where.serviceId = { in: user.allowedServiceIds };
      }
    }
    if (scope === 'today') {
      const tz = tzParam || 'UTC';
      const zonedNow = toZonedTime(new Date(), tz);
      zonedNow.setHours(0, 0, 0, 0);
      const start = fromZonedTime(zonedNow, tz);
      
      const zonedEnd = toZonedTime(new Date(), tz);
      zonedEnd.setHours(23, 59, 59, 999);
      const end = fromZonedTime(zonedEnd, tz);

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
        queue: { select: { name: true, status: true } },
        location: { select: { name: true, address: true } },
        scheduledTime: true,
        language: true,
        tenant: { select: { name: true } },
        visitSteps: {
          select: {
            id: true,
            stepOrder: true,
            name: true,
            status: true,
            templateStep: {
              select: {
                type: true,
                customerInstruction: true,
                locationDescription: true,
              }
            }
          },
          orderBy: { stepOrder: 'asc' }
        },
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
      
      // Dynamic AI Wait Time Estimation (C2)
      // Calculate rolling average of the last 30 completed visits for this service
      let avgServiceTime = visit.service?.expectedDuration || 5;
      
      if (visit.serviceId) {
        const recentVisits = await this.prisma.visit.findMany({
          where: { 
            serviceId: visit.serviceId, 
            currentState: 'COMPLETED',
            serviceStart: { not: null },
            completedAt: { not: null }
          },
          orderBy: { completedAt: 'desc' },
          take: 30,
          select: { serviceStart: true, completedAt: true }
        });
        
        if (recentVisits.length > 0) {
          const totalServiceTime = recentVisits.reduce((acc, v) => {
            if (v.completedAt && v.serviceStart) {
               return acc + (v.completedAt.getTime() - v.serviceStart.getTime()) / 60000;
            }
            return acc;
          }, 0);
          avgServiceTime = totalServiceTime / recentVisits.length;
        }
      }
      
      ewt = Math.round(waitingAhead * avgServiceTime);
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
    const visits = await this.prisma.visit.findMany({
      where: { accessToken: { in: accessTokens } },
      select: {
        id: true,
        queueId: true,
        displayId: true,
        accessToken: true,
        currentState: true,
        waitingStart: true,
        createdAt: true,
        scheduledTime: true,
        appointmentId: true,
        customer: { select: { name: true } },
        service: { select: { name: true, expectedDuration: true, emaExpectedDuration: true } },
        location: { select: { name: true, address: true } },
        tenant: { select: { name: true } },
        queue: { select: { status: true } },
      },
    });

    return Promise.all(
      visits.map(async (visit) => {
        let position = 0;
        let ewt = 0;

        if (visit.currentState === 'WAITING' || visit.currentState === 'CHECKED_IN') {
          const waitingAhead = await this.prisma.visit.count({
            where: {
              queueId: visit.queueId,
              currentState: { in: ['WAITING', 'CHECKED_IN'] },
              createdAt: { lt: visit.createdAt },
            },
          });
          position = waitingAhead + 1;
          ewt = waitingAhead * (visit.service?.emaExpectedDuration || visit.service?.expectedDuration || 5);
        }

        return {
          ...visit,
          position,
          estimatedWaitTime: ewt,
          isScheduled: !!visit.scheduledTime,
        };
      })
    );
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
    customerData: { name: string; phone?: string | null; serviceId?: string; accompanyingGuests?: number },
  ) {
    const queue = await this.prisma.queue.findUnique({
      where: { id: queueId },
      include: { services: true, location: true },
    });

    if (!queue) throw new NotFoundException('Queue not found');
    if (!queue.services || queue.services.length === 0) {
      throw new BadRequestException('Queue has no linked services');
    }

    const isBlocked = await this.blockOffService.isTimeBlocked(queue.tenantId, queue.locationId, queue.id, new Date());
    if (isBlocked.blocked) {
      throw new BadRequestException(`QUEUE_BLOCKED:${isBlocked.reason}`);
    }

    if (queue.maxCapacity && queue.maxCapacity > 0) {
      const activeCount = await this.prisma.visit.count({
        where: {
          queueId,
          currentState: { in: ['WAITING', 'CHECKED_IN'] }
        }
      });
      if (activeCount >= queue.maxCapacity) {
        throw new BadRequestException('QUEUE_FULL');
      }
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

    const result = await this.prisma.$transaction(async (tx) => {
      // FIX (2C): Check subscription visit quota before creating a new visit
      const tz = queue.location?.timezone || 'UTC';
      const zonedNow = toZonedTime(new Date(), tz);
      zonedNow.setHours(0, 0, 0, 0);
      const todayStart = fromZonedTime(zonedNow, tz);
      
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
      const displayId = await this.generateNextToken(locationId, prefix, queue.location?.timezone || 'UTC');

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
          accompanyingGuests: customerData.accompanyingGuests || 0,
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

    if (result.serviceId) {
      await this.visitStepService.instantiateStepsForVisit(
        result.tenantId,
        result.id,
        result.serviceId,
        { accompanyingGuests: result.accompanyingGuests || 0 }
      );
    }

    return result;
  }

  async joinMultiple(data: {
    customerName: string;
    phone?: string | null;
    otp?: string;
    language?: string;
    bookings: {
      serviceId: string;
      queueId?: string;
      providerId?: string;
      scheduledFor?: string;
      formResponses?: any;
      accompanyingGuests?: number;
      itinerary?: any;
    }[];
  }) {
    if (!data.bookings || data.bookings.length === 0) {
      throw new BadRequestException('No bookings provided');
    }

    const result = await this.prisma.$transaction(async (tx) => {
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
          include: { queues: true, location: true },
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

        const q = await tx.queue.findUnique({ where: { id: queueId }, include: { location: true } });
        const config = (q?.tokenDisplayConfig as any) || {};
        const prefix = config.prefix || 'Q';
        const displayId = await this.generateNextToken(q?.locationId || 'unknown', prefix, q?.location?.timezone || 'UTC');

        let scheduledTime: Date | undefined;
        let currentState = 'WAITING';

        if (booking.scheduledFor && service.allowAppointments) {
          scheduledTime = new Date(booking.scheduledFor);
          currentState = service.requireManualCheckIn ? 'CREATED' : 'SCHEDULED';

          // Verify that this slot is actually valid within business hours
          // Timezone manipulation makes the simple string split unreliable if UTC date falls on previous day.
          // Let getAvailableSlots handle the raw date lookup using its internal timezone logic.
          const localDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: service.location?.timezone || 'UTC' }).format(scheduledTime);
          const availableSlots = await this.serviceService.getAvailableSlots(service.id, localDateStr);
          const requestedSlot = scheduledTime.toISOString();
          
          if (!availableSlots.some(s => s.time === requestedSlot && s.available)) {
            throw new BadRequestException(`The selected time slot is outside of operational hours or invalid for service ${service.name}`);
          }

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
        } else {
          // Walk-in booking - check if the service is open right now
          const isOpenNow = await this.serviceService.isServiceOpen(service, new Date());
          if (!isOpenNow) {
            throw new BadRequestException(`Service ${service.name} is currently closed.`);
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
            assignedStaffId: booking.providerId || null,
            currentState: currentState as any,
            scheduledTime,
            priority: scheduledTime ? 10 : 0,
            waitingStart: currentState === 'WAITING' ? new Date() : null,
            language: data.language || 'en',
            accompanyingGuests: booking.accompanyingGuests || 0,
            formResponses: booking.formResponses || {},
            itinerary: booking.itinerary || null,
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

    // Zero-Latency Event Streaming: Wake up the outbox processor immediately
    this.redisService.client.publish('outbox_events', 'WAKE_UP').catch(e => 
      console.error('Failed to publish outbox wake-up event', e)
    );

    // Instantiate SEF steps for each created visit
    for (const v of result) {
      if (v.serviceId) {
        await this.visitStepService.instantiateStepsForVisit(
          v.tenantId,
          v.id,
          v.serviceId,
          { accompanyingGuests: v.accompanyingGuests || 0 }
        );
      }
    }

    return result;
  }

  async advanceTurn(queueId: string, operatorId?: string) {
    return this.prisma.$transaction(async (tx) => {
      let operatorSkills: string[] = [];
      if (operatorId) {
        const user = await tx.user.findUnique({ where: { id: operatorId }, select: { skills: true } });
        if (user && user.skills) {
          operatorSkills = user.skills;
        }
      }

      const waitingVisits = await tx.visit.findMany({
        where: { queueId, currentState: { in: ['WAITING', 'CHECKED_IN'] } },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        include: { service: { select: { requiredSkills: true } } }
      });

      if (waitingVisits.length === 0) return null; // Queue is empty

      let selectedVisit = waitingVisits[0];

      // Skill-based matchmaking: Try to find the highest-priority visit that the operator is qualified for
      if (operatorSkills.length > 0) {
        const qualifiedVisit = waitingVisits.find(v => {
          const req = v.service?.requiredSkills || [];
          if (req.length === 0) return true; // No skills required
          return req.every(skill => operatorSkills.includes(skill));
        });
        if (qualifiedVisit) {
          selectedVisit = qualifiedVisit;
        }
      }

      const visit = await tx.visit.update({
        where: { id: selectedVisit.id },
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

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.visit.update({
        where: { id },
        data: {
          currentState: 'CHECKED_IN',
          waitingStart: new Date(),
          checkInTime: new Date(),
          priority: 10,
        },
      });

      await tx.outboxEvent.create({
        data: {
          type: 'VISIT_CHECKED_IN',
          payload: {
            visitId: u.id,
            queueId: u.queueId,
            tenantId: u.tenantId,
            source: 'RECEPTIONIST',
          },
        },
      });

      return u;
    });

    // Send WhatsApp confirmation to the customer (receptionist scan flow)
    try {
      const fullVisit = await this.prisma.visit.findUnique({
        where: { id },
        include: {
          customer: { select: { name: true, phone: true } },
          service: { select: { name: true, expectedDuration: true, emaExpectedDuration: true } },
          location: { select: { name: true } },
          tenant: { select: { name: true } },
        },
      });
      const phone = fullVisit?.customer?.phone;
      if (phone) {
        const waitingAhead = await this.prisma.visit.count({
          where: {
            queueId: updated.queueId,
            currentState: { in: ['WAITING', 'CHECKED_IN'] },
            createdAt: { lt: updated.createdAt },
          },
        });
        const position = waitingAhead + 1;
        const ewt = waitingAhead * (fullVisit?.service?.emaExpectedDuration || fullVisit?.service?.expectedDuration || 5);
        const statusUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.qmova.yqbuddy.com'}/status/${updated.accessToken}`;
        const msg =
          `✅ Reception confirmed your arrival at *${fullVisit?.location?.name || fullVisit?.tenant?.name}*!\n\n` +
          `📋 Booking: *${fullVisit?.service?.name}*\n` +
          `🔢 Your position: *#${position}*\n` +
          (ewt > 0 ? `⏱ Estimated wait: *${ewt} mins*\n\n` : '\n') +
          `Track live: ${statusUrl}`;
        await this.whatsappService.sendToTenant(tenantId, phone, msg).catch(() => {});
      }
    } catch (e) {
      this.logger.warn(`WhatsApp receptionist check-in notification failed: ${e.message}`);
    }

    return updated;
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

      let nextState: any = 'COMPLETED';
      let nextQueueId = visit.queueId;
      let nextItinerary = visit.itinerary;

      if (Array.isArray(visit.itinerary)) {
        const currentIdx = visit.itinerary.findIndex((i: any) => i.status === 'ACTIVE');
        if (currentIdx !== -1) (visit.itinerary[currentIdx] as any).status = 'COMPLETED';
        
        const nextIdx = visit.itinerary.findIndex((i: any) => i.status === 'PENDING');
        if (nextIdx !== -1) {
          (visit.itinerary[nextIdx] as any).status = 'ACTIVE';
          nextQueueId = (visit.itinerary[nextIdx] as any).queueId;
          nextState = 'WAITING';
        }
        nextItinerary = visit.itinerary;
      }

      const updated = await tx.visit.update({
        where: { id },
        data: {
          currentState: nextState,
          completedAt: nextState === 'COMPLETED' ? new Date() : visit.completedAt,
          serviceEnd: new Date(),
          operatorId: operatorId || visit.operatorId,
          serviceStart: visit.serviceStart || new Date(),
          itinerary: nextItinerary as any,
          queueId: nextQueueId,
        },
      });

      if (nextState === 'COMPLETED') {
        const actualDurationMs = updated.completedAt!.getTime() - updated.serviceStart!.getTime();
        const actualDurationMins = Math.max(1, Math.round(actualDurationMs / 60000));
        
        const service = await tx.service.findUnique({ where: { id: updated.serviceId } });
        if (service) {
          const currentEma = service.emaExpectedDuration || service.expectedDuration || 30;
          const alpha = 0.2; 
          const newEma = (actualDurationMins * alpha) + (currentEma * (1 - alpha));
          
          await tx.service.update({
            where: { id: service.id },
            data: { emaExpectedDuration: parseFloat(newEma.toFixed(2)) }
          });
        }

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
      } else {
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
      }

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

  async cancelVisit(visitId: string, tenantId?: string, operatorId?: string, cancelledBy?: string, cancelReason?: string) {
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
          cancelledBy: cancelledBy || 'SYSTEM',
          cancelReason: cancelReason || null,
        },
      });

      await tx.outboxEvent.create({
        data: {
          type: 'VISIT_CANCELLED',
          payload: {
            visitId: updated.id,
            queueId: updated.queueId,
            tenantId: updated.tenantId,
            cancelledBy: updated.cancelledBy,
            cancelReason: updated.cancelReason,
          },
        },
      });

      return updated;
    });
  }

  async validateToken(
    tokenString: string,
    tenantId: string,
    locationId?: string,
  ) {
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
      checkedIn: visit.currentState !== 'SCHEDULED' && visit.currentState !== 'CREATED',
      checkInTime: visit.checkInTime,
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
      throw new BadRequestException(
        `Visit is already ${visit.currentState.toLowerCase()}`,
      );
    }

    const updated = await this.prisma.visit.update({
      where: { id: visit.id },
      data: { currentState: 'CANCELLED', cancelledBy: 'CUSTOMER' },
      include: { customer: true, queue: true, service: true, tenant: true },
    });

    await this.prisma.outboxEvent.create({
      data: {
        type: 'VISIT_CANCELLED',
        payload: {
          visitId: updated.id,
          queueId: updated.queueId,
          tenantId: updated.tenantId,
          cancelledBy: updated.cancelledBy,
        },
      },
    });

    await this.communicationService.publish(
      CommunicationEvent.QUEUE_CANCELLED,
      {
        tenantId: updated.tenantId,
        visitId: updated.id,
        oldState: visit.currentState,
        newState: 'CANCELLED',
        customerPhone: updated.customer?.phone,
        customerName: updated.customer?.name,
        queueName: updated.queue?.name,
      },
    );

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

  /**
   * Customer-submitted CSAT rating (public, validated by accessToken).
   * One-time only — silently ignores if already rated.
   * Looks up the visit by its unique accessToken UUID.
   */
  async rateVisit(
    accessToken: string,
    rating: number,
    feedbackText?: string,
  ) {
    const visit = await this.prisma.visit.findUnique({
      where: { accessToken },
      select: { id: true, rating: true, currentState: true },
    });

    if (!visit) throw new NotFoundException('Visit not found or invalid token');
    // Only allow rating completed visits; ignore if already rated
    if (visit.rating !== null) return { success: true, alreadyRated: true };
    if (visit.currentState !== 'COMPLETED') {
      return { success: false, message: 'Visit is not yet completed' };
    }

    const clampedRating = Math.min(5, Math.max(1, Math.round(rating)));
    await this.prisma.visit.update({
      where: { id: visit.id },
      data: {
        rating: clampedRating,
        feedbackText: feedbackText?.trim() || null,
      },
    });

    return { success: true, rating: clampedRating };
  }

  /**
   * Operator saves a note on a visit ticket (authenticated, tenant-scoped).
   */
  async updateNotes(visitId: string, tenantId: string, notes: string) {
    const visit = await this.prisma.visit.findFirst({
      where: { id: visitId, tenantId },
    });
    if (!visit) throw new NotFoundException('Visit not found');

    const updated = await this.prisma.visit.update({
      where: { id: visitId },
      data: { notes: notes?.trim() || null },
    });
    // Invalidate queue metrics on update
    this.redisService.client.del(`queue_metrics:${updated.queueId}`).catch(() => {});
    return updated;
  }

  async updateTags(id: string, tenantId: string, tags: string[]) {
    const visit = await this.findOne(id, tenantId);
    
    const updated = await this.prisma.visit.update({
      where: { id },
      data: { tags },
    });

    // Fire outbox event so UI updates instantly over socket
    await this.prisma.outboxEvent.create({
      data: {
        type: 'VISIT_UPDATED',
        payload: {
          visitId: id,
          queueId: visit.queueId,
          tenantId,
          updatedFields: ['tags'],
        },
      },
    });

    this.redisService.client.publish('outbox_events', 'WAKE_UP').catch(() => {});
    return updated;
  }
}
