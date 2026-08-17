import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LocationService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, data: { name: string; address?: string; city?: string }) {
    return this.prisma.extendedClient.location.create({
      data: {
        tenantId,
        name: data.name,
        address: data.address,
        city: data.city,
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.extendedClient.location.findMany({
      where: { tenantId },
      include: { services: true },
    });
  }

  async findOne(id: string, tenantId: string) {
    const location = await this.prisma.extendedClient.location.findFirst({
      where: { id, tenantId },
      include: { services: true },
    });
    if (!location) throw new NotFoundException('Location not found');
    return location;
  }

  async update(
    id: string,
    tenantId: string,
    data: { name?: string; address?: string; city?: string },
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

  async remove(id: string, tenantId: string) {
    const exists = await this.findOne(id, tenantId);
    return this.prisma.extendedClient.location.delete({
      where: { id: exists.id },
    });
  }
}
