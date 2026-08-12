import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';

@Injectable()
export class ResourceService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, createResourceDto: CreateResourceDto) {
    return this.prisma.resource.create({
      data: {
        ...createResourceDto,
        tenantId,
      },
    });
  }

  async findAll(tenantId: string, locationId?: string) {
    return this.prisma.resource.findMany({
      where: {
        tenantId,
        ...(locationId && { locationId }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const resource = await this.prisma.resource.findFirst({
      where: { id, tenantId },
    });
    if (!resource) {
      throw new NotFoundException(`Resource with ID ${id} not found`);
    }
    return resource;
  }

  async update(id: string, tenantId: string, updateResourceDto: UpdateResourceDto) {
    await this.findOne(id, tenantId); // verify exists
    return this.prisma.resource.update({
      where: { id },
      data: updateResourceDto,
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId); // verify exists
    return this.prisma.resource.delete({
      where: { id },
    });
  }
}
