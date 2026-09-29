import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VisitStepService } from '../visit-step/visit-step.service';
import Stripe from 'stripe';

@Injectable()
export class TenantPaymentsService {
  private readonly logger = new Logger(TenantPaymentsService.name);
  private stripe: Stripe;

  constructor(
    private readonly prisma: PrismaService,
    private readonly visitStepService: VisitStepService,
  ) {
    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    if (stripeSecret) {
      this.stripe = new Stripe(stripeSecret, {
        apiVersion: '2025-01-27.acacia' as any,
      });
    } else {
      this.logger.warn('STRIPE_SECRET_KEY not set. Payments will not work.');
    }
  }

  // ── Onboarding ─────────────────────────────────────────────────────────────

  async createConnectAccount(tenantId: string) {
    let account = await this.prisma.tenantPaymentAccount.findUnique({
      where: { tenantId },
    });

    if (!account) {
      account = await this.prisma.tenantPaymentAccount.create({
        data: { tenantId, provider: 'stripe' },
      });
    }

    if (account.connectedAccountId) {
      return this.createAccountLink(account.connectedAccountId);
    }

    // Create a new Express account on Stripe
    const stripeAccount = await this.stripe.accounts.create({
      type: 'express',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: { tenantId },
    });

    await this.prisma.tenantPaymentAccount.update({
      where: { tenantId },
      data: {
        connectedAccountId: stripeAccount.id,
        accountStatus: 'ONBOARDING',
      },
    });

    return this.createAccountLink(stripeAccount.id);
  }

  private async createAccountLink(accountId: string) {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const accountLink = await this.stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/dashboard/settings/payments?stripe=refresh`,
      return_url: `${baseUrl}/dashboard/settings/payments?stripe=return`,
      type: 'account_onboarding',
    });
    return { url: accountLink.url };
  }

  async getAccountStatus(tenantId: string) {
    const account = await this.prisma.tenantPaymentAccount.findUnique({
      where: { tenantId },
    });
    if (!account) return { status: 'NOT_CONNECTED' };

    if (!account.connectedAccountId) {
      return { status: account.accountStatus };
    }

    // Retrieve live status from Stripe
    const stripeAccount = await this.stripe.accounts.retrieve(
      account.connectedAccountId,
    );

    const isReady =
      stripeAccount.charges_enabled && stripeAccount.payouts_enabled;
    const status = isReady ? 'ENABLED' : 'RESTRICTED';

    await this.prisma.tenantPaymentAccount.update({
      where: { tenantId },
      data: {
        chargesEnabled: stripeAccount.charges_enabled,
        payoutsEnabled: stripeAccount.payouts_enabled,
        detailsSubmitted: stripeAccount.details_submitted,
        accountStatus: status,
        currentlyDue: stripeAccount.requirements?.currently_due as any,
        eventuallyDue: stripeAccount.requirements?.eventually_due as any,
        pendingVerification: stripeAccount.requirements
          ?.pending_verification as any,
      },
    });

    return {
      status,
      chargesEnabled: stripeAccount.charges_enabled,
      payoutsEnabled: stripeAccount.payouts_enabled,
      detailsSubmitted: stripeAccount.details_submitted,
    };
  }

  // ── Payment Processing ────────────────────────────────────────────────────

  /**
   * Creates a PaymentIntent for a specific booking/visit step.
   * Uses "Direct Charges" pattern: The tenant is the Merchant of Record,
   * Qmova collects an application_fee_amount.
   */
  async createPaymentIntent(
    tenantId: string,
    amount: number, // In cents (e.g., ZAR cents)
    metadata: {
      visitId?: string;
      visitStepId?: string;
      appointmentId?: string;
      description?: string;
    },
  ) {
    const account = await this.prisma.tenantPaymentAccount.findUnique({
      where: { tenantId },
    });

    if (
      !account ||
      !account.connectedAccountId ||
      account.accountStatus !== 'ENABLED'
    ) {
      throw new BadRequestException(
        'Tenant is not fully onboarded to receive payments.',
      );
    }

    // Calculate Platform Fee (e.g. 5%)
    const feePercent = account.platformFeePercent ?? 5.0; // Default 5%
    const feeFixed = account.platformFeeFixed ?? 0;

    // Application fee is taken in cents
    const applicationFeeAmount = Math.round(
      amount * (feePercent / 100) + feeFixed,
    );
    const tenantNetAmount = amount - applicationFeeAmount;

    // Determine currency from account config, default to ZAR
    const currency = (account.currency || 'zar').toLowerCase();

    // Create Stripe PaymentIntent directly on the connected account
    const paymentIntent = await this.stripe.paymentIntents.create(
      {
        amount,
        currency,
        application_fee_amount: applicationFeeAmount,
        metadata: {
          ...metadata,
          tenantId,
        },
        description: metadata.description || 'Qmova Booking Payment',
      },
      {
        stripeAccount: account.connectedAccountId, // DIRECT CHARGE
      },
    );

    // Record the payment intent in our DB
    const bookingPayment = await this.prisma.bookingPayment.create({
      data: {
        tenantId,
        tenantPaymentAccountId: account.id,
        appointmentId: metadata.appointmentId,
        visitId: metadata.visitId,
        visitStepId: metadata.visitStepId,
        amount: amount / 100, // Store in actual currency unit
        platformFeeAmount: applicationFeeAmount / 100,
        tenantNetAmount: tenantNetAmount / 100,
        currency: currency.toUpperCase(),
        stripePaymentIntentId: paymentIntent.id,
        status: 'PENDING',
        description: metadata.description,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentId: bookingPayment.id,
    };
  }

  async getPayment(paymentId: string) {
    const payment = await this.prisma.bookingPayment.findUnique({
      where: { id: paymentId },
      include: {
        paymentAccount: true,
      },
    });
    if (!payment) throw new BadRequestException('Payment not found');
    return payment;
  }

  async completePayment(paymentId: string, method?: string) {
    const payment = await this.prisma.bookingPayment.findUnique({
      where: { id: paymentId },
    });
    if (!payment) throw new BadRequestException('Payment not found');

    const updated = await this.prisma.bookingPayment.update({
      where: { id: paymentId },
      data: { 
        status: 'SUCCEEDED',
        ...(method ? { stripePaymentMethodType: method } : {})
      },
    });

    if (updated.visitStepId) {
      // If this was an in-service payment, complete the step using advanceStep to trigger transitions
      const step = await this.prisma.visitStep.findUnique({
        where: { id: updated.visitStepId }
      });
      if (step && step.status !== 'DONE' && step.status !== 'SKIPPED') {
        if (step.status === 'PENDING') {
           await this.visitStepService.activateStep(step.tenantId, step.id, 'SYSTEM');
        }
        await this.visitStepService.advanceStep(step.tenantId, step.id, 'SYSTEM', {
          outcome: 'SUCCESS',
          staffNotes: 'Payment succeeded'
        });
      }
    } else if (updated.visitId) {
      // It's an upfront booking payment
      const visit = await this.prisma.visit.findUnique({
        where: { id: updated.visitId },
        include: { service: true }
      });
      if (visit && visit.currentState === 'PENDING_PAYMENT') {
        let newState = 'WAITING';
        if (visit.scheduledTime) {
          newState = visit.service.requireManualCheckIn ? 'CREATED' : 'SCHEDULED';
        }
        await this.prisma.visit.update({
          where: { id: updated.visitId },
          data: { currentState: newState as any }
        });
        await this.prisma.outboxEvent.create({
          data: {
            type: 'VISIT_UPDATED',
            payload: { visitId: updated.visitId },
            status: 'PENDING',
          }
        });
      }
    }

    return updated;
  }

  async recordManualPayment(tenantId: string, visitId: string, amount: number, method: string, description?: string) {
    const visit = await this.prisma.visit.findUnique({
      where: { id: visitId },
      include: { service: true }
    });
    if (!visit || visit.tenantId !== tenantId) {
      throw new BadRequestException('Visit not found');
    }

    const payment = await this.prisma.bookingPayment.create({
      data: {
        tenantId,
        visitId,
        amount,
        platformFeeAmount: 0,
        tenantNetAmount: amount,
        currency: 'ZAR', // ✅ Fixed: was 'USD', consistent with Stripe payments
        status: 'SUCCEEDED',
        stripePaymentMethodType: method,
        description: description || 'Manual Payment at Counter',
      }
    });

    if (visit.currentState === 'PENDING_PAYMENT') {
      let newState = 'WAITING';
      if (visit.scheduledTime) {
        newState = visit.service.requireManualCheckIn ? 'CREATED' : 'SCHEDULED';
      }
      await this.prisma.visit.update({
        where: { id: visit.id },
        data: { currentState: newState as any }
      });
      await this.prisma.outboxEvent.create({
        data: {
          type: 'VISIT_UPDATED',
          payload: { visitId: visit.id },
          status: 'PENDING',
        }
      });
    }

    return payment;
  }
}
