import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionService } from '../subscription/subscription.service';
import JSZip from 'jszip';
import { objectsToCsv } from '../utils/csv.helper';

@Injectable()
export class LocationService {
  constructor(
    private prisma: PrismaService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async create(
    tenantId: string,
    data: {
      name: string;
      address?: string;
      city?: string;
      totalFloors?: number;
      timezone?: string;
      businessHours?: any;
      exceptionDates?: string[];
    },
  ) {
    const currentLocationsCount =
      await this.prisma.extendedClient.location.count({
        where: { tenantId },
      });

    await this.subscriptionService.checkLimit(
      tenantId,
      'locations',
      currentLocationsCount,
    );

    return this.prisma.extendedClient.location.create({
      data: {
        tenantId,
        name: data.name,
        address: data.address,
        city: data.city,
        totalFloors: data.totalFloors,
        timezone: data.timezone || 'UTC',
        businessHours: data.businessHours,
        exceptionDates: data.exceptionDates,
      },
    });
  }

  async findAll(tenantId: string, reqUser?: any) {
    const where: any = { tenantId };

    if (
      reqUser &&
      (reqUser.role === 'MANAGER' || reqUser.role === 'MANAGER')
    ) {
      const dbUser = await this.prisma.user.findUnique({
        where: { id: reqUser.userId || reqUser.sub },
      });
      if (dbUser && dbUser.allowedLocationIds) {
        if (dbUser.allowedLocationIds.length > 0) {
          where.id = { in: dbUser.allowedLocationIds };
        } else {
          where.id = { in: [] };
        }
      }
    }

    return this.prisma.extendedClient.location.findMany({
      where,
      include: { services: true },
    });
  }

  async findOne(id: string, tenantId: string, reqUser?: any) {
    const where: any = { id, tenantId };

    if (
      reqUser &&
      (reqUser.role === 'MANAGER' || reqUser.role === 'MANAGER')
    ) {
      const dbUser = await this.prisma.user.findUnique({
        where: { id: reqUser.userId || reqUser.sub },
      });
      if (dbUser && dbUser.allowedLocationIds) {
        if (dbUser.allowedLocationIds.length > 0) {
          if (!dbUser.allowedLocationIds.includes(id)) {
            throw new NotFoundException('Location not found');
          }
        } else {
          throw new NotFoundException('Location not found');
        }
      }
    }

    const location = await this.prisma.extendedClient.location.findFirst({
      where,
      include: { services: true },
    });
    if (!location) throw new NotFoundException('Location not found');
    return location;
  }

  async update(
    id: string,
    tenantId: string,
    data: {
      name?: string;
      address?: string;
      city?: string;
      totalFloors?: number;
      timezone?: string;
      businessHours?: any;
      exceptionDates?: string[];
    },
  ) {
    return this.prisma.extendedClient.location
      .update({
        where: { id_tenantId: { id, tenantId } },
        data,
      })
      .catch(async (e: any) => {
        // Safe update
        const exists = await this.findOne(id, tenantId);
        return this.prisma.extendedClient.location.update({
          where: { id: exists.id },
          data,
        });
      });
  }

  async getDeletionImpact(id: string, tenantId: string) {
    const location = await this.findOne(id, tenantId);

    const services = await this.prisma.service.findMany({
      where: { locationId: id, tenantId },
      include: {
        queues: true,
      },
    });

    const serviceIds = services.map((s) => s.id);

    const queues = await this.prisma.queue.findMany({
      where: {
        tenantId,
        OR: [
          { locationId: id },
          { services: { some: { locationId: id } } },
        ],
      },
      include: {
        services: true,
      },
    });

    const activeVisitsCount = await this.prisma.visit.count({
      where: {
        locationId: id,
        tenantId,
        currentState: {
          in: ['WAITING', 'CHECKED_IN', 'CALLED', 'IN_SERVICE'],
        },
      },
    });

    const totalVisitsCount = await this.prisma.visit.count({
      where: { locationId: id, tenantId },
    });

    const upcomingAppointmentsCount = await this.prisma.appointment.count({
      where: {
        locationId: id,
        tenantId,
        status: { in: ['SCHEDULED', 'CONFIRMED', 'PENDING_APPROVAL'] },
      },
    });

    const totalAppointmentsCount = await this.prisma.appointment.count({
      where: { locationId: id, tenantId },
    });

    const staffCount = await this.prisma.staff.count({
      where: { locationId: id, tenantId },
    });

    const resourcesCount = await this.prisma.resource.count({
      where: { locationId: id, tenantId },
    });

    const queueDetails = queues.map((q) => {
      const isExclusive =
        q.locationId === id ||
        q.services.length === 0 ||
        q.services.every((s) => serviceIds.includes(s.id));
      return {
        id: q.id,
        name: q.name,
        exclusiveToLocation: isExclusive,
        serviceNames: q.services.map((s) => s.name),
      };
    });

    return {
      location: {
        id: location.id,
        name: location.name,
        city: location.city,
        address: location.address,
      },
      counts: {
        services: services.length,
        queues: queues.length,
        exclusiveQueues: queueDetails.filter((q) => q.exclusiveToLocation).length,
        activeVisits: activeVisitsCount,
        totalVisits: totalVisitsCount,
        upcomingAppointments: upcomingAppointmentsCount,
        totalAppointments: totalAppointmentsCount,
        staff: staffCount,
        resources: resourcesCount,
      },
      services: services.map((s) => ({
        id: s.id,
        name: s.name,
        queueCount: s.queues.length,
      })),
      queues: queueDetails,
    };
  }

  async exportLocationDataZip(id: string, tenantId: string) {
    const location = await this.prisma.location.findFirst({
      where: { id, tenantId },
      include: {
        services: {
          include: {
            queues: true,
            serviceFlow: { include: { steps: true } },
          },
        },
      },
    });

    if (!location) throw new NotFoundException('Location not found');

    const serviceIds = location.services.map((s) => s.id);

    const queues = await this.prisma.queue.findMany({
      where: {
        tenantId,
        OR: [
          { locationId: id },
          { services: { some: { id: { in: serviceIds } } } },
        ],
      },
      include: { services: true },
    });

    const visits = await this.prisma.visit.findMany({
      where: { locationId: id, tenantId },
      include: { customer: true, service: true, queue: true, staff: true },
      take: 10000,
      orderBy: { createdAt: 'desc' },
    });

    const appointments = await this.prisma.appointment.findMany({
      where: { locationId: id, tenantId },
      include: { customer: true, service: true, staff: true },
      take: 10000,
      orderBy: { scheduledStart: 'desc' },
    });

    const staff = await this.prisma.staff.findMany({
      where: { locationId: id, tenantId },
    });

    const resources = await this.prisma.resource.findMany({
      where: { locationId: id, tenantId },
    });

    const zip = new JSZip();

    // 1. Full JSON Dump & Metadata
    const fullDump = {
      exportedAt: new Date().toISOString(),
      location: {
        id: location.id,
        name: location.name,
        address: location.address,
        city: location.city,
        timezone: location.timezone,
        businessHours: location.businessHours,
        exceptionDates: location.exceptionDates,
        totalFloors: location.totalFloors,
      },
      servicesCount: location.services.length,
      queuesCount: queues.length,
      visitsCount: visits.length,
      appointmentsCount: appointments.length,
      staffCount: staff.length,
      resourcesCount: resources.length,
    };
    zip.file('metadata.json', JSON.stringify(fullDump, null, 2));
    zip.file('location.json', JSON.stringify(location, null, 2));

    // 2. Services CSV & JSON
    const servicesRows = location.services.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description || '',
      expectedDuration: s.expectedDuration || 0,
      basePrice: s.basePrice || 0,
      priceCurrency: s.priceCurrency || 'ZAR',
      allowAppointments: s.allowAppointments,
      allowProviderSelection: s.allowProviderSelection,
      createdAt: s.createdAt,
    }));
    zip.file('services.csv', objectsToCsv(servicesRows));
    zip.file('services.json', JSON.stringify(location.services, null, 2));

    // 3. Queues CSV & JSON
    const queuesRows = queues.map((q) => ({
      id: q.id,
      name: q.name,
      status: q.status,
      maxCapacity: q.maxCapacity || '',
      linkedServices: q.services.map((s) => s.name).join('; '),
      createdAt: q.createdAt,
    }));
    zip.file('queues.csv', objectsToCsv(queuesRows));
    zip.file('queues.json', JSON.stringify(queues, null, 2));

    // 4. Visits CSV & JSON
    const visitsRows = visits.map((v) => ({
      id: v.id,
      displayId: v.displayId || '',
      customerName: v.customer?.name || '',
      customerPhone: v.customer?.phone || '',
      customerEmail: v.customer?.email || '',
      serviceName: v.service?.name || '',
      queueName: v.queue?.name || '',
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

    // 5. Appointments CSV & JSON
    const appointmentsRows = appointments.map((a) => ({
      id: a.id,
      customerName: a.customer?.name || '',
      customerPhone: a.customer?.phone || '',
      customerEmail: a.customer?.email || '',
      serviceName: a.service?.name || '',
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

    // 6. Staff & Resources CSV
    const staffRows = staff.map((s) => ({
      id: s.id,
      name: s.name,
      title: s.title || '',
      status: s.status,
      createdAt: s.createdAt,
    }));
    zip.file('staff.csv', objectsToCsv(staffRows));

    const resourcesRows = resources.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type || '',
      status: r.status,
      createdAt: r.createdAt,
    }));
    zip.file('resources.csv', objectsToCsv(resourcesRows));

    const buffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    const safeName = location.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `location_${safeName}_backup_${dateStr}.zip`;

    return { filename, buffer };
  }

  async remove(
    id: string,
    tenantId: string,
    options?: { deleteQueues?: boolean; archiveData?: boolean },
  ) {
    const location = await this.findOne(id, tenantId);
    const shouldDeleteQueues = options?.deleteQueues !== false; // default true

    return this.prisma.$transaction(async (tx) => {
      // 1. Find all services of this location
      const locationServices = await tx.service.findMany({
        where: { locationId: id, tenantId },
        select: { id: true },
      });
      const serviceIds = locationServices.map((s) => s.id);

      // 2. Find queues related to this location or its services
      const relatedQueues = await tx.queue.findMany({
        where: {
          tenantId,
          OR: [
            { locationId: id },
            { services: { some: { id: { in: serviceIds } } } },
          ],
        },
        include: { services: true },
      });

      const queueIdsToDelete: string[] = [];
      const queueIdsToDisconnect: string[] = [];

      for (const q of relatedQueues) {
        // A queue is exclusive if it belongs to this location, has no services,
        // or all its services belong to this location
        const isExclusive =
          q.locationId === id ||
          q.services.length === 0 ||
          q.services.every((s) => serviceIds.includes(s.id));

        if (isExclusive || shouldDeleteQueues) {
          queueIdsToDelete.push(q.id);
        } else {
          queueIdsToDisconnect.push(q.id);
        }
      }

      // 3. For queues shared with other locations/services: disconnect and unlink location
      for (const qId of queueIdsToDisconnect) {
        await tx.queue.update({
          where: { id: qId },
          data: {
            locationId: null,
            services: {
              disconnect: serviceIds.map((sId) => ({ id: sId })),
            },
          },
        });
      }

      // 4. Delete exclusive / marked queues cleanly
      if (queueIdsToDelete.length > 0) {
        await tx.blockOff.deleteMany({
          where: { queueId: { in: queueIdsToDelete } },
        });

        await tx.visit.updateMany({
          where: { queueId: { in: queueIdsToDelete } },
          data: { queueId: null },
        });

        await tx.queue.deleteMany({
          where: { id: { in: queueIdsToDelete } },
        });
      }

      // 5. Delete service flows for services of this location
      if (serviceIds.length > 0) {
        await tx.serviceFlow.deleteMany({
          where: { serviceId: { in: serviceIds } },
        });
      }

      // 6. Delete location (cascades services, visits, appointments, staff cleanly)
      await tx.location.delete({
        where: { id: location.id },
      });

      return {
        success: true,
        deletedLocationId: location.id,
        deletedQueuesCount: queueIdsToDelete.length,
        disconnectedQueuesCount: queueIdsToDisconnect.length,
      };
    });
  }
}

