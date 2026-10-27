import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  HttpException,
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
import { calculateAdvancedEWT } from '../utils/ewt.util';
import { getPhoneVariants } from '../common/phone.util';

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

  private async generateNextToken(
    locationId: string,
    prefix: string,
    timezone: string = 'UTC',
  ): Promise<string> {
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

  /**
   * Staff-initiated walk-in: finds (or uses provided) queue for the location+service,
   * then routes through joinQueue to guarantee flow steps are always instantiated.
   */
  async staffWalkIn(
    tenantId: string,
    operatorId: string,
    dto: {
      customerName: string;
      phone?: string;
      email?: string;
      age?: number;
      gender?: string;
      locationId: string;
      serviceId: string;
      queueId?: string;
      accompanyingGuests?: number;
      notes?: string;
      priority?: number;
      metadata?: Record<string, any>;
      formResponses?: Record<string, any>;
    },
  ) {
    // 1. Resolve queue: use provided queueId or find the first active queue at location that serves this service
    let resolvedQueueId = dto.queueId;
    if (!resolvedQueueId) {
      let queue = await this.prisma.queue.findFirst({
        where: {
          tenantId,
          locationId: dto.locationId,
          status: 'ACTIVE',
          services: { some: { id: dto.serviceId } },
        },
        orderBy: { createdAt: 'asc' },
      });
      if (!queue) {
        queue = await this.prisma.queue.findFirst({
          where: {
            tenantId,
            locationId: dto.locationId,
            status: { not: 'CLOSED' },
            services: { some: { id: dto.serviceId } },
          },
          orderBy: { createdAt: 'asc' },
        });
      }
      if (!queue) {
        throw new Error(
          'No open queue found for this location and service. Please open a queue first or specify one manually.',
        );
      }
      resolvedQueueId = queue.id;
    }

    // 2. Use joinQueue which handles: customer upsert, token generation, flow instantiation, outbox events
    const result = await this.joinQueue(resolvedQueueId, {
      name: dto.customerName,
      phone: dto.phone || null,
      serviceId: dto.serviceId,
      accompanyingGuests: dto.accompanyingGuests ?? 0,
      metadata: dto.metadata,
      formResponses: dto.formResponses,
    });

    // 3. Patch additional staff-only fields: email, age, gender, notes, priority, operatorId
    const updates: any = { operatorId };
    if (dto.notes) updates.notes = dto.notes;
    if (dto.priority !== undefined) updates.priority = dto.priority;
    if (dto.email || dto.age || dto.gender) {
      const existingMeta = (result.metadata as Record<string, any>) || {};
      const metaUpdate: any = { ...existingMeta };
      if (dto.age) metaUpdate.age = dto.age;
      if (dto.gender) metaUpdate.gender = dto.gender;
      updates.metadata = metaUpdate;
    }

    if (dto.email) {
      // Update customer email separately (joinQueue only takes phone)
      await this.prisma.customer
        .update({
          where: { id: result.customerId },
          data: { email: dto.email },
        })
        .catch(() => {}); // Non-critical, don't fail the walk-in
    }

    if (Object.keys(updates).length > 0) {
      await this.prisma.visit.update({
        where: { id: result.id },
        data: updates,
      });
    }

    return result;
  }

  async autoSweepStaleVisits(
    tenantId: string,
    locationId?: string,
    tzParam: string = 'UTC',
  ) {
    try {
      const zonedNow = toZonedTime(new Date(), tzParam);
      zonedNow.setHours(0, 0, 0, 0);
      const startOfDay = fromZonedTime(zonedNow, tzParam);

      const baseWhere: any = {
        tenantId,
      };
      if (locationId && locationId !== 'all') {
        baseWhere.locationId = locationId;
      }

      // 1. Stale WAITING / CHECKED_IN / ON_HOLD / CALLED visits created or waiting before today's start
      const staleVisits = await this.prisma.visit.findMany({
        where: {
          ...baseWhere,
          currentState: {
            in: [
              'WAITING',
              'CHECKED_IN',
              'ON_HOLD',
              'PENDING_PAYMENT',
              'CALLED',
            ],
          },
          AND: [
            { createdAt: { lt: startOfDay } },
            {
              OR: [
                { scheduledTime: null },
                { scheduledTime: { lt: startOfDay } },
              ],
            },
          ],
        },
        select: { id: true },
        take: 500,
      });

      if (staleVisits.length > 0) {
        const ids = staleVisits.map((v) => v.id);
        await this.prisma.visit.updateMany({
          where: { id: { in: ids } },
          data: {
            currentState: 'NO_SHOW',
            completedAt: null,
            cancelReason: 'Day Rollover / Unattended (Auto-closed)',
          },
        });
        this.logger.log(
          `[JIT Sweep] Auto-closed ${staleVisits.length} stale visits for tenant ${tenantId}`,
        );
      }

      // 2. Lingering IN_SERVICE visits created before today's start
      const lingeringInService = await this.prisma.visit.findMany({
        where: {
          ...baseWhere,
          currentState: 'IN_SERVICE',
          AND: [
            { createdAt: { lt: startOfDay } },
            {
              OR: [
                { serviceStart: null },
                { serviceStart: { lt: startOfDay } },
              ],
            },
          ],
        },
        select: { id: true },
        take: 100,
      });

      if (lingeringInService.length > 0) {
        const ids = lingeringInService.map((v) => v.id);
        await this.prisma.visit.updateMany({
          where: { id: { in: ids } },
          data: {
            currentState: 'COMPLETED',
            completedAt: startOfDay,
            cancelReason: 'Day Rollover Auto-Complete',
          },
        });
        this.logger.log(
          `[JIT Sweep] Auto-completed ${lingeringInService.length} lingering in-service visits for tenant ${tenantId}`,
        );
      }

      // 3. Past un-arrived SCHEDULED appointments
      const pastScheduledAppointments = await this.prisma.appointment.findMany({
        where: {
          ...baseWhere,
          status: 'SCHEDULED',
          scheduledEnd: { lt: startOfDay },
        },
        select: { id: true },
        take: 200,
      });

      if (pastScheduledAppointments.length > 0) {
        const apptIds = pastScheduledAppointments.map((a) => a.id);
        await this.prisma.appointment.updateMany({
          where: { id: { in: apptIds } },
          data: { status: 'NO_SHOW' },
        });
        await this.prisma.visit.updateMany({
          where: {
            appointmentId: { in: apptIds },
            currentState: { in: ['SCHEDULED', 'CREATED'] },
          },
          data: {
            currentState: 'NO_SHOW',
            completedAt: null,
            cancelReason: 'Appointment expired (No-Show)',
          },
        });
        this.logger.log(
          `[JIT Sweep] Auto-marked ${pastScheduledAppointments.length} past appointments as NO_SHOW for tenant ${tenantId}`,
        );
      }
    } catch (e) {
      this.logger.warn(`Failed during JIT auto-sweep for tenant ${tenantId}: ${e}`);
    }
  }

  async findAll(
    userTokenPayload: any,
    scope?: 'today' | 'history' | 'analytics' | 'records',
    locationId?: string,
    queueId?: string,
    tzParam?: string,
    timeframe?: string,
    startDate?: string,
    endDate?: string,
    serviceId?: string,
    page?: string,
    limit?: string,
    search?: string,
    rating?: string,
    status?: string,
  ) {
    const where: any = { tenantId: userTokenPayload.tenantId };
    if (locationId) {
      where.locationId = locationId;
    }
    if (queueId) {
      where.queueId = queueId;
    }
    if (serviceId) {
      where.serviceId = serviceId;
    }
    if (status) {
      if (status === 'ACTIVE') {
        where.currentState = {
          in: ['WAITING', 'IN_SERVICE', 'CALLED', 'CHECKED_IN', 'ON_HOLD'],
        };
      } else {
        where.currentState = status;
      }
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
        where.serviceId = { in: user.allowedServiceIds };
      }
    }
    if (scope === 'today') {
      const tz = tzParam || 'UTC';
      // Trigger JIT lazy auto-sweep to clean up any past days' lingering visits or appointments
      await this.autoSweepStaleVisits(
        userTokenPayload.tenantId,
        locationId,
        tz,
      );

      const zonedNow = toZonedTime(new Date(), tz);
      zonedNow.setHours(0, 0, 0, 0);
      const start = fromZonedTime(zonedNow, tz);

      const zonedEnd = toZonedTime(new Date(), tz);
      zonedEnd.setHours(23, 59, 59, 999);
      const end = fromZonedTime(zonedEnd, tz);

      // A visit belongs to today's operational view if:
      // 1. It is scheduled for today
      // 2. OR it is a walk-in created today without a scheduledTime
      // 3. OR it checked in, arrived, started, or completed today
      // 4. OR it is actively waiting or in service AND originated or checked in within today's window
      where.OR = [
        { scheduledTime: { gte: start, lte: end } },
        { scheduledTime: null, createdAt: { gte: start, lte: end } },
        { checkInTime: { gte: start, lte: end } },
        { actualArrival: { gte: start, lte: end } },
        { serviceStart: { gte: start, lte: end } },
        {
          completedAt: { gte: start, lte: end },
          currentState: 'COMPLETED',
          OR: [
            { createdAt: { gte: start, lte: end } },
            { checkInTime: { gte: start, lte: end } },
            { serviceStart: { gte: start, lte: end } },
            { scheduledTime: { gte: start, lte: end } },
          ],
        },
        {
          currentState: {
            in: [
              'WAITING',
              'IN_SERVICE',
              'CALLED',
              'CHECKED_IN',
              'ON_HOLD',
              'PENDING_PAYMENT',
            ],
          },
          OR: [
            { waitingStart: { gte: start, lte: end } },
            { checkInTime: { gte: start, lte: end } },
            { scheduledTime: { gte: start, lte: end } },
            { createdAt: { gte: start, lte: end } },
          ],
        },
      ];

      // Exclude future scheduled appointments that have not yet arrived
      where.NOT = {
        AND: [
          { currentState: { in: ['SCHEDULED', 'CREATED'] } },
          { scheduledTime: { gt: end } },
        ],
      };
    } else {
      if (scope === 'history') {
        where.currentState = { in: ['COMPLETED', 'NO_SHOW', 'CANCELLED'] };
      }

      const tz = tzParam || 'UTC';
      let start: Date | undefined;
      let end: Date | undefined;

      if (startDate && endDate) {
        const startParsed = new Date(startDate);
        const endParsed = new Date(endDate);
        const zonedStart = toZonedTime(startParsed, tz);
        zonedStart.setHours(0, 0, 0, 0);
        start = fromZonedTime(zonedStart, tz);

        const zonedEnd = toZonedTime(endParsed, tz);
        zonedEnd.setHours(23, 59, 59, 999);
        end = fromZonedTime(zonedEnd, tz);
      } else if (startDate) {
        const startParsed = new Date(startDate);
        const zonedStart = toZonedTime(startParsed, tz);
        zonedStart.setHours(0, 0, 0, 0);
        start = fromZonedTime(zonedStart, tz);

        const zonedEnd = toZonedTime(startParsed, tz);
        zonedEnd.setHours(23, 59, 59, 999);
        end = fromZonedTime(zonedEnd, tz);
      } else if (timeframe) {
        const zonedNow = toZonedTime(new Date(), tz);
        zonedNow.setHours(0, 0, 0, 0);

        if (timeframe === 'today') {
          start = fromZonedTime(zonedNow, tz);
          const zonedEnd = toZonedTime(new Date(), tz);
          zonedEnd.setHours(23, 59, 59, 999);
          end = fromZonedTime(zonedEnd, tz);
        } else if (timeframe === '7d' || timeframe === 'week') {
          zonedNow.setDate(zonedNow.getDate() - 6);
          start = fromZonedTime(zonedNow, tz);
        } else if (timeframe === '30d' || timeframe === 'month') {
          zonedNow.setDate(zonedNow.getDate() - 29);
          start = fromZonedTime(zonedNow, tz);
        } else if (timeframe === 'year' || timeframe === '1y') {
          const zonedStartOfYear = toZonedTime(new Date(), tz);
          zonedStartOfYear.setMonth(zonedStartOfYear.getMonth() - 11, 1);
          zonedStartOfYear.setHours(0, 0, 0, 0);
          start = fromZonedTime(zonedStartOfYear, tz);
        }
      }

      if (start && end) {
        where.OR = [
          { completedAt: { gte: start, lte: end } },
          { checkInTime: { gte: start, lte: end } },
          { serviceStart: { gte: start, lte: end } },
          { scheduledTime: { gte: start, lte: end } },
          { createdAt: { gte: start, lte: end } },
        ];
      } else if (start) {
        where.OR = [
          { completedAt: { gte: start } },
          { checkInTime: { gte: start } },
          { serviceStart: { gte: start } },
          { scheduledTime: { gte: start } },
          { createdAt: { gte: start } },
        ];
      }
    }

    if (search && search.trim()) {
      const q = search.trim();
      const searchConditions = [
        { displayId: { contains: q, mode: 'insensitive' } },
        { customer: { name: { contains: q, mode: 'insensitive' } } },
        { customer: { phone: { contains: q, mode: 'insensitive' } } },
        { customer: { email: { contains: q, mode: 'insensitive' } } },
      ];
      if (where.OR) {
        where.AND = [
          ...(where.AND || []),
          { OR: where.OR },
          { OR: searchConditions },
        ];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    if (rating) {
      if (rating === 'reviewed') {
        where.rating = { not: null };
      } else if (rating === 'has_comment') {
        where.feedbackText = { not: null };
      } else {
        const star = parseInt(rating, 10);
        if (!isNaN(star) && star >= 1 && star <= 5) {
          where.rating = star;
        }
      }
    }

    const pageNum = parseInt(page || '1', 10) || 1;
    // Set a high default limit if pagination is implicitly bypassed (records or analytics)
    const limitNum =
      parseInt(
        limit || (scope === 'analytics' || scope === 'records' ? '1000' : '100'),
        10,
      ) || 100;
    const skip = (pageNum - 1) * limitNum;

    const [total, data] = await Promise.all([
      this.prisma.visit.count({ where }),
      this.prisma.visit.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          customer: true,
          service: { include: { serviceFlow: true } },
          location: true,
          queue: true,
          operatorUser: {
            select: { id: true, email: true, personalSettings: true },
          },
          bookingPayments: true,
          clinicalNotes: true,
          prescriptions: true,
          visitSteps: {
            include: { templateStep: true },
            orderBy: { stepOrder: 'asc' },
          },
        },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async findOne(id: string, tenantId: string) {
    const visit = await this.prisma.visit.findFirst({
      where: {
        tenantId,
        OR: [
          { id },
          { accessToken: id },
          { displayId: { equals: id, mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        service: { include: { serviceFlow: true } },
        queue: { include: { location: true } },
        location: true,
        bookingPayments: true,
        visitSteps: {
          include: { templateStep: true },
          orderBy: { stepOrder: 'asc' },
        },
      },
    });
    if (!visit) throw new NotFoundException(`Visit with ID ${id} not found`);
    (visit as any).steps = (visit as any).visitSteps;
    return visit;
  }

  async findVisitsByPhone(phone: string) {
    const { variants, digits } = getPhoneVariants(phone);
    const conditions: any[] = [{ phone: { in: variants } }];
    if (digits.length >= 7) {
      conditions.push({ phone: { contains: digits.slice(-10) } });
    }

    return this.prisma.visit.findMany({
      where: { customer: { OR: conditions } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        accessToken: true,
        displayId: true,
        currentState: true,
        scheduledTime: true,
        waitingStart: true,
        service: { select: { name: true } },
        queue: { select: { name: true, location: { select: { name: true } } } },
        tenant: { select: { name: true } },
      },
    });
  }

  async findOnePublic(accessToken: string) {
    const visit = await this.prisma.visit.findFirst({
      where: {
        OR: [{ accessToken }, { id: accessToken }],
      },
      select: {
        id: true,
        queueId: true,
        serviceId: true,
        displayId: true,
        accessToken: true,
        currentState: true,
        waitingStart: true,
        createdAt: true,
        rating: true,
        feedbackText: true,
        customer: { select: { name: true } },
        service: {
          select: {
            name: true,
            expectedDuration: true,
            requireManualCheckIn: true,
            basePrice: true,
            priceCurrency: true,
            serviceFlow: {
              select: {
                isActive: true,
                paymentTiming: true,
                checkinPayMode: true,
                autoSendInvoice: true,
                allowUnpaidCheckout: true,
              },
            },
          },
        },
        queue: { select: { name: true, status: true } },
        location: { select: { name: true, address: true } },
        bookingPayments: {
          select: {
            id: true,
            status: true,
            amount: true,
            currency: true,
            method: true,
            createdAt: true,
          },
        },
        scheduledTime: true,
        language: true,
        tenant: {
          select: {
            id: true,
            name: true,
            paymentAccount: {
              select: { connectedAccountId: true, chargesEnabled: true },
            },
          },
        },
        visitSteps: {
          select: {
            id: true,
            stepOrder: true,
            name: true,
            type: true,
            status: true,
            formData: true,
            templateStep: {
              select: {
                type: true,
                isOptional: true,
                customerInstruction: true,
                locationDescription: true,
                floorNumber: true,
                roomNumber: true,
                buildingWing: true,
                stepPrice: true,
                stepPriceCurrency: true,
                isPriceVariable: true,
                customerView: true,
                notifyCustomerOnActivation: true,
              },
            },
            amountCharged: true,
            paymentStatus: true,
          },
          orderBy: { stepOrder: 'asc' },
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

      ewt = await calculateAdvancedEWT(
        this.prisma,
        visit.queueId,
        visit.serviceId,
        waitingAhead,
        visit.service?.expectedDuration,
      );
    }

    return {
      token: {
        ...visit,
        status: visit.currentState,
        customerName: visit.customer?.name,
        scheduledFor: visit.scheduledTime,
        checkedIn: visit.currentState !== 'SCHEDULED',
        queue: {
          name: visit.queue?.name,
          status: visit.queue?.status,
          requireManualCheckIn: visit.service?.requireManualCheckIn || false,
        },
      },
      position,
      estimatedWaitTime: ewt,
      isScheduled: !!visit.scheduledTime,
      isQueuePaused:
        visit.queue?.status === 'PAUSED' ||
        visit.queue?.status === 'PAUSED_FOR_EMERGENCY',
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
        service: {
          select: {
            id: true,
            name: true,
            expectedDuration: true,
            emaExpectedDuration: true,
          },
        },
        location: { select: { name: true, address: true } },
        tenant: { select: { name: true } },
        queue: { select: { status: true } },
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
                stepPrice: true,
                stepPriceCurrency: true,
                isPriceVariable: true,
              },
            },
            amountCharged: true,
            paymentStatus: true,
          },
          orderBy: { stepOrder: 'asc' },
        },
      },
    });

    return Promise.all(
      visits.map(async (visit) => {
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
          ewt = await calculateAdvancedEWT(
            this.prisma,
            visit.queueId,
            visit.service?.id || null,
            waitingAhead,
            visit.service?.expectedDuration,
          );
        }

        return {
          ...visit,
          position,
          estimatedWaitTime: ewt,
          isScheduled: !!visit.scheduledTime,
        };
      }),
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
    customerData: {
      name: string;
      phone?: string | null;
      serviceId?: string;
      accompanyingGuests?: number;
      metadata?: Record<string, any>;
      formResponses?: Record<string, any>;
    },
  ) {
    const queue = await this.prisma.queue.findUnique({
      where: { id: queueId },
      include: { services: true, location: true },
    });

    if (!queue) throw new NotFoundException('Queue not found');
    if (!queue.services || queue.services.length === 0) {
      throw new BadRequestException('Queue has no linked services');
    }

    if (queue.status === 'CLOSED') {
      throw new BadRequestException('QUEUE_CLOSED');
    }

    const isBlocked = await this.blockOffService.isTimeBlocked(
      queue.tenantId,
      queue.locationId,
      queue.id,
      new Date(),
    );
    if (isBlocked.blocked) {
      throw new BadRequestException(`QUEUE_BLOCKED:${isBlocked.reason}`);
    }

    if (queue.maxCapacity && queue.maxCapacity > 0) {
      const activeCount = await this.prisma.visit.count({
        where: {
          queueId,
          currentState: { in: ['WAITING', 'CHECKED_IN'] },
        },
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
      const displayId = await this.generateNextToken(
        locationId,
        prefix,
        queue.location?.timezone || 'UTC',
      );

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
            ...(customerData.metadata || {}),
          },
          formResponses: customerData.formResponses || undefined,
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

      if (visit.serviceId) {
        await this.visitStepService.instantiateStepsForVisit(
          visit.tenantId,
          visit.id,
          visit.serviceId,
          {
            accompanyingGuests: visit.accompanyingGuests || 0,
            metadata: (visit.metadata as Record<string, any>) || undefined,
            formResponses:
              (visit.formResponses as Record<string, any>) || undefined,
          },
          tx,
        );
      }

      return visit;
    });

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

        const q = await tx.queue.findUnique({
          where: { id: queueId },
          include: { location: true },
        });
        const config = (q?.tokenDisplayConfig as any) || {};
        const prefix = config.prefix || 'Q';
        const displayId = await this.generateNextToken(
          q?.locationId || 'unknown',
          prefix,
          q?.location?.timezone || 'UTC',
        );

        let scheduledTime: Date | undefined;
        let currentState = 'WAITING';

        if (booking.scheduledFor && service.allowAppointments) {
          scheduledTime = new Date(booking.scheduledFor);
          currentState = service.requireManualCheckIn ? 'CREATED' : 'SCHEDULED';
        }

        // Flow-level payment timing (CHECKIN | CHECKOUT | NONE) overrides the
        // legacy service-level payment mode when an active flow exists.
        const bookingFlow = await tx.serviceFlow.findUnique({
          where: { serviceId: service.id },
          select: { isActive: true, paymentTiming: true, checkinPayMode: true },
        });
        const paymentAccount = await tx.tenantPaymentAccount.findUnique({
          where: { tenantId: service.tenantId },
          select: { chargesEnabled: true, connectedAccountId: true },
        });
        const stripeActive =
          !!paymentAccount?.chargesEnabled &&
          !!paymentAccount?.connectedAccountId;
        const payMode = bookingFlow?.checkinPayMode ?? 'BOTH';

        const holdForCheckinPayment = bookingFlow?.isActive
          ? bookingFlow.paymentTiming === 'CHECKIN' &&
            (service.basePrice ?? 0) > 0 &&
            payMode !== 'COUNTER_ONLY' &&
            stripeActive
          : (service.paymentMode === 'PREPAY' ||
              service.paymentMode === 'OPTIONAL_PREPAY' ||
              service.paymentMode === 'PAY_AT_SERVICE') &&
            (service.basePrice ?? 0) > 0 &&
            stripeActive;

        if (holdForCheckinPayment && !(data as any).paymentId) {
          currentState = 'PENDING_PAYMENT';
        }

        if (scheduledTime) {
          // Verify that this slot is actually valid within business hours
          // Timezone manipulation makes the simple string split unreliable if UTC date falls on previous day.
          // Let getAvailableSlots handle the raw date lookup using its internal timezone logic.
          const localDateStr = new Intl.DateTimeFormat('en-CA', {
            timeZone: service.location?.timezone || 'UTC',
          }).format(scheduledTime);
          const availableSlots = await this.serviceService.getAvailableSlots(
            service.id,
            localDateStr,
          );
          const requestedSlot = scheduledTime.toISOString();

          if (
            !availableSlots.some((s) => s.time === requestedSlot && s.available)
          ) {
            throw new BadRequestException(
              `The selected time slot is outside of operational hours or invalid for service ${service.name}`,
            );
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
          const isOpenNow = await this.serviceService.isServiceOpen(
            service,
            new Date(),
          );
          if (!isOpenNow) {
            throw new BadRequestException(
              `Service ${service.name} is currently closed.`,
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
            source: scheduledTime ? 'APPOINTMENT' : 'WALK_IN',
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

        if (visit.serviceId) {
          await this.visitStepService.instantiateStepsForVisit(
            visit.tenantId,
            visit.id,
            visit.serviceId,
            { accompanyingGuests: visit.accompanyingGuests || 0 },
            tx,
          );
        }

        visits.push({
          ...visit,
          flow: bookingFlow
            ? {
                paymentTiming: bookingFlow.paymentTiming,
                checkinPayMode: bookingFlow.checkinPayMode,
                stripeEnabled: stripeActive,
              }
            : null,
        });
      }

      return visits;
    });

    // Zero-Latency Event Streaming: Wake up the outbox processor immediately
    this.redisService.client
      .publish('outbox_events', 'WAKE_UP')
      .catch((e) => console.error('Failed to publish outbox wake-up event', e));

    return result;
  }

  async advanceTurn(queueId: string, operatorId?: string) {
    return this.prisma.$transaction(async (tx) => {
      let operatorSkills: string[] = [];
      if (operatorId) {
        const user = await tx.user.findUnique({
          where: { id: operatorId },
          select: { skills: true },
        });
        if (user && user.skills) {
          operatorSkills = user.skills;
        }
      }

      const waitingVisits = await tx.visit.findMany({
        where: { queueId, currentState: { in: ['WAITING', 'CHECKED_IN'] } },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        include: {
          service: { select: { requiredSkills: true, name: true } },
          customer: { select: { name: true } },
          queue: { select: { name: true } },
        },
      });

      if (waitingVisits.length === 0) return null; // Queue is empty

      let selectedVisit = waitingVisits[0];

      // Skill-based matchmaking: Try to find the highest-priority visit that the operator is qualified for
      if (operatorSkills.length > 0) {
        const qualifiedVisit = waitingVisits.find((v) => {
          const req = v.service?.requiredSkills || [];
          if (req.length === 0) return true; // No skills required
          return req.every((skill) => operatorSkills.includes(skill));
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
      // Contextual Flow Support: activate the first pending step
      await this.visitStepService.activateFirstPendingStep(
        visit.tenantId,
        visit.id,
        operatorId,
      );

      await tx.outboxEvent.create({
        data: {
          type: 'VISIT_CALLED',
          payload: {
            visitId: visit.id,
            queueId,
            tenantId: visit.tenantId,
            displayId: visit.displayId,
            customerName: selectedVisit.customer?.name,
            serviceName: selectedVisit.service?.name,
            queueName: selectedVisit.queue?.name,
          },
        },
      });

      return visit;
    });
  }

  async checkInAppointment(appointmentId: string, tenantId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId, tenantId },
      include: { customer: true, location: true },
    });

    if (!appointment) throw new NotFoundException('Appointment not found');

    if (
      appointment.status === 'CHECKED_IN' ||
      appointment.status === 'COMPLETED'
    ) {
      throw new ConflictException(
        `Appointment is already ${appointment.status}`,
      );
    }

    let visit = await this.prisma.visit.findFirst({
      where: { appointmentId: appointment.id },
    });

    if (!visit) {
      const service = await this.prisma.service.findUnique({
        where: { id: appointment.serviceId },
        include: { queues: true },
      });

      const activeQueues =
        service?.queues.filter((q: any) => q.status === 'ACTIVE') || [];
      if (activeQueues.length === 0) {
        throw new BadRequestException(
          'No active queue found for this service to check-in.',
        );
      }
      const queueId = activeQueues[0].id;

      const q = await this.prisma.queue.findUnique({
        where: { id: queueId },
        include: { location: true },
      });
      const config = (q?.tokenDisplayConfig as any) || {};
      const prefix = config.prefix || 'Q';
      const displayId = await this.generateNextToken(
        q?.locationId || 'unknown',
        prefix,
        q?.location?.timezone || 'UTC',
      );

      let customerId = appointment.customerId;
      if (!customerId) {
        const newCust = await this.prisma.customer.create({
          data: { tenantId, name: 'Walk-in / Guest' },
        });
        customerId = newCust.id;
      }

      visit = await this.prisma.$transaction(async (tx) => {
        const v = await tx.visit.create({
          data: {
            tenantId,
            customerId: customerId!,
            appointmentId: appointment.id,
            locationId: appointment.locationId,
            queueId,
            serviceId: appointment.serviceId,
            displayId,
            assignedStaffId: appointment.staffId,
            currentState: 'CHECKED_IN',
            scheduledTime: appointment.scheduledStart,
            checkInTime: new Date(),
            waitingStart: new Date(),
            priority: 10,
            source: 'APPOINTMENT',
            language: 'en',
            metadata: {
              customerName: appointment.customer?.name,
              phone: appointment.customer?.phone,
            },
          },
        });

        await tx.outboxEvent.create({
          data: {
            type: 'VISIT_CREATED',
            payload: { visitId: v.id, queueId, tenantId, displayId },
          },
        });

        await tx.outboxEvent.create({
          data: {
            type: 'VISIT_CHECKED_IN',
            payload: {
              visitId: v.id,
              queueId: v.queueId,
              tenantId: v.tenantId,
              source: 'RECEPTIONIST',
            },
          },
        });

        if (v.serviceId) {
          await this.visitStepService.instantiateStepsForVisit(
            v.tenantId,
            v.id,
            v.serviceId,
            { accompanyingGuests: 0 },
            tx,
          );
        }

        return v;
      });

      this.redisService.client
        .publish('outbox_events', 'WAKE_UP')
        .catch((e: any) =>
          console.error('Failed to publish outbox wake-up event', e),
        );
    } else {
      await this.checkIn(visit.id, tenantId);
    }

    await this.appointmentService.update(appointment.id, tenantId, {
      status: 'CHECKED_IN',
    });

    return visit;
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
        where: { id: visit.id },
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

      if (u.serviceId) {
        await this.visitStepService.instantiateStepsForVisit(
          u.tenantId,
          u.id,
          u.serviceId,
          { accompanyingGuests: u.accompanyingGuests || 0 },
          tx,
        );
      }

      return u;
    });

    // Send WhatsApp confirmation to the customer (receptionist scan flow)
    try {
      const fullVisit = await this.prisma.visit.findUnique({
        where: { id },
        include: {
          customer: { select: { name: true, phone: true } },
          service: {
            select: {
              name: true,
              expectedDuration: true,
              emaExpectedDuration: true,
            },
          },
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
        const ewt =
          waitingAhead *
          (fullVisit?.service?.emaExpectedDuration ||
            fullVisit?.service?.expectedDuration ||
            5);
        const statusUrl = `${process.env.NEXT_PUBLIC_APP_URL || `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.qmova.yqbuddy.com'}`}/customer/status/${updated.accessToken}`;
        const msg =
          `✅ Reception confirmed your arrival at *${fullVisit?.location?.name || fullVisit?.tenant?.name}*!\n\n` +
          `📋 Booking: *${fullVisit?.service?.name}*\n` +
          `🔢 Your position: *#${position}*\n` +
          (ewt > 0 ? `⏱ Estimated wait: *${ewt} mins*\n\n` : '\n') +
          `Track live: ${statusUrl}`;
        await this.whatsappService
          .sendToTenant(tenantId, phone, msg)
          .catch(() => {});
      }
    } catch (e) {
      this.logger.warn(
        `WhatsApp receptionist check-in notification failed: ${e.message}`,
      );
    }

    return updated;
  }

  async startService(id: string, tenantId: string, operatorId?: string) {
    const visit = await this.prisma.visit.findFirst({
      where: { id, tenantId },
      include: {
        customer: { select: { name: true } },
        service: { select: { name: true } },
        queue: { select: { name: true } },
      },
    });
    if (!visit) throw new NotFoundException(`Visit with ID ${id} not found`);
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
        data: {
          currentState: 'IN_SERVICE',
          serviceStart: new Date(),
          operatorId: operatorId || undefined,
        },
      });
      // Contextual Flow Support: activate the first pending step
      await this.visitStepService.activateFirstPendingStep(
        updated.tenantId,
        updated.id,
        operatorId,
      );

      await tx.outboxEvent.create({
        data: {
          type: 'VISIT_STARTED',
          payload: {
            visitId: updated.id,
            queueId: updated.queueId,
            tenantId: updated.tenantId,
            displayId: updated.displayId,
            customerName: visit.customer?.name,
            serviceName: visit.service?.name,
            queueName: visit.queue?.name,
            currentState: 'IN_SERVICE',
          },
        },
      });

      return updated;
    });
  }

  /**
   * Announce-only: fires a VISIT_CALLED outbox event (TV display + WhatsApp
   * "It's your turn" notification) WITHOUT changing the visit state.
   * Receptionist uses this to call a customer to the desk before formally
   * starting service (e.g., to verify ID or scan QR first).
   */
  async announceVisit(id: string, tenantId: string) {
    const visit = await this.prisma.visit.findFirst({
      where: { id, tenantId },
      include: {
        customer: { select: { name: true, phone: true } },
        service: { select: { name: true } },
        queue: { select: { name: true } },
        tenant: {
          select: {
            id: true,
            whatsappConnected: true,
            whatsappInstanceId: true,
          },
        },
      },
    });
    if (!visit) throw new NotFoundException(`Visit with ID ${id} not found`);
    if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(visit.currentState)) {
      throw new ConflictException(
        `Cannot announce a ${visit.currentState} visit`,
      );
    }

    await this.prisma.outboxEvent.create({
      data: {
        type: 'VISIT_CALLED',
        payload: {
          visitId: visit.id,
          queueId: visit.queueId,
          tenantId: visit.tenantId,
          displayId: visit.displayId,
          customerName: visit.customer?.name,
          serviceName: visit.service?.name,
          queueName: visit.queue?.name,
          announceOnly: true,
        },
      },
    });

    const isWhatsappConnected = Boolean(
      visit.tenant?.whatsappConnected && visit.tenant?.whatsappInstanceId,
    );

    return {
      success: true,
      announced: true,
      visitId: id,
      displayId: visit.displayId,
      customerName: visit.customer?.name,
      whatsappConnected: isWhatsappConnected,
      hasCustomerPhone: Boolean(visit.customer?.phone),
      whatsappSent: isWhatsappConnected && Boolean(visit.customer?.phone),
    };
  }

  /**
   * Builds the bill for a visit: line items (snapshot taken at booking, falling
   * back to the service base price), amount paid so far and balance due.
   */
  async getVisitBill(id: string, tenantId?: string) {
    const visit = await this.prisma.visit.findUnique({
      where: { id },
      include: {
        service: true,
        flow: {
          select: {
            paymentTiming: true,
            autoSendInvoice: true,
            allowUnpaidCheckout: true,
          },
        },
      },
    });
    if (!visit || (tenantId && visit.tenantId !== tenantId)) {
      throw new NotFoundException('Visit not found');
    }

    const snapshot = Array.isArray(visit.lineItems)
      ? (visit.lineItems as any[])
      : [];
    const items = snapshot.length
      ? snapshot.map((i) => ({
          name: String(i.name),
          quantity: Number(i.quantity ?? 1),
          unitPrice: Number(i.unitPrice ?? 0),
        }))
      : (visit.service.basePrice ?? 0) > 0
        ? [
            {
              name: visit.service.name,
              quantity: 1,
              unitPrice: visit.service.basePrice as number,
            },
          ]
        : [];

    const total = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const payments = await this.prisma.bookingPayment.findMany({
      where: { visitId: id, status: 'SUCCEEDED' },
      select: { amount: true, refundedAmount: true },
    });
    const paid = payments.reduce(
      (s, p) => s + p.amount - (p.refundedAmount || 0),
      0,
    );

    return {
      visitId: id,
      currency: visit.service.priceCurrency || 'ZAR',
      items,
      total,
      paid,
      balanceDue: Math.max(0, total - paid),
      paymentTiming: visit.flow?.paymentTiming ?? null,
      autoSendInvoice: visit.flow?.autoSendInvoice ?? false,
      allowUnpaidCheckout: visit.flow?.allowUnpaidCheckout ?? false,
    };
  }

  async completeService(
    id: string,
    tenantId?: string,
    operatorId?: string,
    opts: { allowUnpaid?: boolean; forceComplete?: boolean } = {},
  ) {
    // 1. Pre-flight check: Is this a SEF (Service Execution Flow) visit?
    const visitPreCheck = await this.prisma.visit.findUnique({
      where: { id },
      include: {
        visitSteps: {
          where: { status: { in: ['ACTIVE', 'PENDING', 'DEFERRED'] } },
          orderBy: { stepOrder: 'asc' },
        },
        flow: { select: { paymentTiming: true, allowUnpaidCheckout: true } },
      },
    });

    if (!visitPreCheck) throw new NotFoundException('Visit not found');
    if (tenantId && visitPreCheck.tenantId !== tenantId) {
      throw new NotFoundException('Visit not found');
    }

    if (
      visitPreCheck.currentState === 'COMPLETED' ||
      visitPreCheck.currentState === 'MISSED' ||
      visitPreCheck.currentState === 'CANCELLED'
    ) {
      throw new BadRequestException(
        `Visit is already ${visitPreCheck.currentState.toLowerCase()}`,
      );
    }

    // 1b. Checkout payment gate: only on the final step of a CHECKOUT-payment flow.
    if (visitPreCheck.flow?.paymentTiming === 'CHECKOUT') {
      const isFinal = visitPreCheck.visitSteps.length <= 1;
      if (isFinal) {
        const bill = await this.getVisitBill(id, tenantId);
        if (bill.balanceDue > 0) {
          const unpaidAllowed =
            opts.allowUnpaid && visitPreCheck.flow.allowUnpaidCheckout;
          if (!unpaidAllowed) {
            throw new HttpException(
              {
                statusCode: 402,
                code: 'PAYMENT_REQUIRED',
                message: 'Payment pending',
                bill,
              },
              402,
            );
          }
          await this.prisma.visit.update({
            where: { id },
            data: { balanceDue: bill.balanceDue },
          });
        }
      }
    }

    // 2. If it is a SEF visit and explicitly requested to advance only (forceComplete === false)
    if (
      opts.forceComplete === false &&
      visitPreCheck.visitSteps &&
      visitPreCheck.visitSteps.length > 0
    ) {
      // Find the first active/actionable step and advance it
      const activeStep =
        visitPreCheck.visitSteps.find((s) => s.status === 'ACTIVE') ||
        visitPreCheck.visitSteps[0];
      if (activeStep) {
        // This handles completion, transition, and visit updates automatically
        await this.visitStepService.advanceStep(
          visitPreCheck.tenantId,
          activeStep.id,
          operatorId || 'SYSTEM',
          {},
        );
        return this.prisma.visit.findUnique({ where: { id } });
      }
    }

    // 3. Complete the visit (and resolve any pending SEF steps)
    const result = await this.prisma.$transaction(async (tx) => {
      if (visitPreCheck.visitSteps && visitPreCheck.visitSteps.length > 0) {
        // Complete any active steps
        await tx.visitStep.updateMany({
          where: { visitId: id, status: 'ACTIVE' },
          data: { status: 'DONE', completedAt: new Date() },
        });
        // Skip any remaining uncompleted steps
        await tx.visitStep.updateMany({
          where: {
            visitId: id,
            status: { in: ['PENDING', 'QUEUED', 'DEFERRED', 'LOCKED'] },
          },
          data: {
            status: 'SKIPPED',
            staffNotes: 'Visit completed early by staff',
          },
        });
      }

      const visit = await tx.visit.findUnique({
        where: { id },
      });
      if (!visit) throw new NotFoundException('Visit not found');

      let nextState: any = 'COMPLETED';
      let nextQueueId = visit.queueId;
      let nextItinerary = visit.itinerary;

      if (Array.isArray(visit.itinerary)) {
        const currentIdx = visit.itinerary.findIndex(
          (i: any) => i.status === 'ACTIVE',
        );
        if (currentIdx !== -1)
          (visit.itinerary[currentIdx] as any).status = 'COMPLETED';

        if (opts.forceComplete === false) {
          const nextIdx = visit.itinerary.findIndex(
            (i: any) => i.status === 'PENDING',
          );
          if (nextIdx !== -1) {
            (visit.itinerary[nextIdx] as any).status = 'ACTIVE';
            nextQueueId = (visit.itinerary[nextIdx] as any).queueId;
            nextState = 'WAITING';
          }
        } else {
          // Conclude all stages in itinerary
          for (let i = 0; i < visit.itinerary.length; i++) {
            if ((visit.itinerary[i] as any).status === 'PENDING') {
              (visit.itinerary[i] as any).status = 'SKIPPED';
            }
          }
          nextState = 'COMPLETED';
        }
        nextItinerary = visit.itinerary;
      }

      const updated = await tx.visit.update({
        where: { id },
        data: {
          currentState: nextState,
          completedAt:
            nextState === 'COMPLETED' ? new Date() : visit.completedAt,
          serviceEnd: new Date(),
          operatorId: operatorId || visit.operatorId,
          serviceStart: visit.serviceStart || new Date(),
          itinerary: nextItinerary as any,
          queueId: nextQueueId,
          currentStepId: nextState === 'COMPLETED' ? null : visit.currentStepId,
        },
      });

      if (nextState === 'COMPLETED') {
        const actualDurationMs =
          updated.completedAt!.getTime() - updated.serviceStart!.getTime();
        const actualDurationMins = Math.max(
          1,
          Math.round(actualDurationMs / 60000),
        );

        const service = await tx.service.findUnique({
          where: { id: updated.serviceId },
        });
        if (service) {
          const currentEma =
            service.emaExpectedDuration || service.expectedDuration || 30;
          const alpha = 0.2;
          const newEma = actualDurationMins * alpha + currentEma * (1 - alpha);

          await tx.service.update({
            where: { id: service.id },
            data: { emaExpectedDuration: parseFloat(newEma.toFixed(2)) },
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
        await tx.outboxEvent.create({
          data: {
            type: 'VISIT_UPDATED',
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

  async cancelVisit(
    visitId: string,
    tenantId?: string,
    operatorId?: string,
    cancelledBy?: string,
    cancelReason?: string,
    options?: {
      reasonCategory?: string;
      notes?: string;
      refundApplicable?: boolean;
      customMessage?: string;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const visit = await tx.visit.findUnique({
        where: { id: visitId },
        include: { customer: true, queue: true, service: true, location: true },
      });
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

      const formattedReason =
        cancelReason ||
        options?.notes ||
        options?.customMessage ||
        'Cancelled by staff';

      const existingMeta =
        typeof visit.metadata === 'object' && visit.metadata !== null
          ? (visit.metadata as Record<string, any>)
          : {};

      const updated = await tx.visit.update({
        where: { id: visitId },
        data: {
          currentState: 'CANCELLED',
          completedAt: new Date(),
          operatorId: operatorId || visit.operatorId,
          cancelledBy: cancelledBy || 'MANAGER',
          cancelReason: formattedReason,
          metadata: {
            ...existingMeta,
            cancellation: {
              reason: formattedReason,
              category: options?.reasonCategory || 'OTHER',
              notes: options?.notes || null,
              refundApplicable: !!options?.refundApplicable,
              cancelledAt: new Date().toISOString(),
              cancelledBy: cancelledBy || 'MANAGER',
            },
          },
        },
        include: { customer: true, queue: true, service: true, location: true },
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
            reasonCategory: options?.reasonCategory,
            refundApplicable: !!options?.refundApplicable,
            customMessage: options?.customMessage || options?.notes,
          },
        },
      });

      // Also dispatch to communicationService for multi-channel messaging
      try {
        await this.communicationService.publish(
          CommunicationEvent.QUEUE_CANCELLED,
          {
            tenantId: updated.tenantId,
            visitId: updated.id,
            oldState: visit.currentState,
            newState: 'CANCELLED',
            customerPhone: updated.customer?.phone,
            customerName: updated.customer?.name,
            queueName: updated.queue?.name || updated.service?.name,
            cancelReason: formattedReason,
            refundApplicable: !!options?.refundApplicable,
          },
        );
      } catch (e) {
        // Communication failures should not block transaction
      }

      return updated;
    });
  }

  async markNoShow(
    visitId: string,
    tenantId?: string,
    operatorId?: string,
    reason?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const visit = await tx.visit.findUnique({
        where: { id: visitId },
        include: { customer: true, queue: true, service: true, location: true },
      });
      if (!visit) throw new NotFoundException('Visit not found');

      if (tenantId && visit.tenantId !== tenantId) {
        throw new NotFoundException('Visit not found in this workspace');
      }

      if (
        visit.currentState === 'COMPLETED' ||
        visit.currentState === 'CANCELLED' ||
        visit.currentState === 'NO_SHOW'
      ) {
        throw new BadRequestException(
          `Visit is already ${visit.currentState.toLowerCase()}`,
        );
      }

      const noShowReason = reason || 'Customer did not show up (No-Show)';

      const existingMeta =
        typeof visit.metadata === 'object' && visit.metadata !== null
          ? (visit.metadata as Record<string, any>)
          : {};

      const updated = await tx.visit.update({
        where: { id: visitId },
        data: {
          currentState: 'NO_SHOW',
          completedAt: new Date(),
          operatorId: operatorId || visit.operatorId,
          cancelReason: noShowReason,
          metadata: {
            ...existingMeta,
            noShow: {
              markedAt: new Date().toISOString(),
              operatorId: operatorId || visit.operatorId,
              reason: noShowReason,
            },
          },
        },
        include: { customer: true, queue: true, service: true, location: true },
      });

      await tx.outboxEvent.create({
        data: {
          type: 'VISIT_MISSED',
          payload: {
            visitId: updated.id,
            queueId: updated.queueId,
            tenantId: updated.tenantId,
            reason: noShowReason,
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
    options?: { allowEarlyCheckIn?: boolean },
  ) {
    let tokenValue = (tokenString || '').trim();
    try {
      if (tokenValue.includes('http')) {
        const url = new URL(tokenValue);
        tokenValue =
          url.searchParams.get('token') ||
          url.searchParams.get('accessToken') ||
          url.searchParams.get('id') ||
          url.searchParams.get('t') ||
          url.pathname.split('/').filter(Boolean).pop() ||
          tokenValue;
      }
    } catch (e) {
      // Ignore
    }

    const clean = tokenValue.replace(/^#/, '').trim();
    const variants = new Set([tokenValue, clean, clean.toUpperCase(), clean.toLowerCase()]);

    if (clean.includes('-')) {
      variants.add(clean.replace(/-/g, ''));
      variants.add(clean.replace(/-/g, '').toUpperCase());
    } else {
      const match = clean.match(/^([a-zA-Z]+)(\d+)$/);
      if (match) {
        variants.add(match[1].toUpperCase() + '-' + match[2]);
        variants.add(match[1].toUpperCase() + match[2]);
      }
    }

    const matchConditions: any[] = [
      { id: tokenValue },
      { accessToken: tokenValue },
      { appointmentId: tokenValue },
    ];

    for (const v of variants) {
      if (v) {
        matchConditions.push({ id: v });
        matchConditions.push({ accessToken: v });
        matchConditions.push({ displayId: { equals: v, mode: 'insensitive' } });
      }
    }

    const digits = tokenValue.replace(/\D/g, '');
    if (digits.length >= 7) {
      matchConditions.push({
        customer: {
          phone: { contains: digits.slice(-10) },
        },
      });
    }

    const visit = await this.prisma.visit.findFirst({
      where: {
        tenantId,
        OR: matchConditions,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        queue: {
          include: { location: true },
        },
        location: true,
        service: true,
        visitSteps: {
          include: { templateStep: true },
          orderBy: { stepOrder: 'asc' },
        },
      },
    });

    if (!visit) {
      return {
        valid: false,
        reason: 'Invalid token or not found for this workspace',
      };
    }

    if (locationId && locationId !== 'all') {
      const visitLocId = visit.locationId || visit.queue?.locationId;
      if (visitLocId && visitLocId !== locationId) {
        const targetLoc = await this.prisma.location.findUnique({
          where: { id: locationId },
          select: { name: true },
        });
        const currentLocName = targetLoc?.name || 'the selected location';
        const visitLocName = visit.location?.name || visit.queue?.location?.name || 'Another Location';
        return {
          valid: false,
          status: 'WRONG_LOCATION',
          reason: `Ticket belongs to "${visitLocName}", but scanner is set to "${currentLocName}". Please switch location filter or direct customer to ${visitLocName}.`,
          tokenId: visit.id,
          displayId: visit.displayId,
          customerName: visit.customer?.name || 'Unknown',
          queueName: visit.queue?.name || 'Unknown Queue',
          locationName: visitLocName,
        };
      }
    }

    const completedSteps =
      visit.visitSteps?.filter(
        (s) => s.status === 'DONE' || s.status === 'SKIPPED',
      ) || [];
    const collectionStep = completedSteps.find(
      (s) => s.templateStep?.type === 'COLLECTION',
    );
    const lastCompletedStep =
      collectionStep ||
      (completedSteps.length > 0
        ? completedSteps[completedSteps.length - 1]
        : null);

    if (
      visit.currentState === 'COMPLETED' ||
      visit.currentState === 'CANCELLED' ||
      visit.currentState === 'MISSED'
    ) {
      return {
        valid: true,
        isCompleted: true,
        status: visit.currentState,
        reason: `Visit is already ${visit.currentState.toLowerCase()}`,
        tokenId: visit.id,
        displayId: visit.displayId,
        customerName: visit.customer?.name || 'Unknown',
        queueName: visit.queue?.name || 'Unknown Queue',
        locationName: visit.queue?.location?.name || 'Unknown Location',
        serviceBooked: visit.service?.name || 'Unknown Service',
        scheduledFor: visit.scheduledTime,
        checkedIn: true,
        checkInTime: visit.checkInTime,
        completedAt: visit.completedAt,
        activeStep: null,
        completedSteps,
        lastCompletedStep,
        allSteps: visit.visitSteps || [],
      };
    }

    if (visit.currentState === 'NO_SHOW') {
      return {
        valid: false,
        status: 'NO_SHOW',
        isPast: true,
        reason: visit.cancelReason
          ? `Visit was marked as no-show (${visit.cancelReason})`
          : 'Visit was marked as no-show / expired',
        tokenId: visit.id,
        displayId: visit.displayId,
        customerName: visit.customer?.name || 'Unknown',
        queueName: visit.queue?.name || 'Unknown Queue',
        locationName: visit.queue?.location?.name || 'Unknown Location',
        serviceBooked: visit.service?.name || 'Unknown Service',
        scheduledFor: visit.scheduledTime,
      };
    }

    // Temporal date boundary guards: calculate today's start and end for the location timezone
    const locTz = visit.queue?.location?.timezone || 'UTC';
    let zonedNow: Date;
    try {
      zonedNow = toZonedTime(new Date(), locTz);
    } catch {
      zonedNow = toZonedTime(new Date(), 'UTC');
    }

    const zonedStart = new Date(zonedNow);
    zonedStart.setHours(0, 0, 0, 0);
    const startOfDay = fromZonedTime(zonedStart, locTz);

    const zonedEnd = new Date(zonedNow);
    zonedEnd.setHours(23, 59, 59, 999);
    const endOfDay = fromZonedTime(zonedEnd, locTz);

    // 1. Scheduled appointments date validation
    if (visit.scheduledTime) {
      const schedTime = new Date(visit.scheduledTime);
      if (schedTime < startOfDay) {
        return {
          valid: false,
          isPast: true,
          status: visit.currentState,
          scheduledFor: visit.scheduledTime,
          reason: `This appointment was scheduled for a past date (${schedTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}). It cannot be checked in today.`,
          tokenId: visit.id,
          displayId: visit.displayId,
          customerName: visit.customer?.name || 'Unknown',
          queueName: visit.queue?.name || 'Unknown Queue',
          locationName: visit.queue?.location?.name || 'Unknown Location',
          serviceBooked: visit.service?.name || 'Unknown Service',
        };
      }

      if (schedTime > endOfDay && !options?.allowEarlyCheckIn) {
        return {
          valid: false,
          isFuture: true,
          canOverride: true,
          status: visit.currentState,
          scheduledFor: visit.scheduledTime,
          reason: `This appointment is scheduled for a future date (${schedTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}). Early check-in is not permitted today without staff override.`,
          tokenId: visit.id,
          displayId: visit.displayId,
          customerName: visit.customer?.name || 'Unknown',
          queueName: visit.queue?.name || 'Unknown Queue',
          locationName: visit.queue?.location?.name || 'Unknown Location',
          serviceBooked: visit.service?.name || 'Unknown Service',
        };
      }
    } else {
      // 2. Walk-in created prior to today that was not serviced today
      const createdTime = new Date(visit.createdAt);
      if (createdTime < startOfDay && !visit.checkInTime && visit.currentState !== 'IN_SERVICE') {
        return {
          valid: false,
          isPast: true,
          status: visit.currentState,
          reason: `This walk-in ticket was issued on a previous date (${createdTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}) and has expired.`,
          tokenId: visit.id,
          displayId: visit.displayId,
          customerName: visit.customer?.name || 'Unknown',
          queueName: visit.queue?.name || 'Unknown Queue',
          locationName: visit.queue?.location?.name || 'Unknown Location',
          serviceBooked: visit.service?.name || 'Unknown Service',
        };
      }
    }

    const actionableSteps = visit.visitSteps?.filter(
      (s) =>
        s.status === 'PENDING' ||
        s.status === 'ACTIVE' ||
        s.status === 'DEFERRED',
    );
    const activeStep =
      actionableSteps && actionableSteps.length > 0 ? actionableSteps[0] : null;

    return {
      valid: true,
      isCompleted: false,
      status: visit.currentState,
      tokenId: visit.id,
      displayId: visit.displayId,
      customerName: visit.customer?.name || 'Unknown',
      queueName: visit.queue?.name || 'Unknown Queue',
      locationName: visit.queue?.location?.name || 'Unknown Location',
      serviceBooked: visit.service?.name || 'Unknown Service',
      scheduledFor: visit.scheduledTime,
      checkedIn:
        visit.currentState === 'CHECKED_IN' ||
        visit.currentState === 'IN_SERVICE' ||
        visit.checkInTime !== null,
      checkInTime: visit.checkInTime,
      activeStep,
      completedSteps,
      lastCompletedStep,
      allSteps: visit.visitSteps || [],
    };
  }

  async cancelPublicVisit(accessToken: string) {
    const visit = await this.prisma.visit.findFirst({
      where: {
        OR: [{ accessToken }, { id: accessToken }],
      },
      include: {
        queue: { include: { location: true } },
        customer: true,
        tenant: true,
      },
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

    const hasPayment = await this.prisma.bookingPayment.findFirst({
      where: { visitId: visit.id, status: 'SUCCEEDED' },
    });
    if (hasPayment) {
      const tenantEmail = visit.tenant.supportEmail || 'the business directly';
      throw new BadRequestException(
        `This ticket has an active payment. Please contact ${tenantEmail} for assistance with cancellations and refunds.`,
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
        include: { services: true },
      });
      if (!nextQueue) throw new NotFoundException('Target queue not found');

      if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(visit.currentState)) {
        throw new BadRequestException(
          `Cannot transfer a visit that is already ${visit.currentState}`,
        );
      }

      // Unify Routing: Prevent manual transfer from breaking the ServiceFlow state machine
      const activeSteps = await tx.visitStep.count({
        where: { visitId, status: { in: ['PENDING', 'ACTIVE'] } },
      });

      if (activeSteps > 0) {
        throw new BadRequestException(
          'Cannot manually transfer a ticket that is active in a Service Flow. Please use the workflow actions (Complete/Skip) to progress this visit.',
        );
      }

      // Unify Routing: Update the serviceId if the target queue is dedicated to a single service.
      const serviceUpdate =
        nextQueue.services.length === 1
          ? nextQueue.services[0].id
          : visit.serviceId;

      const updated = await tx.visit.update({
        where: { id: visitId },
        data: {
          queueId: nextQueueId,
          serviceId: serviceUpdate,
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
  async rateVisit(accessToken: string, rating: number, feedbackText?: string) {
    const visit = await this.prisma.visit.findFirst({
      where: {
        OR: [{ accessToken }, { id: accessToken }],
      },
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
    this.redisService.client
      .del(`queue_metrics:${updated.queueId}`)
      .catch(() => {});
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

    this.redisService.client
      .publish('outbox_events', 'WAKE_UP')
      .catch(() => {});
    return updated;
  }

  async getClinicalNote(visitId: string, tenantId: string) {
    return this.prisma.extendedClient.clinicalNote.findFirst({
      where: { visitId, tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async saveClinicalNote(
    visitId: string,
    tenantId: string,
    data: any,
    authorId?: string,
  ) {
    const visit = await this.findOne(visitId, tenantId);
    let note = await this.prisma.extendedClient.clinicalNote.findFirst({
      where: { visitId, tenantId },
    });

    if (note) {
      note = await this.prisma.extendedClient.clinicalNote.update({
        where: { id: note.id },
        data: {
          symptoms: data.symptoms,
          vitals: data.vitals,
          diagnosis: data.diagnosis,
          plan: data.plan,
        },
      });
    } else {
      note = await this.prisma.extendedClient.clinicalNote.create({
        data: {
          tenantId,
          visitId,
          customerId: visit.customerId,
          authorId,
          symptoms: data.symptoms,
          vitals: data.vitals,
          diagnosis: data.diagnosis,
          plan: data.plan,
        },
      });
    }
    return note;
  }

  async getPrescription(visitId: string, tenantId: string) {
    return this.prisma.extendedClient.prescription.findFirst({
      where: { visitId, tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async savePrescription(
    visitId: string,
    tenantId: string,
    data: any,
    authorId?: string,
  ) {
    const visit = await this.findOne(visitId, tenantId);
    let rx = await this.prisma.extendedClient.prescription.findFirst({
      where: { visitId, tenantId },
    });

    if (rx) {
      rx = await this.prisma.extendedClient.prescription.update({
        where: { id: rx.id },
        data: {
          medications: data.medications,
          notes: data.notes,
        },
      });
    } else {
      rx = await this.prisma.extendedClient.prescription.create({
        data: {
          tenantId,
          visitId,
          customerId: visit.customerId,
          authorId,
          medications: data.medications,
          notes: data.notes,
        },
      });
    }
    return rx;
  }
}
