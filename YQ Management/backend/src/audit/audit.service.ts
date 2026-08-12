import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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

  async getLogsForTenant(tenantId: string, skip = 0, take = 50) {
    const [rawLogs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.auditLog.count({
        where: { tenantId },
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
