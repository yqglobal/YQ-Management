import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BillingConfigService } from '../billing/config/billing-config.service';
import { ProviderRegistry } from '../billing/providers/provider-registry.service';
import { PaymentProviderName } from '@prisma/client';
import { WebhookEventType } from '@prisma/client';
import { WebhookProcessingStatus } from '@prisma/client';
import { ProcessWebhookDto } from './dto/webhook.dto';
import { SubscriptionService } from '../subscription/subscription.service';
import { PaymentsService } from '../payments/payments.service';
import { BillingException } from '../billing/errors/billing-exceptions';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class WebhookProcessService {
  private readonly logger = new Logger(WebhookProcessService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: BillingConfigService,
    private readonly providerRegistry: ProviderRegistry,
    private readonly subscriptionService: SubscriptionService,
    private readonly paymentsService: PaymentsService,
    private readonly redisService: RedisService,
  ) {}

  async processPaymentWebhook(
    body: any,
    headers: any,
  ): Promise<{ success: boolean }> {
    const providerEventId =
      headers['x-ozow-event-id'] || body.id || body.eventId;

    // Strict Redis Lock for Idempotency
    const lockKey = `webhook_lock:${providerEventId || body.TransactionReference}`;
    const acquiredLock = await this.redisService.client.set(
      lockKey,
      '1',
      'EX',
      3600,
      'NX',
    );
    if (!acquiredLock) {
      this.logger.log(
        `Webhook already processing for ${lockKey}, dropping duplicate`,
      );
      return { success: true };
    }

    const existing = await this.prisma.webhookEvent.findFirst({
      where: {
        eventType: this.mapEventType(body.Status),
        transactionId: body.TransactionReference,
      },
    });

    if (existing) {
      this.logger.log(
        `Duplicate webhook detected for transaction ${body.TransactionReference}, returning 200`,
      );
      return { success: true };
    }

    const webhookEvent = await this.prisma.webhookEvent.create({
      data: {
        tenantId: body.tenantId || body.tenantId || 'unknown',
        eventType: this.mapEventType(body.Status),
        
        transactionId: body.TransactionReference || undefined,
        payload: body,
        processingStatus: WebhookProcessingStatus.PROCESSING,
      },
    });

    try {
      const provider = this.providerRegistry.getProvider(
        PaymentProviderName.OZOW,
      );
      const sig = headers['x-ozow-signature'] || body.signature || '';
      const verification = await provider.verifyWebhook({
        payload: body,
        headers: Object.fromEntries(Object.entries(headers)),
        signature: sig,
      });

      await this.prisma.$transaction(async (tx) => {
        await tx.webhookEvent.update({
          where: { id: webhookEvent.id },
          data: {
            signatureValid: verification.valid,
            processingResult: JSON.stringify({
              tenantValid: !!verification.tenantId,
              transactionValid: !!verification.transactionId,
              amountValid: !!verification.amount,
              currencyValid: !!verification.currency,
            }),
          },
        });

        if (!verification.valid) {
          await tx.webhookEvent.update({
            where: { id: webhookEvent.id },
            data: {
              processingStatus: WebhookProcessingStatus.FAILED,
              processingResult: 'Signature verification failed',
            },
          });
          throw new BillingException('Webhook signature verification failed');
        }

        const TransactionReference = body.TransactionReference;
        const Status = body.Status;

        if (!TransactionReference) {
          await tx.webhookEvent.update({
            where: { id: webhookEvent.id },
            data: {
              processingStatus: WebhookProcessingStatus.FAILED,
              processingResult: 'Missing TransactionReference',
            },
          });
          throw new BillingException('Missing TransactionReference');
        }

        if (TransactionReference) {
          const transaction = await tx.transaction.findFirst({
            where: { transactionRef: TransactionReference },
          });

          if (!transaction) {
            await tx.webhookEvent.update({
              where: { id: webhookEvent.id },
              data: {
                processingStatus: WebhookProcessingStatus.FAILED,
                processingResult: 'Transaction not found',
              },
            });
            throw new BillingException(
              `Transaction ${TransactionReference} not found`,
            );
          }

          await tx.webhookEvent.update({
            where: { id: webhookEvent.id },
            data: { transactionId: transaction.id },
          });

          await tx.transaction.update({
            where: { id: transaction.id },
            data: {
              status:
                Status === 'Complete'
                  ? 'SUCCESS'
                  : Status === 'Cancelled'
                    ? 'CANCELLED'
                    : 'FAILED',
              rawProviderResponse: body,
            },
          });

          if (Status === 'Complete' && transaction.tenantId) {
            await tx.workspace.update({
              where: { id: transaction.tenantId },
              data: {},
            });

            const subscription = await tx.subscription.findUnique({
              where: { tenantId: transaction.tenantId },
            });

            if (subscription) {
              const periodDays =
                subscription.billingInterval === 'YEARLY' ? 365 : 30;
              await tx.subscription.update({
                where: { id: subscription.id },
                data: {
                  status: 'ACTIVE',
                  currentPeriodStart: new Date(),
                  currentPeriodEnd: new Date(
                    Date.now() + periodDays * 24 * 60 * 60 * 1000,
                  ),
                  nextBillingDate: new Date(
                    Date.now() + periodDays * 24 * 60 * 60 * 1000,
                  ),
                  renewalDate: new Date(),
                },
              });
            }
          }
        }

        await tx.webhookEvent.update({
          where: { id: webhookEvent.id },
          data: {
            processingStatus: WebhookProcessingStatus.SUCCESS,
            processingResult: 'Processed successfully',
            processedAt: new Date(),
          },
        });
      });

      return { success: true };
    } catch (error) {
      await this.prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          processingStatus: WebhookProcessingStatus.FAILED,
          processingResult:
            error instanceof Error ? error.message : 'Unknown error',
        },
      });
      this.logger.error(
        `Webhook processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  private mapEventType(status: string): WebhookEventType {
    const statusMap: Record<string, WebhookEventType> = {
      Complete: WebhookEventType.PAYMENT_SUCCESS,
      Cancelled: WebhookEventType.PAYMENT_FAILED,
      Pending: WebhookEventType.PAYMENT_PENDING,
      Verified: WebhookEventType.PAYMENT_SUCCESS,
      Expired: WebhookEventType.PAYMENT_FAILED,
    };
    return statusMap[status] || WebhookEventType.PAYMENT_PENDING;
  }

  async getWebhookEvents(tenantId: string, offset = 0, limit = 50) {
    return this.prisma.webhookEvent.findMany({
      where: { tenantId },
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getWebhookEvent(id: string) {
    return this.prisma.webhookEvent.findUnique({ where: { id } });
  }
}
