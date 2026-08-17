import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
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
    },
  ) {
    const service = await this.prisma.extendedClient.service.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description,
        expectedDuration: data.expectedDuration,
        locationId: data.locationId,
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
        queues: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            name: true,
            status: true,
            allowAppointments: true,
            appointmentGranularityMins: true,
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
    },
  ) {
    const { queueIds, ...restData } = data;
    const updateData: any = { ...restData };

    if (queueIds !== undefined) {
      updateData.queues = {
        set: queueIds.map((qId) => ({ id: qId })),
      };
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
}
