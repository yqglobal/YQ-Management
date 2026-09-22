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
        events: { has: eventName },
      },
    });

    for (const endpoint of endpoints) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        let finalPayload: any = {
          event: eventName,
          data: payload,
          timestamp: new Date(),
        };

        if (endpoint.payloadFormat === 'FHIR_ENCOUNTER') {
          // Translate to a simplified FHIR Encounter
          finalPayload = {
            resourceType: "Encounter",
            status: payload.currentState === 'WAITING' ? 'planned' :
                    payload.currentState === 'ACTIVE' ? 'in-progress' :
                    payload.currentState === 'COMPLETED' ? 'finished' : 'unknown',
            class: {
              system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
              code: "AMB",
              display: "ambulatory"
            },
            subject: {
              reference: `Patient/${payload.customerId || 'unknown'}`,
              display: payload.customerName || "Walk-in"
            },
            period: {
              start: payload.serviceStart || payload.createdAt,
              end: payload.serviceEnd
            },
            location: [
              {
                location: {
                  reference: `Location/${payload.locationId || 'unknown'}`
                },
                status: "active"
              }
            ],
            // Include original payload in extension just in case
            extension: [
              {
                url: "http://yq.management/original-event",
                valueString: JSON.stringify(payload)
              }
            ]
          };
        } else if (endpoint.payloadFormat === 'SALESFORCE') {
          // Translate to a Salesforce custom object (e.g. Visit__c)
          finalPayload = {
            attributes: { type: "Visit__c" },
            External_ID__c: payload.id,
            Tenant_ID__c: payload.tenantId,
            Customer_Name__c: payload.customerName || "Walk-in",
            Status__c: payload.currentState,
            Service_ID__c: payload.serviceId,
            Wait_Time_Mins__c: payload.waitingStart && payload.serviceStart 
              ? (new Date(payload.serviceStart).getTime() - new Date(payload.waitingStart).getTime()) / 60000 
              : 0
          };
        }

        const res = await fetch(endpoint.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-yq-event': eventName,
          },
          body: JSON.stringify(finalPayload),
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
