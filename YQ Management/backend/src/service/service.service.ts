import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ServiceService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, data: { name: string; description?: string; expectedDuration?: number; locationId?: string }) {
    return this.prisma.extendedClient.service.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description,
        expectedDuration: data.expectedDuration,
        locationId: data.locationId,
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.extendedClient.service.findMany({
      where: { tenantId },
      include: { location: true },
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

  async update(id: string, tenantId: string, data: { name?: string; description?: string; expectedDuration?: number; locationId?: string }) {
    return this.prisma.extendedClient.service.update({
      where: { id_tenantId: { id, tenantId } },
      data,
    }).catch(async () => {
        const exists = await this.findOne(id, tenantId);
        return this.prisma.extendedClient.service.update({
            where: { id: exists.id },
            data,
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
