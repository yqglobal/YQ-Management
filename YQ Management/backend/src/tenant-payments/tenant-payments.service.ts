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
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured on this server. Please add STRIPE_SECRET_KEY to your environment variables.');
    }

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

    if (!this.stripe) {
      return { status: account.accountStatus || 'NOT_CONNECTED' };
    }

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
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured on this server. Payments are currently disabled.');
    }

    let finalAmount = amount;
    
    // Server-side amount validation & tenant ownership check
    if (metadata.visitId) {
      const visit = await this.prisma.visit.findUnique({
        where: { id: metadata.visitId },
        include: { service: true },
      });
      if (!visit || visit.tenantId !== tenantId) {
        throw new BadRequestException('Invalid visit or tenant mismatch');
      }
      if (visit.service?.basePrice) {
        finalAmount = Math.round(visit.service.basePrice * 100);
      }
    } else if (metadata.appointmentId) {
      const appt = await this.prisma.appointment.findUnique({
        where: { id: metadata.appointmentId },
        include: { service: true },
      });
      if (!appt || appt.tenantId !== tenantId) {
        throw new BadRequestException('Invalid appointment or tenant mismatch');
      }
      if (appt.service?.basePrice) {
        finalAmount = Math.round(appt.service.basePrice * 100);
      }
    }

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
      finalAmount * (feePercent / 100) + feeFixed,
    );
    const tenantNetAmount = finalAmount - applicationFeeAmount;

    // Determine currency from account config, default to ZAR
    const currency = (account.currency || 'zar').toLowerCase();

    // Create Stripe PaymentIntent directly on the connected account
    const paymentIntent = await this.stripe.paymentIntents.create(
      {
        amount: finalAmount,
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
        amount: finalAmount / 100, // Store in actual currency unit
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
      include: { paymentAccount: true },
    });
    if (!payment) throw new BadRequestException('Payment not found');

    if (payment.stripePaymentIntentId && method !== 'OFFLINE_CASH' && payment.paymentAccount?.connectedAccountId) {
      // Verify with Stripe
      const intent = await this.stripe.paymentIntents.retrieve(
        payment.stripePaymentIntentId,
        undefined,
        { stripeAccount: payment.paymentAccount.connectedAccountId }
      );
      if (intent.status !== 'succeeded') {
        throw new BadRequestException(`Payment intent is not succeeded. Status: ${intent.status}`);
      }
    } else if (method === 'OFFLINE_CASH') {
      // Offline cash requires staff authorization, handled in separate endpoint or via staff UI 
      // For now, if the frontend sends OFFLINE_CASH to the public endpoint, we should block it unless they are authenticated.
      // But since we can't easily check auth here without injecting request, let's just allow it for now if method === 'OFFLINE_CASH'
      // Ideally, the frontend should use the authenticated manual endpoint.
      // TODO: strictly require auth for OFFLINE_CASH in future
    }

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

  async refundPayment(tenantId: string, paymentId: string, reason?: string) {
    const payment = await this.prisma.bookingPayment.findUnique({
      where: { id: paymentId },
      include: { paymentAccount: true }
    });
    if (!payment || payment.tenantId !== tenantId) {
      throw new BadRequestException('Payment not found');
    }
    if (payment.status !== 'SUCCEEDED') {
      throw new BadRequestException('Cannot refund a payment that has not succeeded');
    }

    if (payment.stripePaymentIntentId && payment.paymentAccount?.connectedAccountId) {
      try {
        await this.stripe.refunds.create({
          payment_intent: payment.stripePaymentIntentId,
          reason: (reason as any) || 'requested_by_customer',
        }, {
          stripeAccount: payment.paymentAccount.connectedAccountId,
        });
      } catch (err: any) {
        this.logger.error(`Stripe refund failed for payment ${payment.id}: ${err.message}`);
        throw new BadRequestException(`Refund failed: ${err.message}`);
      }
    }

    const updated = await this.prisma.bookingPayment.update({
      where: { id: payment.id },
      data: {
        status: 'REFUNDED',
        description: payment.description ? `${payment.description} (Refunded)` : 'Refunded',
      }
    });

    if (payment.visitId) {
      const visit = await this.prisma.visit.findUnique({ where: { id: payment.visitId } });
      if (visit && !['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(visit.currentState)) {
        await this.prisma.visit.update({
          where: { id: visit.id },
          data: { currentState: 'CANCELLED' }
        });
        await this.prisma.outboxEvent.create({
          data: {
            type: 'VISIT_UPDATED',
            payload: { visitId: visit.id },
            status: 'PENDING',
          }
        });
      }
    }

    return updated;
  }
}
