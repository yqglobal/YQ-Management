import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class SystemLogService {
  constructor(private readonly prisma: PrismaService) {}

  async getLogs(params: {
    skip?: number;
    take?: number;
    level?: string;
    tenantId?: string;
  }) {
    const { skip = 0, take = 50, level, tenantId } = params;
    
    const where: Prisma.SystemLogWhereInput = {};
    if (level) {
      where.level = level.toUpperCase();
    }
    if (tenantId) {
      where.tenantId = tenantId;
    }

    const [data, total] = await Promise.all([
      this.prisma.systemLog.findMany({
        skip,
        take,
        where,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.systemLog.count({ where }),
    ]);

    return { data, total, skip, take };
  }
}
