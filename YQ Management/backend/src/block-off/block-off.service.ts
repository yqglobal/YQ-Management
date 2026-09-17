import { Injectable, BadRequestException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueueGateway } from '../queue/queue.gateway';

@Injectable()
export class BlockOffService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => QueueGateway))
    private readonly queueGateway: QueueGateway,
  ) {}

  async createBlockOff(tenantId: string, data: { locationId?: string; queueId?: string; startTime: string; endTime: string; reason?: string }) {
    if (new Date(data.startTime) >= new Date(data.endTime)) {
      throw new BadRequestException('End time must be after start time');
    }

    const blockOff = await this.prisma.blockOff.create({
      data: {
        tenantId,
        locationId: data.locationId,
        queueId: data.queueId,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        reason: data.reason,
      },
    });

    if (data.locationId || data.queueId) {
      this.queueGateway.broadcastTenantUpdate(tenantId, 'blockoff_created', blockOff);
    }
    
    return blockOff;
  }

  async getBlockOffs(tenantId: string, locationId?: string, queueId?: string) {
    return this.prisma.blockOff.findMany({
      where: {
        tenantId,
        ...(locationId ? { locationId } : {}),
        ...(queueId ? { queueId } : {}),
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async deleteBlockOff(tenantId: string, id: string) {
    const blockOff = await this.prisma.blockOff.findUnique({
      where: { id },
    });

    if (!blockOff || blockOff.tenantId !== tenantId) {
      throw new NotFoundException('Block-off not found');
    }

    await this.prisma.blockOff.delete({ where: { id } });

    if (blockOff.locationId || blockOff.queueId) {
      this.queueGateway.broadcastTenantUpdate(tenantId, 'blockoff_deleted', { id });
    }

    return { success: true };
  }

  async isTimeBlocked(tenantId: string, locationId: string | null, queueId: string | null, time: Date): Promise<{ blocked: boolean; reason?: string }> {
    const blockOffs = await this.prisma.blockOff.findMany({
      where: {
        tenantId,
        startTime: { lte: time },
        endTime: { gte: time },
        OR: [
          { queueId: null, locationId: null },
          { locationId, queueId: null },
          { queueId }
        ]
      },
    });

    if (blockOffs.length > 0) {
      return { blocked: true, reason: blockOffs[0].reason || 'Time slot is blocked off' };
    }

    return { blocked: false };
  }
}
