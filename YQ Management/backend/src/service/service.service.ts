import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import {
  addMinutes,
  isAfter,
  isBefore,
  parseISO,
  startOfDay,
  endOfDay,
} from 'date-fns';

@Injectable()
export class ServiceService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => QueueService))
    private queueService: QueueService,
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
      formConfig?: any;
      useLocationHours?: boolean;
      businessHoursOverride?: any;
      exceptionDatesOverride?: any;
    },
  ) {
    const servicesCount = await this.prisma.extendedClient.service.count({
      where: {
        tenantId,
        locationId: data.locationId || null,
      },
    });

    if (servicesCount >= 20) {
      throw new BadRequestException(
        `Maximum number of services (20) reached for this ${data.locationId ? 'location' : 'tenant'}.`,
      );
    }

    const service = await this.prisma.extendedClient.service.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description,
        expectedDuration: data.expectedDuration,
        locationId: data.locationId,
        allowAppointments: data.allowAppointments,
        requireManualCheckIn: data.requireManualCheckIn,
        appointmentGranularityMins: data.appointmentGranularityMins,
        formConfig: data.formConfig,
      },
    });

    // Auto-create a default queue for the new service
    try {
      await this.queueService.createQueue(
        tenantId,
        `${data.name} Queue`,
        undefined,
        undefined,
        data.locationId,
        [service.id],
      );
    } catch (error) {
      console.error('Failed to auto-create queue for service:', error);
    }

    return service;
  }

  async findAll(tenantId: string, locationId?: string, reqUser?: any) {
    const where: any = { tenantId };

    if (locationId) {
      where.locationId = locationId;
    }

    if (reqUser && (reqUser.role === 'OPERATOR' || reqUser.role === 'MANAGER')) {
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
      include: { location: true, queues: true },
    });
  }

  async findAllPublic(tenantId: string) {
    return this.prisma.extendedClient.service.findMany({
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
  }

  async findOne(id: string, tenantId: string) {
    const service = await this.prisma.extendedClient.service.findFirst({
      where: { id, tenantId },
      include: { location: true },
    });
    if (!service) throw new NotFoundException('Service not found');
    return service;
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
      formConfig?: any;
      useLocationHours?: boolean;
      businessHoursOverride?: any;
      exceptionDatesOverride?: any;
    },
  ) {
    const { queueIds, ...restData } = data;
    const updateData: any = { ...restData };

    if (queueIds !== undefined) {
      updateData.queues = {
        set: queueIds.map((qId) => ({ id: qId })),
      };
    }

    if (restData.locationId !== undefined) {
      if (restData.locationId === null) {
        updateData.location = { disconnect: true };
      } else {
        updateData.location = { connect: { id: restData.locationId } };
      }
      delete updateData.locationId;
    }

    return this.prisma.extendedClient.service
      .update({
        where: { id_tenantId: { id, tenantId } },
        data: updateData,
      })
      .catch(async () => {
        const exists = await this.findOne(id, tenantId);
        return this.prisma.extendedClient.service.update({
          where: { id: exists.id },
          data: updateData,
        });
      });
  }

  async remove(id: string, tenantId: string) {
    const exists = await this.findOne(id, tenantId);
    return this.prisma.extendedClient.service.delete({
      where: { id: exists.id },
    });
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

    // Determine which settings to use
    let exceptions: string[] = [];
    if (service.useLocationHours && service.location?.exceptionDates) {
      exceptions = service.location.exceptionDates as string[];
    } else if (!service.useLocationHours && service.exceptionDatesOverride) {
      exceptions = service.exceptionDatesOverride as string[];
    }

    if (exceptions.includes(date)) return []; // Holiday or closed day

    // Default business hours: 09:00 to 17:00 local time.
    let startHour = 9;
    let startMinute = 0;
    let endHour = 17;
    let endMinute = 0;

    // For handling multiple business hours blocks (breaks)
    const dailyBreaks: Array<{ start: string; end: string }> = [];

    // We parse the local date string "YYYY-MM-DD"
    // to find what day of the week it is in that timezone.
    const [year, month, day] = date.split('-').map(Number);
    const localDayDate = new Date(year, month - 1, day);

    let businessHours: any = null;
    if (service.useLocationHours && service.location?.businessHours) {
      businessHours = service.location.businessHours;
    } else if (!service.useLocationHours && service.businessHoursOverride) {
      businessHours = service.businessHoursOverride;
    }

    if (businessHours) {
      const dayOfWeek = localDayDate.getDay(); // 0 = Sunday
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

      const val = businessHours[dayName];
      if (val) {
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
    const result: Array<{ time: string; available: boolean }> = [];
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

      result.push({
        time: new Date(currentMs).toISOString(),
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

      // Check exceptions
      if (exceptions.includes(dateStr)) continue;

      // Check day of week closure
      const localDayDate = new Date(year, month - 1, day);
      const dayOfWeek = localDayDate.getDay();
      const dayName = days[dayOfWeek];

      let isClosed = false;
      if (businessHours && businessHours[dayName]) {
        const val = businessHours[dayName];
        if (Array.isArray(val)) {
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
