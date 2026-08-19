import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';

@Injectable()
export class ServiceService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => QueueService))
    private queueService: QueueService
  ) {}

  async create(
    tenantId: string,
    data: {
      name: string;
      description?: string;
      expectedDuration?: number;
      locationId?: string;
      allowAppointments?: boolean;
      requireManualCheckIn?: boolean;
      appointmentGranularityMins?: number;
    },
  ) {
    const servicesCount = await this.prisma.extendedClient.service.count({
      where: { 
        tenantId, 
        locationId: data.locationId || null 
      },
    });

    if (servicesCount >= 20) {
      throw new BadRequestException(
        `Maximum number of services (20) reached for this ${data.locationId ? 'location' : 'tenant'}.`
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
      },
    });

    // Auto-create a default queue for the new service
    try {
      await this.queueService.createQueue(
        tenantId,
        undefined,
        `${data.name} Queue`,
        undefined,
        undefined,
        data.locationId,
        [service.id]
      );
    } catch (error) {
      console.error('Failed to auto-create queue for service:', error);
    }

    return service;
  }

  async findAll(tenantId: string) {
    return this.prisma.extendedClient.service.findMany({
      where: { tenantId },
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
      requireManualCheckIn?: boolean;
      appointmentGranularityMins?: number;
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

    if (service.location?.businessHours) {
      const bh = service.location.businessHours as any;
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
        serviceId,
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
}
