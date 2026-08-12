import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(
    userId: string | null,
    tenantId: string | null,
    customerId: string | null,
    action: string,
    resource: string | null,
    resourceId?: string | null,
    endpoint?: string | null,
    method?: string | null,
    statusCode?: number | null,
    durationMs?: number | null,
    details?: Record<string, unknown>,
    ipAddress?: string | null,
    userAgent?: string | null,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId,
          userId,
          customerId,
          action,
          resource,
          resourceId,
          endpoint,
          method,
          statusCode,
          durationMs,
          details: details as any,
          ipAddress,
          userAgent,
        },
      });
      this.logger.log(`Audit: ${action} ${resource || ''} ${resourceId || ''}`);
    } catch (error) {
      this.logger.error(
        `Failed to create audit log: ${action} ${resource}`,
        error,
      );
    }
  }

  async getLogsForTenant(
    tenantId: string, 
    skip = 0, 
    take = 50,
    filters?: { action?: string; status?: string; startDate?: string; endDate?: string }
  ) {
    const where: Prisma.AuditLogWhereInput = { tenantId };

    if (filters?.action) {
      where.action = { contains: filters.action, mode: 'insensitive' };
    }

    if (filters?.status) {
      if (filters.status === 'success') {
        where.statusCode = { gte: 200, lt: 400 };
      } else if (filters.status === 'error') {
        where.statusCode = { gte: 400 };
      }
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate);
      }
    }

    const [rawLogs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.auditLog.count({
        where,
      }),
    ]);

    const userIds = Array.from(new Set(rawLogs.map(l => l.userId).filter(Boolean))) as string[];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, role: true },
    });
    
    const userMap = new Map(users.map(u => [u.id, u]));

    const data = rawLogs.map(log => ({
      ...log,
      user: log.userId ? userMap.get(log.userId) : null,
    }));

    return { data, total, skip, take };
  }
}
