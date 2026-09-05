import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export enum CommunicationChannel {
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
}

export enum CommunicationStatus {
  QUEUED = 'queued',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  RETRYING = 'retrying',
}

@Injectable()
export class CommunicationLogService {
  private readonly logger = new Logger(CommunicationLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(entry: {
    tenantId?: string;
    channel: CommunicationChannel;
    type: string;
    recipient: string;
    subject?: string;
    body: string;
    status: CommunicationStatus;
    provider: string;
    providerId?: string;
    errorMessage?: string;
    metadata?: Record<string, any>;
  }) {
    try {
      await this.prisma.communicationLog.create({
        data: {
          tenantId: entry.tenantId,
          channel: entry.channel,
          type: entry.type,
          recipient: entry.recipient,
          subject: entry.subject,
          body: entry.body,
          status: entry.status,
          provider: entry.provider,
          providerId: entry.providerId,
          error: entry.errorMessage,
          sentAt:
            entry.status === CommunicationStatus.SENT ? new Date() : undefined,
          deliveredAt:
            entry.status === CommunicationStatus.DELIVERED
              ? new Date()
              : undefined,
          failedAt:
            entry.status === CommunicationStatus.FAILED
              ? new Date()
              : undefined,
        },
      });
    } catch (error) {
      this.logger.error('Failed to create communication log', error);
    }
  }

  async getLogs(tenantId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      this.prisma.communicationLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.communicationLog.count({ where: { tenantId } }),
    ]);
    return { logs, total, page, limit };
  }

  async getFailedLogs(tenantId?: string) {
    return this.prisma.communicationLog.findMany({
      where: {
        ...(tenantId ? { tenantId } : {}),
        status: CommunicationStatus.FAILED,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
