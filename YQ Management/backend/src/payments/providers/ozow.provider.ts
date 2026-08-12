import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentProvider } from '../../billing/interfaces/payment-provider.interface';
import {
  CreateCheckoutInput,
  CheckoutResult,
} from '../../billing/interfaces/payment-provider.interface';
import { PaymentProviderName } from '@prisma/client';
import * as crypto from 'crypto';
import { BillingConfigService } from '../../billing/config/billing-config.service';

@Injectable()
export class OzowProvider implements PaymentProvider {
  readonly providerName = PaymentProviderName.OZOW;
  private readonly logger = new Logger(OzowProvider.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: BillingConfigService,
  ) {}

  async createCheckout(input: CreateCheckoutInput): Promise<CheckoutResult> {
    const provider = await this.prisma.paymentProvider.findFirst({
      where: { name: PaymentProviderName.OZOW, active: true },
    });

    if (!provider) {
      throw new BadRequestException('Ozow payment provider not configured');
    }

    const internalRef = `INR-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    const siteCode =
      provider.siteCode || process.env.OZOW_SITE_CODE || 'MOCK_SITE_CODE';
    const privateKey =
      provider.privateKey || process.env.OZOW_PRIVATE_KEY || '';
    const baseUrl =
      provider.baseUrl || process.env.BACKEND_URL || 'http://localhost:3000';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const sandboxMode =
      process.env.OZOW_SANDBOX !== undefined
        ? process.env.OZOW_SANDBOX === 'true' ||
          process.env.OZOW_SANDBOX === '1'
        : provider.sandboxEnabled === true;

    const bankReference = `QMOVA-${internalRef.substring(4, 12)}`;
    const amount = input.amount.toFixed(2);
    const countryCode = 'ZA';
    const currencyCode = input.currency || 'ZAR';
    const notifyUrl = `${baseUrl}/billing/payments/webhooks/ozow`;

    const payload = {
      siteCode,
      countryCode,
      currencyCode,
      amount,
      transactionReference: internalRef,
      bankReference,
      cancelUrl: `${frontendUrl}/dashboard/settings/billing?status=cancelled`,
      errorUrl: `${frontendUrl}/dashboard/settings/billing?status=error`,
      successUrl: `${frontendUrl}/dashboard/settings/billing?status=success`,
      notifyUrl,
      isTest: sandboxMode ? 'true' : 'false',
    };

    const stringToHash =
      `${payload.siteCode}${payload.countryCode}${payload.currencyCode}${payload.amount}${payload.transactionReference}${payload.bankReference}${payload.cancelUrl}${payload.errorUrl}${payload.successUrl}${payload.notifyUrl}${payload.isTest}${privateKey}`.toLowerCase();
    const hash = crypto.createHash('sha512').update(stringToHash).digest('hex');

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    return {
      checkoutUrl: sandboxMode
        ? 'https://sandbox.ozow.com/checkout'
        : 'https://pay.ozow.com/',
      paymentReference: internalRef,
      expiresAt,
      providerTransactionId: internalRef,
      hash,
    };
  }

  async verifyWebhook(input: {
    payload: Record<string, unknown>;
    headers: Record<string, unknown>;
    signature: string;
  }): Promise<{
    valid: boolean;
    eventId?: string;
    eventType?: string;
    workspaceId?: string;
    subscriptionId?: string;
    transactionId?: string;
    amount?: number;
    currency?: string;
  }> {
    const isValid = await this.validateSignature(
      input.payload,
      input.signature,
      this.configService.getOzowWebhookSecret(),
    );
    if (!isValid) {
      return { valid: false };
    }

    return {
      valid: true,
      eventId: (input.headers['x-ozow-event-id'] as string) || undefined,
      eventType: (input.headers['x-ozow-event-type'] as string) || undefined,
      workspaceId: (input.payload['workspaceId'] as string) || undefined,
      transactionId:
        (input.payload['TransactionReference'] as string) || undefined,
      amount: (input.payload['Amount'] as number) || undefined,
      currency: (input.payload['CurrencyCode'] as string) || undefined,
    };
  }

  async validateSignature(
    payload: object,
    signature: string,
    secret: string,
  ): Promise<boolean> {
    if (!signature || !secret) {
      return false;
    }
    const sortedKeys = Object.keys(payload).sort();
    const payloadString = sortedKeys
      .map(
        (k) =>
          `${k}=${JSON.stringify((payload as Record<string, unknown>)[k])}`,
      )
      .join('&');
    const expected = crypto
      .createHash('sha512')
      .update(payloadString + secret)
      .digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected),
    );
  }

  async refund(input: {
    transactionId: string;
    amount?: number;
    reason?: string;
  }): Promise<{ success: boolean; refundId?: string; status: string }> {
    this.logger.log(`Processing refund for transaction ${input.transactionId}`);
    return { success: true, refundId: `REF-${Date.now()}`, status: 'REFUNDED' };
  }

  async cancelSubscription(input: {
    subscriptionId: string;
    immediate?: boolean;
  }): Promise<{ success: boolean; cancelledAt?: Date; effectiveDate?: Date }> {
    this.logger.log(`Cancelling subscription ${input.subscriptionId}`);
    return {
      success: true,
      cancelledAt: new Date(),
      effectiveDate: input.immediate
        ? new Date()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
  }

  async getTransaction(input: { transactionId: string }): Promise<{
    id: string;
    status: string;
    amount: number;
    currency: string;
    providerTransactionId: string;
    rawResponse: Record<string, unknown> | null;
  }> {
    return {
      id: input.transactionId,
      status: 'SUCCESS',
      amount: 0,
      currency: 'ZAR',
      providerTransactionId: input.transactionId,
      rawResponse: null,
    };
  }

  async verifyPayment(input: {
    paymentReference: string;
    workspaceId: string;
  }): Promise<{
    verified: boolean;
    status: string;
    amount: number;
    currency: string;
    paidAt?: Date;
  }> {
    const transaction = await this.prisma.transaction.findFirst({
      where: { transactionRef: input.paymentReference },
    });

    if (!transaction) {
      return {
        verified: false,
        status: 'NOT_FOUND',
        amount: 0,
        currency: 'ZAR',
      };
    }

    return {
      verified: transaction.status === 'SUCCESS',
      status: transaction.status,
      amount: transaction.amount,
      currency: transaction.currency,
      paidAt: transaction.updatedAt,
    };
  }
}
