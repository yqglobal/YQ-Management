import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getUsage(tenantId: string, periodStart?: Date, periodEnd?: Date) {
    const start =
      periodStart || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = periodEnd || new Date();

    const usage = await this.prisma.tenantUsage.findMany({
      where: {
        tenantId,
        periodStart: { gte: start },
        periodEnd: { lte: end },
      },
      orderBy: { periodStart: 'asc' },
    });

    if (usage.length === 0) {
      return {
        tenantId,
        periodStart: start,
        periodEnd: end,
        activeQueues: 0,
        queueJoins: 0,
        operators: 0,
        branches: 0,
        whatsappMessages: 0,
        aiRequests: 0,
        storageBytes: 0,
        apiCalls: 0,
        currentPeriod: {
          activeQueues: 0,
          queueJoins: 0,
          operators: 0,
          branches: 0,
          whatsappMessages: 0,
          aiRequests: 0,
          storageBytes: 0,
          apiCalls: 0,
        },
      };
    }

    const currentPeriod = usage[usage.length - 1];

    return {
      tenantId,
      periodStart: start,
      periodEnd: end,
      activeQueues: currentPeriod.activeQueues,
      queueJoins: currentPeriod.queueJoins,
      operators: currentPeriod.operators,
      branches: currentPeriod.branches,
      whatsappMessages: currentPeriod.whatsappMessages,
      aiRequests: currentPeriod.aiRequests,
      storageBytes: currentPeriod.storageBytes,
      apiCalls: currentPeriod.apiCalls,
      history: usage,
      currentPeriod: {
        activeQueues: currentPeriod.activeQueues,
        queueJoins: currentPeriod.queueJoins,
        operators: currentPeriod.operators,
        branches: currentPeriod.branches,
        whatsappMessages: currentPeriod.whatsappMessages,
        aiRequests: currentPeriod.aiRequests,
        storageBytes: currentPeriod.storageBytes,
        apiCalls: currentPeriod.apiCalls,
      },
    };
  }

  async recordUsage(
    tenantId: string,
    data: {
      activeQueues?: number;
      queueJoins?: number;
      operators?: number;
      branches?: number;
      whatsappMessages?: number;
      aiRequests?: number;
      storageBytes?: number;
      apiCalls?: number;
    },
  ) {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    let usage = await this.prisma.tenantUsage.findFirst({
      where: {
        tenantId,
        periodStart,
      },
    });

    if (usage) {
      usage = await this.prisma.tenantUsage.update({
        where: { id: usage.id },
        data: {
          activeQueues: (usage.activeQueues || 0) + (data.activeQueues ?? 0),
          queueJoins: (usage.queueJoins || 0) + (data.queueJoins ?? 0),
          operators: (usage.operators || 0) + (data.operators ?? 0),
          branches: (usage.branches || 0) + (data.branches ?? 0),
          whatsappMessages:
            (usage.whatsappMessages || 0) + (data.whatsappMessages ?? 0),
          aiRequests: (usage.aiRequests || 0) + (data.aiRequests ?? 0),
          storageBytes:
            Number(usage.storageBytes) + Number(data.storageBytes ?? 0),
          apiCalls: (usage.apiCalls || 0) + (data.apiCalls ?? 0),
          updatedAt: now,
        },
      });
    } else {
      usage = await this.prisma.tenantUsage.create({
        data: {
          tenantId,
          periodStart,
          periodEnd,
          activeQueues: data.activeQueues ?? 0,
          queueJoins: data.queueJoins ?? 0,
          operators: data.operators ?? 0,
          branches: data.branches ?? 0,
          whatsappMessages: data.whatsappMessages ?? 0,
          aiRequests: data.aiRequests ?? 0,
          storageBytes: Number(data.storageBytes ?? 0),
          apiCalls: data.apiCalls ?? 0,
        },
      });
    }

    this.logger.log(`Usage recorded for tenant ${tenantId}`);
    return usage;
  }
}
