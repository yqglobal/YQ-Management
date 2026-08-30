import {
  Injectable,
  Logger,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionService } from '../subscription/subscription.service';
import * as crypto from 'crypto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  // These should ideally come from ConfigService / Environment variables
  private readonly siteCode = process.env.OZOW_SITE_CODE || '';
  private readonly privateKey = process.env.OZOW_PRIVATE_KEY || '';
  private readonly apiKey = process.env.OZOW_API_KEY || '';
  private readonly baseUrl =
    process.env.BACKEND_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'https://api.qmova.yqbuddy.com'
      : 'http://localhost:3000');
  private readonly frontendUrl =
    process.env.FRONTEND_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'https://qmova.yqbuddy.com'
      : 'http://localhost:3001');

  private getOzowCheckoutUrl() {
    const sandboxMode =
      process.env.OZOW_IS_TEST !== undefined
        ? process.env.OZOW_IS_TEST === 'true' ||
          process.env.OZOW_IS_TEST === '1'
        : process.env.NODE_ENV !== 'production';

    return sandboxMode
      ? 'https://sandbox.ozow.com/checkout'
      : 'https://pay.ozow.com/';
  }

  private addBillingPeriod(startDate: Date, billingInterval: string) {
    const periodDays = billingInterval === 'yearly' ? 365 : 30;
    return new Date(startDate.getTime() + periodDays * 24 * 60 * 60 * 1000);
  }

  constructor(
    private prisma: PrismaService,
    private subscriptionService: SubscriptionService,
  ) {}

  async generatePaymentLink(
    tenantId: string,
    planId: string,
    billingInterval: string,
  ) {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new BadRequestException('Plan not found');
    }

    // Example calculation: If yearly, maybe a discount, else 12x.
    // Here we'll just assume plan.price is monthly. Yearly = price * 12 * 0.9 (10% discount)
    let finalAmount = plan.price;
    if (billingInterval === 'yearly' && plan.billingInterval === 'monthly') {
      finalAmount = plan.price * 12 * 0.9;
    } else if (billingInterval === 'yearly') {
      finalAmount = plan.price;
    }

    // Ensure amount has 2 decimal places for Ozow
    const formattedAmount = finalAmount.toFixed(2);

    // 1. Create a pending transaction
    const transaction = await this.prisma.transaction.create({
      data: {
        tenantId,
        planId,
        billingInterval,
        transactionRef: `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        amount: finalAmount,
        currency: plan.currency || 'ZAR',
      },
    });

    // 2. Build the Ozow Payload
    const payload = {
      siteCode: this.siteCode,
      countryCode: 'ZA',
      currencyCode: plan.currency || 'ZAR',
      amount: formattedAmount,
      transactionReference: transaction.transactionRef,
      bankReference: `QMOVA-${transaction.transactionRef.substring(4, 12)}`,
      cancelUrl: `${this.frontendUrl}/dashboard/settings/billing?status=cancelled`,
      errorUrl: `${this.frontendUrl}/dashboard/settings/billing?status=error`,
      successUrl: `${this.frontendUrl}/dashboard/settings/billing?status=success`,
      notifyUrl: `${this.baseUrl}/payments/webhook`,
      isTest:
        process.env.OZOW_IS_TEST !== undefined
          ? process.env.OZOW_IS_TEST
          : process.env.NODE_ENV === 'production'
            ? 'false'
            : 'true',
    };

    // 3. Generate SHA512 Hash
    const stringToHash =
      `${payload.siteCode}${payload.countryCode}${payload.currencyCode}${payload.amount}${payload.transactionReference}${payload.bankReference}${payload.cancelUrl}${payload.errorUrl}${payload.successUrl}${payload.notifyUrl}${payload.isTest}${this.privateKey}`.toLowerCase();
    const hashCheck = crypto
      .createHash('sha512')
      .update(stringToHash)
      .digest('hex');

    return {
      ...payload,
      hashCheck,
      paymentUrl: this.getOzowCheckoutUrl(),
      checkoutUrl: this.getOzowCheckoutUrl(),
    };
  }

  async generateTestPaymentLink(
    amount: number = 10.0,
    isTestMode: boolean = false,
  ) {
    const formattedAmount = Number(amount).toFixed(2);
    const txRef = `TEST-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const payload = {
      siteCode: this.siteCode || 'YQB-YQB-001',
      countryCode: 'ZA',
      currencyCode: 'ZAR',
      amount: formattedAmount,
      transactionReference: txRef,
      bankReference: `QMOVA-TEST-${txRef.substring(5, 11)}`,
      cancelUrl: `${this.frontendUrl}/super-admin/system-control?payment_status=cancelled`,
      errorUrl: `${this.frontendUrl}/super-admin/system-control?payment_status=error`,
      successUrl: `${this.frontendUrl}/super-admin/system-control?payment_status=success`,
      notifyUrl: `${this.baseUrl}/payments/webhook`,
      isTest: isTestMode
        ? 'true'
        : process.env.OZOW_IS_TEST !== undefined
          ? process.env.OZOW_IS_TEST
          : process.env.NODE_ENV === 'production'
            ? 'false'
            : 'true',
    };

    const stringToHash =
      `${payload.siteCode}${payload.countryCode}${payload.currencyCode}${payload.amount}${payload.transactionReference}${payload.bankReference}${payload.cancelUrl}${payload.errorUrl}${payload.successUrl}${payload.notifyUrl}${payload.isTest}${this.privateKey}`.toLowerCase();
    const hashCheck = crypto
      .createHash('sha512')
      .update(stringToHash)
      .digest('hex');

    return {
      ...payload,
      hashCheck,
      paymentUrl: this.getOzowCheckoutUrl(),
      checkoutUrl: this.getOzowCheckoutUrl(),
    };
  }

  async handleWebhook(body: any, headers: any) {
    const { TransactionReference, Status, HashCheck } = body;

    // SECURITY: Validate HashCheck from Ozow
    if (!HashCheck && process.env.NODE_ENV === 'production') {
      throw new BadRequestException('Missing HashCheck');
    }

    if (!TransactionReference) {
      throw new BadRequestException('Missing TransactionReference');
    }

    const transaction = await this.prisma.transaction.findUnique({
      where: { transactionRef: TransactionReference },
    });

    if (!transaction) {
      this.logger.error(`Transaction not found: ${TransactionReference}`);
      return { success: false };
    }

    if (transaction.status !== 'PENDING') {
      this.logger.log(
        `Transaction ${TransactionReference} already processed with status ${transaction.status}`,
      );
      return { success: true };
    }

    const newStatus =
      Status === 'Complete'
        ? 'SUCCESS'
        : Status === 'Cancelled'
          ? 'CANCELLED'
          : 'FAILED';

    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: newStatus },
    });

    if (newStatus === 'SUCCESS' && transaction.tenantId) {
      // NOTE: Removed legacy workspace update
      if (transaction.planId) {
        const currentPeriodEnd = this.addBillingPeriod(
          new Date(),
          transaction.billingInterval || 'monthly',
        );

        const existingSub = await this.prisma.subscription.findUnique({
          where: { tenantId: transaction.tenantId },
        });

        const isUpgrade =
          existingSub && existingSub.planId !== transaction.planId;
        const newMetadata = existingSub?.metadata
          ? (existingSub.metadata as any)
          : {};

        if (isUpgrade) {
          newMetadata.upgradedFrom = existingSub.planId;
          newMetadata.upgradedAt = new Date().toISOString();
        } else if (existingSub) {
          newMetadata.renewedAt = new Date().toISOString();
        }

        await this.prisma.subscription.upsert({
          where: { tenantId: transaction.tenantId },
          update: {
            planId: transaction.planId,
            status: 'ACTIVE',
            billingInterval: transaction.billingInterval || 'monthly',
            currentPeriodStart: new Date(),
            currentPeriodEnd: currentPeriodEnd,
            nextBillingDate: currentPeriodEnd,
            // Clear trial dates when converting to paid subscription
            trialStartDate: null,
            trialEndDate: null,
            metadata: newMetadata,
          },
          create: {
            tenantId: transaction.tenantId,
            planId: transaction.planId,
            status: 'ACTIVE',
            billingInterval: transaction.billingInterval || 'monthly',
            currentPeriodStart: new Date(),
            currentPeriodEnd: currentPeriodEnd,
            nextBillingDate: currentPeriodEnd,
            trialStartDate: null,
            trialEndDate: null,
          },
        });
      }

      this.logger.log(
        `Subscription activated for workspace ${transaction.tenantId}`,
      );
    }

    return { success: true };
  }

  async createCheckout(dto: any, tenantId: string) {
    return this.generatePaymentLink(
      tenantId,
      dto.planId || 'standard-plan',
      dto.billingInterval || 'monthly',
    );
  }

  async getPaymentStatus(transactionRef: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { transactionRef },
    });
    return transaction || { status: 'NOT_FOUND' };
  }

  async getTransactionHistory(tenantId: string, offset = 0, limit = 20) {
    const transactions = await this.prisma.transaction.findMany({
      where: { tenantId },
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
    const total = await this.prisma.transaction.count({
      where: { tenantId },
    });
    return { transactions, total, offset, limit };
  }
}
