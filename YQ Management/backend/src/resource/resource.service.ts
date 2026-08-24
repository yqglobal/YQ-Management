import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';

@Injectable()
export class ResourceService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, createResourceDto: CreateResourceDto) {
    const { serviceIds, ...rest } = createResourceDto;
    return this.prisma.resource.create({
      data: {
        ...rest,
        tenantId,
        services:
          serviceIds && serviceIds.length > 0
            ? { connect: serviceIds.map((id) => ({ id })) }
            : undefined,
      },
      include: { services: true },
    });
  }

  async findAll(tenantId: string, locationId?: string) {
    return this.prisma.resource.findMany({
      where: {
        tenantId,
        ...(locationId && { locationId }),
      },
      include: { services: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const resource = await this.prisma.resource.findFirst({
      where: { id, tenantId },
      include: { services: true },
    });
    if (!resource) {
      throw new NotFoundException(`Resource with ID ${id} not found`);
    }
    return resource;
  }

  async update(
    id: string,
    tenantId: string,
    updateResourceDto: UpdateResourceDto,
  ) {
    await this.findOne(id, tenantId); // verify exists
    const { serviceIds, ...rest } = updateResourceDto;
    return this.prisma.resource.update({
      where: { id },
      data: {
        ...rest,
        services:
          serviceIds !== undefined
            ? { set: serviceIds.map((id) => ({ id })) }
            : undefined,
      },
      include: { services: true },
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId); // verify exists
    return this.prisma.resource.delete({
      where: { id },
    });
  }
}
