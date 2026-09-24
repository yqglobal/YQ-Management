import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SlaPolicyService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.slaPolicy.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: { services: true }
        }
      }
    });
  }

  async create(tenantId: string, data: any) {
    return this.prisma.slaPolicy.create({
      data: {
        name: data.name,
        warningThresholdMins: data.warningThresholdMins,
        breachThresholdMins: data.breachThresholdMins,
        escalationPhones: data.escalationPhones || [],
        tenantId,
      }
    });
  }

  async update(id: string, tenantId: string, data: any) {
    const policy = await this.prisma.slaPolicy.findFirst({
      where: { id, tenantId }
    });
    if (!policy) throw new NotFoundException('SLA Policy not found');

    return this.prisma.slaPolicy.update({
      where: { id },
      data: {
        name: data.name,
        warningThresholdMins: data.warningThresholdMins,
        breachThresholdMins: data.breachThresholdMins,
        escalationPhones: data.escalationPhones,
      }
    });
  }

  async remove(id: string, tenantId: string) {
    const policy = await this.prisma.slaPolicy.findFirst({
      where: { id, tenantId }
    });
    if (!policy) throw new NotFoundException('SLA Policy not found');

    // Remove relations first
    await this.prisma.service.updateMany({
      where: { slaPolicyId: id },
      data: { slaPolicyId: null }
    });

    return this.prisma.slaPolicy.delete({
      where: { id }
    });
  }
}
