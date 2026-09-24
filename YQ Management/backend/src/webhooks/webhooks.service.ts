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

    // Enhance payload with full database context if it's a Visit event
    let enrichedPayload = { ...payload };
    if (payload.visitId) {
      const fullVisit = await this.prisma.visit.findUnique({
        where: { id: payload.visitId as string },
        include: {
          customer: true,
          location: true,
          service: true,
          staff: true,
        },
      });
      if (fullVisit) {
        enrichedPayload = { ...enrichedPayload, ...fullVisit };
      }
    }

    let hasErrors = false;

    for (const endpoint of endpoints) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        let finalPayload: any = {
          event: eventName,
          data: enrichedPayload,
          timestamp: new Date(),
        };

        if (endpoint.payloadFormat === 'FHIR_ENCOUNTER') {
          // Translate to a simplified FHIR Encounter
          finalPayload = {
            resourceType: "Encounter",
            status: enrichedPayload.currentState === 'WAITING' ? 'planned' :
                    enrichedPayload.currentState === 'ACTIVE' ? 'in-progress' :
                    enrichedPayload.currentState === 'COMPLETED' ? 'finished' : 'unknown',
            class: {
              system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
              code: "AMB",
              display: "ambulatory"
            },
            subject: {
              reference: `Patient/${enrichedPayload.customerId || 'unknown'}`,
              display: enrichedPayload.customer?.name || enrichedPayload.customerName || "Walk-in"
            },
            period: {
              start: enrichedPayload.serviceStart || enrichedPayload.createdAt,
              end: enrichedPayload.serviceEnd
            },
            location: [
              {
                location: {
                  reference: `Location/${enrichedPayload.locationId || 'unknown'}`,
                  display: enrichedPayload.location?.name
                },
                status: "active"
              }
            ],
            // Include original payload in extension just in case
            extension: [
              {
                url: "http://yq.management/original-event",
                valueString: JSON.stringify(enrichedPayload)
              }
            ]
          };
        } else if (endpoint.payloadFormat === 'SALESFORCE') {
          // Translate to a Salesforce custom object (e.g. Visit__c)
          finalPayload = {
            attributes: { type: "Visit__c" },
            External_ID__c: enrichedPayload.id || enrichedPayload.visitId,
            Tenant_ID__c: enrichedPayload.tenantId,
            Customer_Name__c: enrichedPayload.customer?.name || enrichedPayload.customerName || "Walk-in",
            Status__c: enrichedPayload.currentState,
            Service_ID__c: enrichedPayload.serviceId,
            Wait_Time_Mins__c: enrichedPayload.waitingStart && enrichedPayload.serviceStart 
              ? (new Date(enrichedPayload.serviceStart).getTime() - new Date(enrichedPayload.waitingStart).getTime()) / 60000 
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
          throw new Error(`Webhook responded with ${res.status}`);
        }
        this.logger.log(
          `Triggered webhook ${eventName} for tenant ${tenantId} at ${endpoint.url}`,
        );
      } catch (error) {
        this.logger.error(`Failed to trigger webhook ${endpoint.url}`, error);
        hasErrors = true;
      }
    }

    if (hasErrors) {
      throw new Error(`One or more webhooks failed to deliver. Triggering BullMQ retry with Exponential Backoff.`);
    }
  }
}
