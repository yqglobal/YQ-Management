import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { fromZonedTime, toZonedTime, format } from 'date-fns-tz';
import {
  addMinutes,
  isAfter,
  isBefore,
  parseISO,
  startOfDay,
  endOfDay,
} from 'date-fns';
import JSZip from 'jszip';
import { objectsToCsv } from '../utils/csv.helper';

@Injectable()
export class ServiceService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => QueueService))
    private queueService: QueueService,
    @Inject(forwardRef(() => SubscriptionService))
    private subscriptionService: SubscriptionService,
  ) {}

  async create(
    tenantId: string,
    data: {
      name: string;
      description?: string;
      expectedDuration?: number;
      locationId?: string;
      allowAppointments?: boolean;
      allowProviderSelection?: boolean;
      requireManualCheckIn?: boolean;
      appointmentGranularityMins?: number;
      dateSelectionType?: string;
      maxDaysInAdvance?: number;
      formConfig?: any;
      useLocationHours?: boolean;
      businessHoursOverride?: any;
      exceptionDatesOverride?: any;
      slaPolicyId?: string | null;
      requiredSkills?: string[];
      basePrice?: number | null;
      priceCurrency?: string;
      paymentMode?: string;
      paymentTiming?: any;
      checkinPayMode?: string;
      allowUnpaidCheckout?: boolean;
      autoSendInvoice?: boolean;
      slaMode?: string;
      warningThresholdMins?: number;
      breachThresholdMins?: number;
      escalationPhones?: string[];
    },
  ) {
    if (!data.locationId) {
      throw new BadRequestException('A location must be provided to create a service.');
    }

    const servicesCount = await this.prisma.extendedClient.service.count({
      where: {
        tenantId,
      },
    });

    await this.subscriptionService.checkLimit(tenantId, 'services', servicesCount);

    const createData: any = {
      tenantId,
      name: data.name,
      description: data.description,
      expectedDuration: data.expectedDuration,
      locationId: data.locationId,
      allowAppointments: data.allowAppointments,
      allowProviderSelection: data.allowProviderSelection,
      requireManualCheckIn: data.requireManualCheckIn,
      appointmentGranularityMins: data.appointmentGranularityMins,
      dateSelectionType: data.dateSelectionType,
      maxDaysInAdvance: data.maxDaysInAdvance,
      formConfig: data.formConfig,
      useLocationHours: data.useLocationHours,
      businessHoursOverride: data.businessHoursOverride,
      exceptionDatesOverride: data.exceptionDatesOverride,
      requiredSkills: data.requiredSkills || [],
      basePrice: data.basePrice,
      priceCurrency: data.priceCurrency,
      paymentMode: data.paymentMode,
    };

    if (data.slaMode && data.slaMode !== 'Disabled') {
      const slaPolicy = await this.prisma.extendedClient.slaPolicy.create({
        data: {
          tenantId,
          name: `${data.name} SLA Policy`,
          warningThresholdMins: data.warningThresholdMins || 15,
          breachThresholdMins: data.breachThresholdMins || 30,
          escalationPhones: data.escalationPhones || [],
        },
      });
      createData.slaPolicy = { connect: { id: slaPolicy.id } };
    } else if (data.slaPolicyId) {
      createData.slaPolicy = { connect: { id: data.slaPolicyId } };
    }

    const service = await this.prisma.extendedClient.service.create({
      data: createData,
    });

    // Auto-create a default queue for the new service
    try {
      await this.queueService.createQueue(
        tenantId,
        `${data.name}'s queue`,
        undefined,
        undefined,
        data.locationId,
        [service.id],
        true,
      );
    } catch (error) {
      console.error('Failed to auto-create queue for service:', error);
    }

    // Auto-create a default service flow to manage payment settings
    try {
      await this.prisma.extendedClient.serviceFlow.create({
        data: {
          tenantId,
          serviceId: service.id,
          name: `${data.name} Default Flow`,
          isActive: true,
          paymentTiming: data.paymentTiming || 'NONE',
          checkinPayMode: data.checkinPayMode || 'BOTH',
          allowUnpaidCheckout: data.allowUnpaidCheckout || false,
          autoSendInvoice: data.autoSendInvoice || false,
        },
      });
    } catch (error) {
      console.error('Failed to auto-create service flow for service:', error);
    }

    return service;
  }

  async findAll(tenantId: string, locationId?: string, reqUser?: any) {
    const where: any = { tenantId };

    if (locationId) {
      where.locationId = locationId;
    }

    if (
      reqUser &&
      (reqUser.role === 'MANAGER' || reqUser.role === 'MANAGER')
    ) {
      const dbUser = await this.prisma.user.findUnique({
        where: { id: reqUser.userId || reqUser.sub },
      });
      if (dbUser && dbUser.allowedLocationIds) {
        if (dbUser.allowedLocationIds.length > 0) {
          if (locationId) {
            if (!dbUser.allowedLocationIds.includes(locationId)) {
              where.locationId = { in: [] }; // Unauthorized access to this location
            }
          } else {
            where.locationId = { in: dbUser.allowedLocationIds };
          }
        } else {
          where.locationId = { in: [] };
        }
      }
    }

    return this.prisma.extendedClient.service.findMany({
      where,
      include: {
        location: true,
        queues: true,
        slaPolicy: true,
        serviceFlow: { include: { steps: true } },
      },
    });
  }

  async findAllPublic(tenantId: string) {
    const services = await this.prisma.extendedClient.service.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        description: true,
        expectedDuration: true,
        locationId: true,
        formConfig: true,
        allowAppointments: true,
        appointmentGranularityMins: true,
        requireManualCheckIn: true,
        useLocationHours: true,
        businessHoursOverride: true,
        exceptionDatesOverride: true,
        basePrice: true,
        priceCurrency: true,
        paymentMode: true,
        dateSelectionType: true,
        maxDaysInAdvance: true,
        serviceFlow: {
          select: {
            isActive: true,
            paymentTiming: true,
            checkinPayMode: true,
            allowUnpaidCheckout: true,
            autoSendInvoice: true,
          },
        },
        location: {
          select: {
            timezone: true,
            businessHours: true,
            exceptionDates: true,
          },
        },
        queues: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            name: true,
            status: true,
            formConfig: true,
          },
        },
      },
    });

    const now = new Date();

    return Promise.all(
      services.map(async (s: any) => {
        const isOpenNow = await this.isServiceOpen(s, now);
        // Remove internal scheduling data from public payload
        const {
          useLocationHours,
          businessHoursOverride,
          exceptionDatesOverride,
          location,
          ...publicService
        } = s;
        return {
          ...publicService,
          isOpenNow,
        };
      }),
    );
  }

  async findOne(id: string, tenantId: string) {
    const service = await this.prisma.extendedClient.service.findFirst({
      where: { id, tenantId },
      include: { location: true, slaPolicy: true, serviceFlow: true },
    });
    if (!service) throw new NotFoundException('Service not found');
    return service;
  }

  async isServiceOpen(
    service: any,
    checkDate: Date = new Date(),
  ): Promise<boolean> {
    const timezone = service.location?.timezone || 'UTC';
    const zonedDate = toZonedTime(checkDate, timezone);
    const dateStr = format(zonedDate, 'yyyy-MM-dd');

    let exceptions: string[] = [];
    if (service.useLocationHours && service.location?.exceptionDates) {
      exceptions = service.location.exceptionDates as string[];
    } else if (!service.useLocationHours && service.exceptionDatesOverride) {
      exceptions = service.exceptionDatesOverride as string[];
    }

    if (exceptions.includes(dateStr)) return false;

    let businessHours: any = null;
    if (service.useLocationHours && service.location?.businessHours) {
      businessHours = service.location.businessHours;
    } else if (!service.useLocationHours && service.businessHoursOverride) {
      businessHours = service.businessHoursOverride;
    }

    const dayOfWeek = zonedDate.getDay();
    const days = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];
    const dayName = days[dayOfWeek];

    if (!businessHours) {
      // Default: closed on weekends
      if (dayOfWeek === 0 || dayOfWeek === 6) return false;
      return true; // Wait, actually need to check times if we want strictness, but default is 09-17
    } else {
      const val = businessHours[dayName];
      if (val === undefined || val === null) return false;

      let blocks: any[] = [];
      if (Array.isArray(val)) {
        if (val.length === 0) return false;
        blocks = val;
      } else {
        if (val.closed) return false;
        if (val.start && val.end) {
          blocks = [{ start: val.start, end: val.end }];
        }
      }

      if (blocks.length === 0) return true;

      const currentMinutes = zonedDate.getHours() * 60 + zonedDate.getMinutes();

      for (const block of blocks) {
        if (block.start && block.end) {
          const [sh, sm] = block.start.split(':').map(Number);
          const [eh, em] = block.end.split(':').map(Number);
          const startMin = sh * 60 + (sm || 0);
          const endMin = eh * 60 + (em || 0);

          if (currentMinutes >= startMin && currentMinutes <= endMin) {
            return true;
          }
        }
      }

      return false;
    }
  }

  async update(
    id: string,
    tenantId: string,
    data: {
      name?: string;
      description?: string;
      expectedDuration?: number;
      locationId?: string;
      queueIds?: string[];
      allowAppointments?: boolean;
      allowProviderSelection?: boolean;
      requireManualCheckIn?: boolean;
      appointmentGranularityMins?: number;
      dateSelectionType?: string;
      maxDaysInAdvance?: number;
      formConfig?: any;
      useLocationHours?: boolean;
      businessHoursOverride?: any;
      exceptionDatesOverride?: any;
      slaPolicyId?: string | null;
      requiredSkills?: string[];
      basePrice?: number | null;
      priceCurrency?: string;
      paymentMode?: string;
      slaMode?: string;
      warningThresholdMins?: number;
      breachThresholdMins?: number;
      escalationPhones?: string[];
      paymentTiming?: any;
      checkinPayMode?: string;
      allowUnpaidCheckout?: boolean;
      autoSendInvoice?: boolean;
    },
  ) {
    const { queueIds, paymentTiming, checkinPayMode, allowUnpaidCheckout, autoSendInvoice, ...restData } = data;
    const updateData: any = { ...restData };

    if (queueIds !== undefined) {
      updateData.queues = {
        set: queueIds.map((qId) => ({ id: qId })),
      };
    }

    if (restData.locationId !== undefined) {
      if (!restData.locationId) {
        throw new BadRequestException('A service must have a location. Cannot remove location.');
      } else {
        updateData.location = { connect: { id: restData.locationId } };
      }
      delete updateData.locationId;
    }

    if (restData.slaMode !== undefined) {
      if (restData.slaMode === 'Disabled' || restData.slaMode === 'disabled') {
        updateData.slaPolicy = { disconnect: true };
      } else {
        const slaPolicy = await this.prisma.extendedClient.slaPolicy.create({
          data: {
            tenantId,
            name: `${restData.name || data.name || 'Service'} SLA Policy`,
            warningThresholdMins: restData.warningThresholdMins || 15,
            breachThresholdMins: restData.breachThresholdMins || 30,
            escalationPhones: restData.escalationPhones || [],
          },
        });
        updateData.slaPolicy = { connect: { id: slaPolicy.id } };
      }
      delete updateData.slaMode;
      delete updateData.warningThresholdMins;
      delete updateData.breachThresholdMins;
      delete updateData.escalationPhones;
    } else if ('slaPolicyId' in updateData) {
      if (updateData.slaPolicyId) {
        updateData.slaPolicy = { connect: { id: updateData.slaPolicyId } };
      } else {
        updateData.slaPolicy = { disconnect: true };
      }
      delete updateData.slaPolicyId;
    }

    const result = await this.prisma.extendedClient.service
      .update({
        where: { id_tenantId: { id, tenantId } },
        data: updateData,
        include: { queues: true },
      })
      .catch(async () => {
        const exists = await this.findOne(id, tenantId);
        return this.prisma.extendedClient.service.update({
          where: { id: exists.id },
          data: updateData,
          include: { queues: true },
        });
      });

    // Sync queue name if service name was updated
    if (data.name && result.queues && result.queues.length > 0) {
      const firstQueue = result.queues[0];
      await this.prisma.queue.update({
        where: { id: firstQueue.id },
        data: { name: `${data.name}'s queue` },
      });
    }

    if (
      paymentTiming !== undefined ||
      checkinPayMode !== undefined ||
      allowUnpaidCheckout !== undefined ||
      autoSendInvoice !== undefined
    ) {
      const flowUpdateData: any = {};
      if (paymentTiming !== undefined) flowUpdateData.paymentTiming = paymentTiming;
      if (checkinPayMode !== undefined) flowUpdateData.checkinPayMode = checkinPayMode;
      if (allowUnpaidCheckout !== undefined) flowUpdateData.allowUnpaidCheckout = allowUnpaidCheckout;
      if (autoSendInvoice !== undefined) flowUpdateData.autoSendInvoice = autoSendInvoice;

      await this.prisma.serviceFlow.updateMany({
        where: { serviceId: id, tenantId },
        data: flowUpdateData,
      });
    }

    return result;
  }

  async remove(
    id: string,
    tenantId: string,
    strategy?: string,
    reassignToId?: string,
    keepHistory?: boolean,
  ) {
    const exists = await this.findOne(id, tenantId);

    return this.prisma.$transaction(async (tx) => {
      if (strategy === 'reassign' && reassignToId) {
        const targetService = await tx.service.findFirst({
          where: { id: reassignToId, tenantId },
        });
        if (!targetService) {
          throw new NotFoundException(
            'Target service not found for reassignment',
          );
        }

        const queuesToReassign = await tx.queue.findMany({
          where: { services: { some: { id } } },
          include: { services: true },
        });

        for (const queue of queuesToReassign) {
          await tx.queue.update({
            where: { id: queue.id },
            data: {
              services: {
                disconnect: { id },
                connect: { id: reassignToId },
              },
            },
          });
        }

        await tx.serviceFlow.updateMany({
          where: { serviceId: id },
          data: { serviceId: reassignToId },
        });

        await tx.visit.updateMany({
          where: { serviceId: id },
          data: { serviceId: reassignToId },
        });

        await tx.appointment.updateMany({
          where: { serviceId: id },
          data: { serviceId: reassignToId },
        });
      } else if (strategy === 'delete_all') {
        const relatedQueues = await tx.queue.findMany({
          where: { services: { some: { id } } },
          include: { services: true },
        });

        const relatedWorkflows = await tx.serviceFlow.findMany({
          where: { serviceId: id },
        });

        if (keepHistory) {
          let archiveService = await tx.service.findFirst({
            where: { name: 'Archived Services', tenantId },
          });

          if (!archiveService) {
            archiveService = await tx.service.create({
              data: {
                name: 'Archived Services',
                tenantId,
                description:
                  'Container for historical data of deleted services.',
              },
            });
          }

          await tx.visit.updateMany({
            where: { serviceId: id },
            data: { serviceId: archiveService.id, queueId: null, flowId: null },
          });

          await tx.appointment.updateMany({
            where: { serviceId: id },
            data: { serviceId: archiveService.id },
          });
        }

        for (const flow of relatedWorkflows) {
          await tx.serviceFlow.delete({ where: { id: flow.id } });
        }

        // Only delete queues exclusive to this service; for shared queues, disconnect this service
        for (const queue of relatedQueues) {
          if (queue.services.length <= 1) {
            await tx.blockOff.deleteMany({ where: { queueId: queue.id } });
            await tx.visit.updateMany({
              where: { queueId: queue.id },
              data: { queueId: null },
            });
            await tx.queue.delete({ where: { id: queue.id } });
          } else {
            await tx.queue.update({
              where: { id: queue.id },
              data: {
                services: { disconnect: { id } },
              },
            });
          }
        }
      }

      // Finally, delete the service
      return tx.service.delete({
        where: { id: exists.id },
      });
    });
  }

  async getDeletionImpact(id: string, tenantId: string) {
    const service = await this.findOne(id, tenantId);

    const queues = await this.prisma.queue.findMany({
      where: {
        tenantId,
        services: { some: { id } },
      },
      include: {
        services: true,
      },
    });

    const activeVisitsCount = await this.prisma.visit.count({
      where: {
        serviceId: id,
        tenantId,
        currentState: {
          in: ['WAITING', 'CHECKED_IN', 'CALLED', 'IN_SERVICE'],
        },
      },
    });

    const totalVisitsCount = await this.prisma.visit.count({
      where: { serviceId: id, tenantId },
    });

    const upcomingAppointmentsCount = await this.prisma.appointment.count({
      where: {
        serviceId: id,
        tenantId,
        status: { in: ['SCHEDULED', 'CONFIRMED', 'PENDING_APPROVAL'] },
      },
    });

    const totalAppointmentsCount = await this.prisma.appointment.count({
      where: { serviceId: id, tenantId },
    });

    const serviceFlow = await this.prisma.serviceFlow.findUnique({
      where: { serviceId: id },
      include: { steps: true },
    });

    const queueDetails = queues.map((q) => ({
      id: q.id,
      name: q.name,
      exclusiveToService: q.services.length <= 1,
      totalLinkedServices: q.services.length,
      otherServiceNames: q.services
        .filter((s) => s.id !== id)
        .map((s) => s.name),
    }));

    return {
      service: {
        id: service.id,
        name: service.name,
        locationId: service.locationId,
      },
      counts: {
        queues: queues.length,
        exclusiveQueues: queueDetails.filter((q) => q.exclusiveToService).length,
        sharedQueues: queueDetails.filter((q) => !q.exclusiveToService).length,
        activeVisits: activeVisitsCount,
        totalVisits: totalVisitsCount,
        upcomingAppointments: upcomingAppointmentsCount,
        totalAppointments: totalAppointmentsCount,
        flowStepsCount: serviceFlow?.steps.length || 0,
      },
      queues: queueDetails,
    };
  }

  async exportServiceDataZip(id: string, tenantId: string) {
    const service = await this.prisma.service.findFirst({
      where: { id, tenantId },
      include: {
        location: true,
        queues: true,
        serviceFlow: { include: { steps: true } },
      },
    });

    if (!service) throw new NotFoundException('Service not found');

    const visits = await this.prisma.visit.findMany({
      where: { serviceId: id, tenantId },
      include: { customer: true, queue: true, staff: true, location: true },
      take: 10000,
      orderBy: { createdAt: 'desc' },
    });

    const appointments = await this.prisma.appointment.findMany({
      where: { serviceId: id, tenantId },
      include: { customer: true, staff: true, location: true },
      take: 10000,
      orderBy: { scheduledStart: 'desc' },
    });

    const zip = new JSZip();

    // 1. Metadata & Service JSON
    const fullDump = {
      exportedAt: new Date().toISOString(),
      service,
      visitsCount: visits.length,
      appointmentsCount: appointments.length,
    };
    zip.file('metadata.json', JSON.stringify(fullDump, null, 2));
    zip.file('service.json', JSON.stringify(service, null, 2));

    // 2. Queues CSV
    const queuesRows = service.queues.map((q) => ({
      id: q.id,
      name: q.name,
      status: q.status,
      maxCapacity: q.maxCapacity || '',
      createdAt: q.createdAt,
    }));
    zip.file('queues.csv', objectsToCsv(queuesRows));

    // 3. Visits CSV
    const visitsRows = visits.map((v) => ({
      id: v.id,
      displayId: v.displayId || '',
      customerName: v.customer?.name || '',
      customerPhone: v.customer?.phone || '',
      customerEmail: v.customer?.email || '',
      queueName: v.queue?.name || '',
      locationName: v.location?.name || '',
      staffName: v.staff?.name || '',
      status: v.currentState,
      source: v.source,
      priority: v.priority,
      checkInTime: v.checkInTime || '',
      serviceStart: v.serviceStart || '',
      serviceEnd: v.serviceEnd || '',
      completedAt: v.completedAt || '',
      createdAt: v.createdAt,
    }));
    zip.file('visits.csv', objectsToCsv(visitsRows));

    // 4. Appointments CSV
    const appointmentsRows = appointments.map((a) => ({
      id: a.id,
      customerName: a.customer?.name || '',
      customerPhone: a.customer?.phone || '',
      customerEmail: a.customer?.email || '',
      locationName: a.location?.name || '',
      staffName: a.staff?.name || '',
      status: a.status,
      bookingSource: a.bookingSource,
      scheduledStart: a.scheduledStart,
      scheduledEnd: a.scheduledEnd,
      paymentStatus: a.paymentStatus,
      customerNotes: a.customerNotes || '',
      createdAt: a.createdAt,
    }));
    zip.file('appointments.csv', objectsToCsv(appointmentsRows));

    const buffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    const safeName = service.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `service_${safeName}_backup_${dateStr}.zip`;

    return { filename, buffer };
  }

  /**
   * FIX (3A): Complete rewrite of getAvailableSlots.
   * Previously: Only checked Visit.scheduledTime (ignoring Appointment records).
   *             Did not use service.expectedDuration for slot blocking.
   * Now:        Checks both Visit.scheduledTime AND Appointment.scheduledStart/End.
   *             Blocks out the full service duration for each booking.
   *             Marks past slots as unavailable.
   */
  async getAvailableSlots(serviceId: string, date: string) {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      include: { location: true },
    });

    if (!service) throw new NotFoundException('Service not found');
    if (!service.allowAppointments)
      throw new BadRequestException(
        'Appointments are not enabled for this service',
      );

    const granularityMins = service.appointmentGranularityMins || 15;
    const durationMins = service.expectedDuration || granularityMins;
    const bufferMins = service.bufferDuration || 0;
    const concurrentSlots = service.concurrentSlots || 1;
    const timezone = service.location?.timezone || 'UTC';

    const nowZoned = toZonedTime(new Date(), timezone);
    const todayStr = format(nowZoned, 'yyyy-MM-dd');
    const maxDays = service.maxDaysInAdvance ?? 30;
    const maxDateZoned = new Date(nowZoned.getTime());
    maxDateZoned.setDate(maxDateZoned.getDate() + maxDays);
    const maxDateStr = format(maxDateZoned, 'yyyy-MM-dd');

    if (date < todayStr || date > maxDateStr) {
      return [];
    }

    // Determine which settings to use
    let exceptions: string[] = [];
    if (service.useLocationHours && service.location?.exceptionDates) {
      exceptions = service.location.exceptionDates as string[];
    } else if (!service.useLocationHours && service.exceptionDatesOverride) {
      exceptions = service.exceptionDatesOverride as string[];
    }

    if (exceptions.includes(date)) return []; // Holiday or closed day

    // We parse the local date string "YYYY-MM-DD"
    // to find what day of the week it is in that timezone.
    const [year, month, day] = date.split('-').map(Number);
    const localDayDate = new Date(year, month - 1, day);
    const dayOfWeek = localDayDate.getDay(); // 0 = Sunday, 6 = Saturday
    const days = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];
    const dayName = days[dayOfWeek];

    let businessHours: any = null;
    if (service.useLocationHours && service.location?.businessHours) {
      businessHours = service.location.businessHours;
    } else if (!service.useLocationHours && service.businessHoursOverride) {
      businessHours = service.businessHoursOverride;
    }

    // Default business hours: Mon-Fri 09:00-17:00, closed weekends.
    // If no businessHours configured, apply this sensible default.
    let startHour = 9;
    let startMinute = 0;
    let endHour = 17;
    let endMinute = 0;
    const dailyBreaks: Array<{ start: string; end: string }> = [];

    if (!businessHours) {
      // No hours configured: close weekends by default
      if (dayOfWeek === 0 || dayOfWeek === 6) return [];
    } else {
      const val = businessHours[dayName];
      // If the day key exists and is falsy/empty, treat as closed
      if (val === undefined || val === null) {
        // Day not specified in businessHours — treat as closed
        return [];
      }
      if (Array.isArray(val)) {
        if (val.length === 0) return []; // closed

        const firstBlock = val[0];
        const lastBlock = val[val.length - 1];
        if (firstBlock.start) {
          const [h, m] = firstBlock.start.split(':');
          startHour = parseInt(h);
          startMinute = parseInt(m || '0');
        }
        if (lastBlock.end) {
          const [h, m] = lastBlock.end.split(':');
          endHour = parseInt(h);
          endMinute = parseInt(m || '0');
        }

        // Calculate breaks between blocks
        for (let i = 0; i < val.length - 1; i++) {
          dailyBreaks.push({
            start: val[i].end,
            end: val[i + 1].start,
          });
        }
      } else {
        const { start, end, closed } = val;
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

    // Determine the exact UTC Date objects for start and end of this local day
    const localStartStr = `${date}T${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}:00`;
    const localEndStr = `${date}T${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}:00`;

    const startOfDayUTC = fromZonedTime(localStartStr, timezone);
    const endOfDayUTC = fromZonedTime(localEndStr, timezone);

    // Gather all booked time ranges from Visit.scheduledTime (active appointments)
    const existingVisits = await this.prisma.visit.findMany({
      where: {
        serviceId,
        currentState: {
          notIn: ['CANCELLED', 'NO_SHOW', 'MISSED', 'COMPLETED'],
        },
        scheduledTime: { gte: startOfDayUTC, lt: endOfDayUTC },
      },
      select: { scheduledTime: true },
    });

    const existingAppointments = await this.prisma.appointment
      .findMany({
        where: {
          serviceId,
          status: { notIn: ['CANCELLED', 'NO_SHOW', 'REJECTED'] }, // BLOCKED acts as a normal appointment consuming time
          scheduledStart: { gte: startOfDayUTC, lt: endOfDayUTC },
        },
        select: { scheduledStart: true, scheduledEnd: true },
      })
      .catch(() => []); // Fallback if Appointment model doesn't exist

    // Build a set of blocked millisecond timestamps.
    const blockedRanges: Array<{ start: number; end: number }> = [];

    for (const v of existingVisits) {
      if (v.scheduledTime) {
        blockedRanges.push({
          start: v.scheduledTime.getTime(),
          end: v.scheduledTime.getTime() + (durationMins + bufferMins) * 60000,
        });
      }
    }

    if (existingAppointments) {
      for (const appt of existingAppointments) {
        if (appt.scheduledStart && appt.scheduledEnd) {
          blockedRanges.push({
            start: new Date(appt.scheduledStart).getTime(),
            end: new Date(appt.scheduledEnd).getTime() + bufferMins * 60000,
          });
        }
      }
    }

    // Add configured daily breaks as blocked ranges
    for (const b of dailyBreaks) {
      const [sh, sm] = b.start.split(':');
      const [eh, em] = b.end.split(':');
      const localBreakStart = `${date}T${sh.padStart(2, '0')}:${sm.padStart(2, '0')}:00`;
      const localBreakEnd = `${date}T${eh.padStart(2, '0')}:${em.padStart(2, '0')}:00`;
      blockedRanges.push({
        start: fromZonedTime(localBreakStart, timezone).getTime(),
        end: fromZonedTime(localBreakEnd, timezone).getTime(),
      });
    }

    const nowMs = Date.now();
    const result: Array<{
      time: string;
      available: boolean;
      localTime?: string;
      displayTime?: string;
    }> = [];
    let currentMs = startOfDayUTC.getTime();
    const endOfDayMs = endOfDayUTC.getTime();
    const totalSlotDurationMs = (durationMins + bufferMins) * 60000;

    while (currentMs + durationMins * 60000 <= endOfDayMs) {
      const slotEndMs = currentMs + totalSlotDurationMs; // including buffer
      const isPast = currentMs < nowMs;

      // Count how many existing bookings overlap this specific slot
      let overlaps = 0;
      for (const range of blockedRanges) {
        if (currentMs < range.end && slotEndMs > range.start) {
          overlaps++;
        }
      }

      const isBlocked = overlaps >= concurrentSlots;
      const slotZoned = toZonedTime(new Date(currentMs), timezone);

      result.push({
        time: new Date(currentMs).toISOString(),
        localTime: format(slotZoned, 'HH:mm'),
        displayTime: format(slotZoned, 'hh:mm a'),
        available: !isPast && !isBlocked,
      });

      // Shift by granularity to test the next possible slot window
      currentMs += granularityMins * 60000;
    }

    return result;
  }

  async getAvailableDates(serviceId: string, month: number, year: number) {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      include: { location: true },
    });

    if (!service) throw new NotFoundException('Service not found');
    if (!service.allowAppointments) return [];

    let exceptions: string[] = [];
    if (service.useLocationHours && service.location?.exceptionDates) {
      exceptions = service.location.exceptionDates as string[];
    } else if (!service.useLocationHours && service.exceptionDatesOverride) {
      exceptions = service.exceptionDatesOverride as string[];
    }

    let businessHours: any = null;
    if (service.useLocationHours && service.location?.businessHours) {
      businessHours = service.location.businessHours;
    } else if (!service.useLocationHours && service.businessHoursOverride) {
      businessHours = service.businessHoursOverride;
    }

    const timezone = service.location?.timezone || 'UTC';
    const nowZoned = toZonedTime(new Date(), timezone);
    const todayStr = format(nowZoned, 'yyyy-MM-dd');
    const maxDays = service.maxDaysInAdvance ?? 30;

    // Add days properly (using date-fns if available, else plain JS)
    const maxDateZoned = new Date(nowZoned.getTime());
    maxDateZoned.setDate(maxDateZoned.getDate() + maxDays);
    const maxDateStr = format(maxDateZoned, 'yyyy-MM-dd');

    const availableDates: string[] = [];
    const daysInMonth = new Date(year, month, 0).getDate();
    const days = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];

    for (let day = 1; day <= daysInMonth; day++) {
      // Create local date string YYYY-MM-DD
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      // Check date bounds
      if (dateStr < todayStr || dateStr > maxDateStr) continue;

      // Check exceptions
      if (exceptions.includes(dateStr)) continue;

      // Check day of week closure
      const localDayDate = new Date(year, month - 1, day);
      const dayOfWeek = localDayDate.getDay();
      const dayName = days[dayOfWeek];

      let isClosed = false;
      if (!businessHours) {
        // No hours configured: close weekends (Saturday=6, Sunday=0) by default
        isClosed = dayOfWeek === 0 || dayOfWeek === 6;
      } else {
        const val = businessHours[dayName];
        if (val === undefined || val === null) {
          isClosed = true; // Day not specified → closed
        } else if (Array.isArray(val)) {
          isClosed = val.length === 0;
        } else {
          isClosed = val.closed === true;
        }
      }

      if (!isClosed) {
        availableDates.push(dateStr);
      }
    }

    return availableDates;
  }
}
