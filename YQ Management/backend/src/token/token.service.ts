import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { QueueService } from '../queue/queue.service';
import { TokenStatus } from '@prisma/client';
import { TemplateService } from '../communication/templates/template.service';

@Injectable()
export class TokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly notificationsService: NotificationsService,
    private readonly webhooksService: WebhooksService,
    private readonly whatsappService: WhatsappService,
    private readonly queueService: QueueService,
    private readonly templateService: TemplateService,
  ) {}

  async requestOtp(phone: string, queueId: string) {
    const queue = await this.prisma.queue.findUnique({
      where: { id: queueId },
      include: { tenant: true },
    });

    if (!queue) {
      throw new BadRequestException('Queue not found');
    }

    if (!queue.tenant?.whatsappConnected || !queue.tenant?.whatsappInstanceId) {
      throw new ServiceUnavailableException(
        'WhatsApp is not connected for this tenant. Proceeding without OTP verification.',
      );
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await this.redisService.client.set(`otp:${phone}`, otp, 'EX', 300); // 5 mins
    const message = await this.templateService.renderWhatsAppForWorkspace(
      queue.workspaceId,
      'otp',
      { otp },
    );
    await this.notificationsService.sendWhatsAppMessage(
      phone,
      message,
      queue.tenantId,
    );
    return { success: true, message: 'OTP sent' };
  }

  private async generateDisplayId(
    queueId: string,
    tokenDisplayConfig: any,
  ): Promise<{ displayId: string; updatedConfig: any }> {
    const config = tokenDisplayConfig || {};
    const mode = config.generationMode || 'random';
    const format = config.format || 'alphanumeric';
    const prefix = config.prefix || 'CC';

    let numberPart: string;

    if (mode === 'sequential') {
      const counter = await this.redisService.client.incr(
        `queue:${queueId}:sequence`,
      );
      numberPart = counter.toString();
      return {
        displayId:
          format === 'alphanumeric' ? `${prefix}${numberPart}` : numberPart,
        updatedConfig: { ...config, counter },
      };
    } else {
      numberPart = Math.floor(1000 + Math.random() * 9000).toString();
      return {
        displayId:
          format === 'alphanumeric' ? `${prefix}${numberPart}` : numberPart,
        updatedConfig: config,
      };
    }
  }

  async joinQueue(
    queueId: string,
    customerName: string,
    phone?: string,
    otp?: string,
    formResponses?: any,
    language: string = 'en',
    scheduledFor?: string,
  ) {
    // If an OTP is provided, verify it
    if (otp && phone) {
      const storedOtp = await this.redisService.client.get(`otp:${phone}`);
      if (!storedOtp || storedOtp !== otp) {
        throw new BadRequestException('Invalid or expired OTP');
      }
      await this.redisService.client.del(`otp:${phone}`);
    }

    let purpose: string | null = null;
    const queue = await this.prisma.queue.findUnique({
      where: { id: queueId },
      include: { tenant: true },
    });
    if (queue && queue.formConfig && Array.isArray(queue.formConfig)) {
      const purposeField = (queue.formConfig as any[]).find(
        (f: any) =>
          (f.type === 'dropdown' || f.id === 'purpose') &&
          f.label?.toLowerCase().includes('purpose'),
      );
      if (
        purposeField &&
        purposeField.id &&
        formResponses &&
        formResponses[purposeField.id]
      ) {
        purpose = formResponses[purposeField.id];
      }
    }

    const isAppointment = !!scheduledFor;
    const scheduledDate = scheduledFor ? new Date(scheduledFor) : null;

    const { displayId, updatedConfig } = await this.generateDisplayId(
      queueId,
      queue?.tokenDisplayConfig,
    );
    if (
      queue &&
      updatedConfig &&
      updatedConfig.counter !== (queue.tokenDisplayConfig as any)?.counter
    ) {
      await this.prisma.queue.update({
        where: { id: queueId },
        data: { tokenDisplayConfig: updatedConfig },
      });
    }

    if (isAppointment && !queue?.allowAppointments) {
      throw new BadRequestException(
        'This queue does not accept future appointments.',
      );
    }

    if (isAppointment && scheduledDate && scheduledDate <= new Date()) {
      throw new BadRequestException('Appointment time must be in the future.');
    }

    const token = await this.prisma.token.create({
      data: {
        queueId,
        customerName,
        phone,
        displayId,
        status: TokenStatus.WAITING,
        formResponses,
        purpose,
        language,
        isAppointment,
        scheduledFor: scheduledDate,
        checkedIn: !isAppointment,
      },
    });

    if (!isAppointment) {
      // Add to Redis ZSET and Broadcast event atomically
      const pipeline = this.redisService.client.multi();
      pipeline.zadd(`queue:${queueId}:waiting`, Date.now(), token.id);
      pipeline.publish(
        'queue_events',
        JSON.stringify({ type: 'TOKEN_JOINED', queueId, token }),
      );
      await pipeline.exec();
    } else {
      this.redisService.client.publish(
        'queue_events',
        JSON.stringify({ type: 'APPOINTMENT_CREATED', queueId, token }),
      );
    }

    // Send confirmation
    const displayCode =
      token.displayId || token.id.substring(0, 5).toUpperCase();
    if (phone) {
      let message = '';
      if (isAppointment) {
        message = await this.templateService.renderWhatsAppForWorkspace(
          queue?.workspaceId || null,
          'appointment_created',
          {
            name: customerName,
            date: scheduledDate?.toLocaleString(),
            token: displayCode,
            link: `${process.env.APP_URL || 'http://localhost:3001'}/customer/status/${token.id}`,
          },
        );
      } else {
        message = await this.templateService.renderWhatsAppForWorkspace(
          queue?.workspaceId || null,
          'queue_joined',
          {
            name: customerName,
            position: '1', // ETA and actual position can be fetched, simplified here
            link: `${process.env.APP_URL || 'http://localhost:3001'}/customer/status/${token.id}`,
          },
        );
      }
      if (message) {
        await this.notificationsService.sendWhatsAppMessage(
          phone,
          message,
          queue?.tenantId,
        );
      }
    }

    return token;
  }

  async advanceQueue(queueId: string, tenantId: string) {
    const queue = await this.prisma.queue.findUnique({
      where: { id: queueId },
      include: { tenant: true },
    });
    if (!queue || queue.tenantId !== tenantId) {
      throw new BadRequestException('Queue not found or unauthorized');
    }

    // End the currently serving token
    const currentlyServingId = await this.redisService.client.get(
      `queue:${queueId}:serving`,
    );
    if (currentlyServingId) {
      const updatedToken = await this.prisma.token.update({
        where: { id: currentlyServingId },
        data: {
          status: TokenStatus.COMPLETED,
          completedAt: new Date(),
        },
        include: { queue: true },
      });
      if (updatedToken.phone) {
        await this.whatsappService.requestFeedback(
          updatedToken.queue.tenantId,
          updatedToken.phone,
          updatedToken.language,
        );
      }
    }

    // Pop the next token
    const popped = await this.redisService.client.zpopmin(
      `queue:${queueId}:waiting`,
    );
    const nextTokenId = popped && popped.length > 0 ? popped[0] : null;
    if (!nextTokenId) {
      await this.redisService.client.del(`queue:${queueId}:serving`);
      return null;
    }

    const nextToken = await this.prisma.token.update({
      where: { id: nextTokenId },
      data: {
        status: TokenStatus.SERVING,
        servedAt: new Date(),
      },
    });

    const pipeline = this.redisService.client.multi();
    pipeline.set(`queue:${queueId}:serving`, nextToken.id);
    pipeline.publish(
      'queue_events',
      JSON.stringify({ type: 'QUEUE_ADVANCED', queueId, token: nextToken }),
    );
    await pipeline.exec();

    // Notify the serving token
    if (nextToken.phone) {
      const message = await this.templateService.renderWhatsAppForWorkspace(
        queue.workspaceId,
        'now_serving',
        {
          name: nextToken.customerName,
          queue_name: queue.name,
        },
      );
      if (message) {
        await this.notificationsService.sendWhatsAppMessage(
          nextToken.phone,
          message,
          queue.tenantId,
        );
      }
    }

    // Notify the next person in line
    const upcoming = await this.redisService.client.zrange(
      `queue:${queueId}:waiting`,
      0,
      0,
    );
    const upcomingTokenId =
      upcoming && upcoming.length > 0 ? upcoming[0] : null;
    if (upcomingTokenId) {
      const upcomingToken = await this.prisma.token.findUnique({
        where: { id: upcomingTokenId },
      });
      if (upcomingToken && upcomingToken.phone) {
        const message = await this.templateService.renderWhatsAppForWorkspace(
          queue.workspaceId,
          'near_turn',
          {
            name: upcomingToken.customerName,
            queue_name: queue.name,
          },
        );
        if (message) {
          await this.notificationsService.sendWhatsAppMessage(
            upcomingToken.phone,
            message,
            queue?.tenantId,
          );
        }
      }
    }

    return nextToken;
  }

  async completeToken(tokenId: string, tenantId: string) {
    return this.queueService.completeToken(tokenId, tenantId);
  }

  async getTokenStatus(tokenId: string) {
    const token = await this.prisma.token.findUnique({
      where: { id: tokenId },
      include: { queue: true },
    });
    if (!token) throw new NotFoundException('Token not found');

    if (token.status !== TokenStatus.WAITING) {
      return { token, position: 0, estimatedWaitTime: 0 };
    }

    if (token.isAppointment && !token.checkedIn) {
      return { token, position: 0, estimatedWaitTime: 0, isScheduled: true };
    }

    // Find position in Redis ZSET
    const rank = await this.redisService.client.zrank(
      `queue:${token.queueId}:waiting`,
      tokenId,
    );
    const position = rank !== null ? rank + 1 : 0;

    let avgServiceTime = 5; // Default 5 mins

    if (token.purpose) {
      const cacheKey = `queue:${token.queueId}:purpose:${token.purpose}:avg_time`;
      const cachedTime = await this.redisService.client.get(cacheKey);

      if (cachedTime) {
        avgServiceTime = parseInt(cachedTime, 10);
      } else {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const completedTokens = await this.prisma.token.findMany({
          where: {
            queueId: token.queueId,
            purpose: token.purpose,
            status: TokenStatus.COMPLETED,
            completedAt: { not: null },
            servedAt: { not: null, gte: sevenDaysAgo },
          },
          select: { servedAt: true, completedAt: true },
        });

        if (completedTokens.length > 0) {
          const totalDiff = completedTokens.reduce((acc, t) => {
            return acc + (t.completedAt!.getTime() - t.servedAt!.getTime());
          }, 0);
          // Convert ms to minutes, ensuring at least 1 min
          avgServiceTime = Math.max(
            1,
            Math.floor(totalDiff / completedTokens.length / 60000),
          );
        }

        // Cache the result for 10 minutes to prevent DB hammering
        await this.redisService.client.set(
          cacheKey,
          avgServiceTime.toString(),
          'EX',
          600,
        );
      }
    }

    const estimatedWaitTime = position * avgServiceTime;

    return { token, position, estimatedWaitTime };
  }

  async validateToken(tokenId: string, tenantId: string) {
    const token = await this.prisma.token.findUnique({
      where: { id: tokenId },
      include: { queue: true },
    });
    if (!token || token.queue.tenantId !== tenantId) {
      return { valid: false, reason: 'Invalid Token or unauthorized' };
    }

    const servingTokenId = await this.redisService.client.get(
      `queue:${token.queueId}:serving`,
    );

    if (token.id === servingTokenId) return { valid: true, status: 'Green' };

    return { valid: false, status: 'Red', reason: 'Not currently serving' };
  }

  async cancelToken(tokenId: string) {
    const token = await this.prisma.token.findUnique({
      where: { id: tokenId },
      include: { queue: true },
    });
    if (!token) throw new NotFoundException('Token not found');

    const updatedToken = await this.prisma.token.update({
      where: { id: tokenId },
      data: { status: TokenStatus.MISSED },
    });

    const pipeline = this.redisService.client.multi();
    if (token.status === TokenStatus.WAITING) {
      pipeline.zrem(`queue:${token.queueId}:waiting`, tokenId);
    }
    pipeline.publish(
      'queue_events',
      JSON.stringify({
        type: 'TOKEN_CANCELLED',
        queueId: token.queueId,
        token: updatedToken,
      }),
    );
    await pipeline.exec();

    const queue = await this.prisma.queue.findUnique({
      where: { id: token.queueId },
    });
    if (queue) {
      this.webhooksService.triggerWebhooks(
        queue.tenantId,
        'TOKEN_CANCELLED',
        updatedToken,
      );
    }

    return updatedToken;
  }

  async transferToken(id: string, nextQueueId: string, tenantId: string) {
    const token = await this.prisma.token.findUnique({
      where: { id },
      include: { queue: true },
    });
    if (!token) {
      throw new HttpException('Token not found', HttpStatus.NOT_FOUND);
    }
    if (token.queue.tenantId !== tenantId) {
      throw new HttpException(
        'Unauthorized access to tenant resources',
        HttpStatus.FORBIDDEN,
      );
    }

    // Remove from current queue's serving key if it's there
    const servingTokenId = await this.redisService.client.get(
      `queue:${token.queueId}:serving`,
    );
    if (servingTokenId === id) {
      await this.redisService.client.del(`queue:${token.queueId}:serving`);
    } else if (token.status === TokenStatus.WAITING) {
      // Remove from old queue sorted set
      await this.redisService.client.zrem(`queue:${token.queueId}:waiting`, id);
    }

    const updatedToken = await this.prisma.token.update({
      where: { id: id },
      data: {
        queueId: nextQueueId,
        status: TokenStatus.WAITING,
        joinedAt: new Date(), // Reset join time for the new queue
        servedAt: null,
      },
    });

    // Add to new queue in Redis and Broadcast events
    const pipeline = this.redisService.client.multi();
    pipeline.zadd(`queue:${nextQueueId}:waiting`, Date.now(), updatedToken.id);
    pipeline.publish(
      'queue_events',
      JSON.stringify({
        type: 'TOKEN_TRANSFERRED',
        oldQueueId: token.queueId,
        newQueueId: nextQueueId,
        token: updatedToken,
      }),
    );
    await pipeline.exec();

    // Webhook Trigger
    const queue = await this.prisma.queue.findUnique({
      where: { id: token.queueId },
    });
    if (queue) {
      this.webhooksService.triggerWebhooks(
        queue.tenantId,
        'TOKEN_TRANSFERRED',
        updatedToken,
      );
    }

    // Notify customer
    if (updatedToken.phone) {
      const newQueue = await this.prisma.queue.findUnique({
        where: { id: nextQueueId },
      });
      const message = await this.templateService.renderWhatsAppForWorkspace(
        queue?.workspaceId || null,
        'transferred',
        {
          queue_name: newQueue?.name,
        },
      );
      if (message) {
        await this.notificationsService.sendWhatsAppMessage(
          updatedToken.phone,
          message,
          newQueue?.tenantId,
        );
      }
    }

    return updatedToken;
  }

  async checkIn(tokenId: string, tenantId?: string) {
    const token = await this.prisma.token.findUnique({
      where: { id: tokenId },
      include: { queue: true },
    });
    if (!token) throw new NotFoundException('Token not found');

    if (tenantId) {
      const tenantQueue = await this.prisma.queue.findFirst({
        where: { id: token.queueId, tenantId },
      });
      if (!tenantQueue) throw new NotFoundException('Token not found');
    }

    if (token.checkedIn || token.status !== TokenStatus.WAITING) return token;

    const updatedToken = await this.prisma.token.update({
      where: { id: tokenId },
      data: { checkedIn: true, joinedAt: new Date() }, // Refresh joinedAt to now so ETA is accurate
    });

    const pipeline = this.redisService.client.multi();
    pipeline.zadd(
      `queue:${token.queueId}:waiting`,
      Date.now(),
      updatedToken.id,
    );
    pipeline.publish(
      'queue_events',
      JSON.stringify({
        type: 'TOKEN_JOINED',
        queueId: token.queueId,
        token: updatedToken,
      }),
    );
    await pipeline.exec();

    if (updatedToken.phone) {
      const queueData = token.queue;
      const message = await this.templateService.renderWhatsAppForWorkspace(
        queueData.workspaceId,
        'checked_in',
        {
          name: updatedToken.customerName,
          link: `${process.env.APP_URL || 'http://localhost:3001'}/customer/status/${updatedToken.id}`,
        },
      );
      if (message) {
        await this.notificationsService.sendWhatsAppMessage(
          updatedToken.phone,
          message,
          token.queue.tenantId,
        );
      }
    }
    return updatedToken;
  }
}
