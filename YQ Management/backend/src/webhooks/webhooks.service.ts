import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private prisma: PrismaService) {}

  async createWebhook(
    tenantId: string,
    url: string,
    secret: string | null,
    events: string[],
  ) {
    return this.prisma.webhookEndpoint.create({
      data: { tenantId, url, secret, events },
    });
  }

  async getWebhooks(tenantId: string) {
    return this.prisma.webhookEndpoint.findMany({ where: { tenantId } });
  }

  async deleteWebhook(id: string, tenantId: string) {
    const endpoint = await this.prisma.webhookEndpoint.findFirst({
      where: { id, tenantId },
    });

    if (!endpoint) {
      throw new NotFoundException('Webhook not found');
    }

    return this.prisma.webhookEndpoint.delete({ where: { id } });
  }

  async triggerWebhooks(tenantId: string, eventName: string, payload: any) {
    const endpoints = await this.prisma.webhookEndpoint.findMany({
      where: {
        tenantId,
        active: true,
        events: { has: eventName },
      },
    });

    for (const endpoint of endpoints) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const res = await fetch(endpoint.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-yq-event': eventName,
          },
          body: JSON.stringify({
            event: eventName,
            data: payload,
            timestamp: new Date(),
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!res.ok) {
          throw new BadRequestException(`Webhook responded with ${res.status}`);
        }
        this.logger.log(
          `Triggered webhook ${eventName} for tenant ${tenantId} at ${endpoint.url}`,
        );
      } catch (error) {
        this.logger.error(`Failed to trigger webhook ${endpoint.url}`, error);
      }
    }
  }
}
