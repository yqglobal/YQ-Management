import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VisitStepService } from '../visit-step/visit-step.service';
import { InvoiceService } from '../invoice/invoice.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { QueueGateway } from '../queue/queue.gateway';
import Stripe from 'stripe';

@Injectable()
export class TenantPaymentsService {
  private readonly logger = new Logger(TenantPaymentsService.name);
  private stripe: Stripe;

  constructor(
    private readonly prisma: PrismaService,
    private readonly visitStepService: VisitStepService,
    private readonly invoiceService: InvoiceService,
    @Inject(forwardRef(() => WhatsappService))
    private readonly whatsappService: WhatsappService,
    @Inject(forwardRef(() => QueueGateway))
    private readonly queueGateway: QueueGateway,
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
      throw new BadRequestException(
        'Stripe is not configured on this server. Please add STRIPE_SECRET_KEY to your environment variables.',
      );
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
      try {
        return await this.createAccountLink(account.connectedAccountId);
      } catch (err: any) {
        this.logger.warn(
          `Existing account ${account.connectedAccountId} failed for current Stripe mode: ${err.message}. Creating a new account.`,
        );
      }
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

  async resetConnectAccount(tenantId: string) {
    await this.prisma.tenantPaymentAccount.updateMany({
      where: { tenantId },
      data: {
        connectedAccountId: null,
        accountStatus: 'NOT_CONNECTED',
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
      },
    });
    return { success: true };
  }

  private async createAccountLink(accountId: string) {
    let baseUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const isLive = process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_');

    // Stripe live mode strictly requires an HTTPS public domain for redirect URLs.
    if (
      this.stripe &&
      isLive &&
      (baseUrl.includes('localhost') ||
        baseUrl.includes('127.0.0.1') ||
        !baseUrl.startsWith('https://'))
    ) {
      baseUrl =
        process.env.STRIPE_CONNECT_RETURN_URL_BASE ||
        'https://qmova.yqbuddy.com';
    }

    const accountLink = await this.stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/dashboard/settings/payments?stripe=refresh`,
      return_url: `${baseUrl}/dashboard/settings/payments?stripe=return`,
      type: 'account_onboarding',
    });
    return { url: accountLink.url };
  }

  async getAccountStatus(tenantId: string) {
    const isTestMode = !process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_');
    const account = await this.prisma.tenantPaymentAccount.findUnique({
      where: { tenantId },
    });
    if (!account) return { status: 'NOT_CONNECTED', isTestMode };

    if (!this.stripe) {
      return { status: account.accountStatus || 'NOT_CONNECTED', isTestMode };
    }

    if (!account.connectedAccountId) {
      return { status: account.accountStatus, isTestMode };
    }

    try {
      // Retrieve status from Stripe
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
        accountId: account.connectedAccountId,
        isTestMode,
        chargesEnabled: stripeAccount.charges_enabled,
        payoutsEnabled: stripeAccount.payouts_enabled,
        detailsSubmitted: stripeAccount.details_submitted,
      };
    } catch (err: any) {
      this.logger.warn(
        `Failed to retrieve Stripe account ${account.connectedAccountId}: ${err.message}`,
      );
      if (
        err?.code === 'resource_missing' ||
        err?.message?.includes('No such account') ||
        err?.statusCode === 404
      ) {
        // Stale account ID from another mode (e.g. live vs test)
        await this.prisma.tenantPaymentAccount.update({
          where: { tenantId },
          data: {
            connectedAccountId: null,
            accountStatus: 'NOT_CONNECTED',
            chargesEnabled: false,
            payoutsEnabled: false,
            detailsSubmitted: false,
          },
        });
        return { status: 'NOT_CONNECTED', isTestMode };
      }
      return {
        status: account.accountStatus || 'NOT_CONNECTED',
        accountId: account.connectedAccountId,
        isTestMode,
        chargesEnabled: account.chargesEnabled,
        payoutsEnabled: account.payoutsEnabled,
        detailsSubmitted: account.detailsSubmitted,
      };
    }
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
      throw new BadRequestException(
        'Stripe is not configured on this server. Payments are currently disabled.',
      );
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

  async completePayment(
    paymentId: string,
    method?: string,
    extra: {
      proofUrl?: string;
      description?: string;
      staffId?: string;
      sendWhatsAppReceipt?: boolean;
    } = {},
  ) {
    const payment = await this.prisma.bookingPayment.findUnique({
      where: { id: paymentId },
      include: { paymentAccount: true },
    });
    if (!payment) throw new BadRequestException('Payment not found');

    if (
      payment.stripePaymentIntentId &&
      method !== 'OFFLINE_CASH' &&
      payment.paymentAccount?.connectedAccountId
    ) {
      // Verify with Stripe
      const intent = await this.stripe.paymentIntents.retrieve(
        payment.stripePaymentIntentId,
        undefined,
        { stripeAccount: payment.paymentAccount.connectedAccountId },
      );
      if (intent.status !== 'succeeded') {
        throw new BadRequestException(
          `Payment intent is not succeeded. Status: ${intent.status}`,
        );
      }
    } else if (method === 'OFFLINE_CASH') {
      // Offline cash handled via staff UI or direct completion
    }

    const allowedMethods = ['CASH', 'CARD_TERMINAL', 'EFT', 'OTHER'];
    const normalizedMethod =
      method && allowedMethods.includes(method.toUpperCase())
        ? (method.toUpperCase() as any)
        : payment.method;

    const updated = await this.prisma.bookingPayment.update({
      where: { id: paymentId },
      data: {
        status: 'SUCCEEDED',
        ...(method ? { stripePaymentMethodType: method } : {}),
        ...(normalizedMethod ? { method: normalizedMethod } : {}),
        ...(extra.proofUrl ? { proofUrl: extra.proofUrl } : {}),
        ...(extra.description ? { description: extra.description } : {}),
        ...(extra.staffId ? { recordedByStaffId: extra.staffId } : {}),
      },
    });

    if (updated.visitStepId) {
      // If this was an in-service payment, complete the step using advanceStep to trigger transitions
      const step = await this.prisma.visitStep.findUnique({
        where: { id: updated.visitStepId },
      });
      if (step && step.status !== 'DONE' && step.status !== 'SKIPPED') {
        if (step.status === 'PENDING') {
          await this.visitStepService.activateStep(
            step.tenantId,
            step.id,
            'SYSTEM',
          );
        }
        await this.visitStepService.advanceStep(
          step.tenantId,
          step.id,
          'SYSTEM',
          {
            outcome: 'SUCCESS',
            staffNotes: 'Payment succeeded',
          },
        );
      }
    } else if (updated.visitId) {
      // It's an upfront booking payment
      const visit = await this.prisma.visit.findUnique({
        where: { id: updated.visitId },
        include: { service: true },
      });
      if (visit && visit.currentState === 'PENDING_PAYMENT') {
        let newState = 'WAITING';
        if (visit.scheduledTime) {
          newState = visit.service.requireManualCheckIn
            ? 'CREATED'
            : 'SCHEDULED';
        }
        await this.prisma.visit.update({
          where: { id: updated.visitId },
          data: { currentState: newState as any },
        });
        await this.prisma.outboxEvent.create({
          data: {
            type: 'VISIT_UPDATED',
            payload: { visitId: updated.visitId },
            status: 'PENDING',
          },
        });
      }

      // Generate Invoice and mark it PAID
      try {
        const invoice = await this.invoiceService.generateVisitInvoice(
          updated.visitId,
        );
        if (invoice && invoice.status !== 'PAID') {
          await this.prisma.visitInvoice.update({
            where: { id: invoice.id },
            data: { status: 'PAID', paidAt: new Date() },
          });
        }
      } catch (invErr: any) {
        this.logger.warn(
          `Invoice generation on payment completion failed: ${invErr.message}`,
        );
      }
    }

    // Send WhatsApp receipt if requested/enabled
    if (extra.sendWhatsAppReceipt !== false) {
      await this.sendPaymentWhatsAppReceipt(updated.id, extra.description);
    }

    return updated;
  }

  async recordManualPayment(
    tenantId: string,
    visitId: string,
    amount: number,
    method: string,
    description?: string,
    extra: {
      source?: 'CHECKIN' | 'CHECKOUT';
      staffId?: string;
      proofUrl?: string;
      sendWhatsAppReceipt?: boolean;
    } = {},
  ) {
    const allowedMethods = ['CASH', 'CARD_TERMINAL', 'EFT', 'OTHER'];
    const normalizedMethod = allowedMethods.includes(
      (method || '').toUpperCase(),
    )
      ? (method.toUpperCase() as any)
      : 'OTHER';
    if (!(amount > 0))
      throw new BadRequestException('Amount must be greater than zero');
    const visit = await this.prisma.visit.findUnique({
      where: { id: visitId },
      include: {
        service: true,
        visitSteps: {
          include: { templateStep: true },
          orderBy: { stepOrder: 'asc' },
        },
      },
    });
    if (!visit || visit.tenantId !== tenantId) {
      throw new BadRequestException('Visit not found');
    }

    // Check if visit has a PAYMENT step awaiting completion
    const paymentStep = visit.visitSteps?.find(
      (s: any) =>
        s.type === 'PAYMENT' &&
        s.status !== 'DONE' &&
        s.status !== 'SKIPPED' &&
        !s.isSkipped,
    );

    const payment = await this.prisma.bookingPayment.create({
      data: {
        tenantId,
        visitId,
        visitStepId: paymentStep?.id || null,
        amount,
        platformFeeAmount: 0,
        tenantNetAmount: amount,
        currency: visit.service.priceCurrency || 'ZAR',
        status: 'SUCCEEDED',
        stripePaymentMethodType: method,
        method: normalizedMethod,
        source:
          extra.source ??
          (visit.currentState === 'PENDING_PAYMENT' ? 'CHECKIN' : 'CHECKOUT'),
        recordedByStaffId: extra.staffId,
        proofUrl: extra.proofUrl,
        description: description || 'Manual Payment at Counter',
      },
    });

    // Advance payment visit step in journey builder flow if present
    if (paymentStep) {
      try {
        if (paymentStep.status === 'PENDING') {
          await this.visitStepService.activateStep(
            tenantId,
            paymentStep.id,
            extra.staffId || 'SYSTEM',
          );
        }
        await this.visitStepService.advanceStep(
          tenantId,
          paymentStep.id,
          extra.staffId || 'SYSTEM',
          {
            outcome: 'SUCCESS',
            staffNotes:
              description ||
              `Counter payment completed via ${normalizedMethod}`,
          },
        );
        await this.prisma.visitStep.update({
          where: { id: paymentStep.id },
          data: {
            amountCharged: amount,
            paymentRef: extra.proofUrl || description || normalizedMethod,
            paymentStatus: 'PAID',
          },
        });
      } catch (stepErr: any) {
        this.logger.warn(
          `Failed to advance payment step ${paymentStep.id}: ${stepErr.message}`,
        );
      }
    }

    // Generate Invoice and mark it PAID
    try {
      const invoice = await this.invoiceService.generateVisitInvoice(visit.id);
      if (invoice && invoice.status !== 'PAID') {
        await this.prisma.visitInvoice.update({
          where: { id: invoice.id },
          data: { status: 'PAID', paidAt: new Date() },
        });
      }
    } catch (invErr: any) {
      this.logger.warn(
        `Invoice generation on manual payment failed: ${invErr.message}`,
      );
    }

    if (visit.balanceDue) {
      await this.prisma.visit.update({
        where: { id: visit.id },
        data: { balanceDue: null },
      });
    }

    if (visit.currentState === 'PENDING_PAYMENT') {
      let newState = 'WAITING';
      if (visit.scheduledTime) {
        newState = visit.service.requireManualCheckIn ? 'CREATED' : 'SCHEDULED';
      }
      await this.prisma.visit.update({
        where: { id: visit.id },
        data: { currentState: newState as any },
      });
      await this.prisma.outboxEvent.create({
        data: {
          type: 'VISIT_UPDATED',
          payload: { visitId: visit.id },
          status: 'PENDING',
        },
      });
    }

    // Broadcast real-time WebSocket events for instant UI reactivity
    this.queueGateway.broadcastTenantUpdate(tenantId, 'VISIT_UPDATED', {
      visitId: visit.id,
    });
    this.queueGateway.broadcastTenantUpdate(tenantId, 'PAYMENT_RECORDED', {
      payment,
      visitId: visit.id,
    });

    // Send WhatsApp receipt if requested/enabled
    if (extra.sendWhatsAppReceipt !== false) {
      await this.sendPaymentWhatsAppReceipt(payment.id, description);
    }

    return payment;
  }

  async sendPaymentWhatsAppReceipt(paymentId: string, customNotes?: string) {
    try {
      const payment = await this.prisma.bookingPayment.findUnique({
        where: { id: paymentId },
        include: {
          visit: {
            include: {
              customer: true,
              service: true,
              queue: true,
              tenant: true,
              location: true,
            },
          },
          appointment: {
            include: {
              customer: true,
              service: true,
              tenant: true,
            },
          },
          tenant: true,
        },
      });

      if (!payment) return;

      const tenant = payment.tenant;
      const customer = payment.visit?.customer || payment.appointment?.customer;
      const rawPhone = customer?.phone;

      if (!rawPhone) {
        this.logger.log(
          `No phone number for payment ${paymentId}, skipping WhatsApp receipt`,
        );
        return;
      }

      let cleanPhone = rawPhone.replace(/\D/g, '');
      if (!cleanPhone) return;
      if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
        cleanPhone = '27' + cleanPhone.slice(1);
      }

      const serviceName =
        payment.visit?.service?.name ||
        payment.appointment?.service?.name ||
        'Service';
      const customerName = customer?.name || 'Customer';
      const currency = payment.currency || 'ZAR';
      const formattedAmount = (payment.amount / 100).toFixed(2);

      const methodLabels: Record<string, string> = {
        CARD_TERMINAL: 'Card Machine (POS)',
        CASH: 'Cash',
        EFT: 'EFT / Bank Transfer',
        STRIPE_ONLINE: 'Online Card (Stripe)',
        OTHER: 'Counter / Manual',
      };
      const methodLabel =
        methodLabels[payment.method || payment.stripePaymentMethodType || ''] ||
        payment.method ||
        payment.stripePaymentMethodType ||
        'Payment';

      const ticketNumber =
        payment.visit?.displayId ||
        (payment.visitId ? `#TKT-${payment.visitId.substring(0, 4)}` : '');
      const locationName = payment.visit?.location?.name || tenant.name;
      const refOrProof =
        payment.proofUrl ||
        (payment.description &&
        payment.description !== 'Manual Payment at Counter'
          ? payment.description
          : null);

      const appBaseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.APP_URL ||
        'http://localhost:3001';
      const statusUrl = payment.visit?.accessToken
        ? `${appBaseUrl}/customer/status/${payment.visit.accessToken}`
        : null;

      const timeStr = new Date().toLocaleString('en-ZA', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });

      const messageLines = [
        `*🧾 PAYMENT RECEIPT*`,
        `*${tenant.name.toUpperCase()}*`,
        ``,
        `Dear *${customerName}*,`,
        `Your payment has been successfully recorded.`,
        ``,
        `───────────────────────`,
        ...(ticketNumber ? [`📋 *Ticket:* ${ticketNumber}`] : []),
        `🏥 *Service:* ${serviceName}`,
        `💰 *Amount Paid:* ${currency} ${formattedAmount}`,
        `💳 *Method:* ${methodLabel}`,
        `🏢 *Location:* ${locationName}`,
        `📅 *Date:* ${timeStr}`,
        ...(refOrProof ? [`🧾 *Ref / Slip:* ${refOrProof}`] : []),
        ...(customNotes && customNotes !== 'Manual Payment at Counter'
          ? [`📝 *Notes:* ${customNotes}`]
          : []),
        `───────────────────────`,
        ...(statusUrl
          ? [``, `🔗 *Live Queue & Stage Tracker:*`, statusUrl]
          : []),
        ``,
        `Thank you for your visit!`,
      ];

      const messageText = messageLines.join('\n');

      // Send WhatsApp message to customer
      const sendResult = await this.whatsappService
        .sendToTenant(tenant.id, cleanPhone, messageText)
        .catch((err) => {
          this.logger.warn(
            `Failed to send payment receipt WhatsApp to ${cleanPhone}: ${err.message}`,
          );
          return null;
        });

      // Also persist message in Conversation & Message history for the inbox & chat panel
      try {
        const conversation = await this.prisma.customerConversation.upsert({
          where: {
            tenantId_customerPhone: {
              tenantId: tenant.id,
              customerPhone: rawPhone,
            },
          },
          update: { lastMessageAt: new Date(), status: 'OPEN' },
          create: {
            tenantId: tenant.id,
            customerPhone: rawPhone,
            status: 'OPEN',
            unreadCount: 0,
          },
        });

        const loggedMsg = await this.prisma.message.create({
          data: {
            tenantId: tenant.id,
            customerPhone: rawPhone,
            conversationId: conversation.id,
            visitId: payment.visitId || null,
            body: messageText,
            sender: 'SYSTEM',
            isRead: true,
            whatsappId: (sendResult as any)?.providerId || null,
          },
        });

        this.queueGateway.broadcastTenantUpdate(
          tenant.id,
          'NEW_INBOX_MESSAGE',
          {
            phone: rawPhone,
            conversationId: conversation.id,
            message: loggedMsg,
          },
        );

        if (payment.visit?.queueId) {
          this.queueGateway.broadcastQueueUpdate(
            payment.visit.queueId,
            'NEW_MESSAGE',
            {
              message: loggedMsg,
            },
          );
        }
      } catch (logErr: any) {
        this.logger.warn(
          `Failed to log payment WhatsApp message to DB: ${logErr.message}`,
        );
      }
    } catch (err: any) {
      this.logger.error(`Error in sendPaymentWhatsAppReceipt: ${err.message}`);
    }
  }

  async refundPayment(tenantId: string, paymentId: string, reason?: string) {
    const payment = await this.prisma.bookingPayment.findUnique({
      where: { id: paymentId },
      include: { paymentAccount: true },
    });
    if (!payment || payment.tenantId !== tenantId) {
      throw new BadRequestException('Payment not found');
    }
    if (payment.status !== 'SUCCEEDED') {
      throw new BadRequestException(
        'Cannot refund a payment that has not succeeded',
      );
    }

    if (
      payment.stripePaymentIntentId &&
      payment.paymentAccount?.connectedAccountId
    ) {
      try {
        await this.stripe.refunds.create(
          {
            payment_intent: payment.stripePaymentIntentId,
            reason: (reason as any) || 'requested_by_customer',
          },
          {
            stripeAccount: payment.paymentAccount.connectedAccountId,
          },
        );
      } catch (err: any) {
        this.logger.error(
          `Stripe refund failed for payment ${payment.id}: ${err.message}`,
        );
        throw new BadRequestException(`Refund failed: ${err.message}`);
      }
    }

    const updated = await this.prisma.bookingPayment.update({
      where: { id: payment.id },
      data: {
        status: 'REFUNDED',
        description: payment.description
          ? `${payment.description} (Refunded)`
          : 'Refunded',
      },
    });

    if (payment.visitId) {
      const visit = await this.prisma.visit.findUnique({
        where: { id: payment.visitId },
      });
      if (
        visit &&
        !['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(visit.currentState)
      ) {
        await this.prisma.visit.update({
          where: { id: visit.id },
          data: { currentState: 'CANCELLED' },
        });
        await this.prisma.outboxEvent.create({
          data: {
            type: 'VISIT_UPDATED',
            payload: { visitId: visit.id },
            status: 'PENDING',
          },
        });
      }
    }

    return updated;
  }

  /**
   * Comprehensive list of booking payment records for the tenant, with full service, location,
   * customer, visitInvoice, staff recorder details, and aggregates.
   */
  async listPayments(
    tenantId: string,
    query: {
      locationId?: string;
      serviceId?: string;
      status?: string;
      method?: string;
      timeframe?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const where: any = { tenantId };

    if (query.status && query.status !== 'all') {
      where.status = query.status;
    }

    if (query.method && query.method !== 'all') {
      where.method = query.method;
    }

    // Location filter
    if (query.locationId && query.locationId !== 'all') {
      where.OR = [
        { visit: { locationId: query.locationId } },
        { appointment: { locationId: query.locationId } },
      ];
    }

    // Service filter
    if (query.serviceId && query.serviceId !== 'all') {
      const serviceCondition = [
        { visit: { serviceId: query.serviceId } },
        { appointment: { serviceId: query.serviceId } },
      ];
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: serviceCondition }];
        delete where.OR;
      } else {
        where.OR = serviceCondition;
      }
    }

    // Date range filter
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    } else if (query.timeframe && query.timeframe !== 'all') {
      const now = new Date();
      if (query.timeframe === 'today') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        where.createdAt = { gte: start };
      } else if (query.timeframe === '7d' || query.timeframe === 'week') {
        const past = new Date(now.getTime() - 7 * 86400000);
        where.createdAt = { gte: past };
      } else if (query.timeframe === '30d' || query.timeframe === 'month') {
        const past = new Date(now.getTime() - 30 * 86400000);
        where.createdAt = { gte: past };
      } else if (query.timeframe === 'year') {
        const past = new Date(now.getTime() - 365 * 86400000);
        where.createdAt = { gte: past };
      }
    }

    // Search filter across customer name, phone, email, description, stripe intent, receipt
    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      const searchConditions = [
        { description: { contains: s, mode: 'insensitive' } },
        { stripePaymentIntentId: { contains: s, mode: 'insensitive' } },
        { visit: { customer: { name: { contains: s, mode: 'insensitive' } } } },
        { visit: { customer: { phone: { contains: s, mode: 'insensitive' } } } },
        { visit: { customer: { email: { contains: s, mode: 'insensitive' } } } },
        { visit: { displayId: { contains: s, mode: 'insensitive' } } },
        { visit: { visitInvoice: { invoiceNumber: { contains: s, mode: 'insensitive' } } } },
        { appointment: { customer: { name: { contains: s, mode: 'insensitive' } } } },
        { appointment: { customer: { phone: { contains: s, mode: 'insensitive' } } } },
      ];

      if (where.AND) {
        where.AND.push({ OR: searchConditions });
      } else if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchConditions }];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    const limit = Math.min(Number(query.limit) || 100, 500);
    const offset = Number(query.offset) || 0;

    const [payments, totalCount, tenant] = await Promise.all([
      this.prisma.bookingPayment.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: {
          visit: {
            include: {
              customer: true,
              service: true,
              location: true,
              visitInvoice: true,
            },
          },
          appointment: {
            include: {
              customer: true,
              service: true,
              location: true,
            },
          },
        },
      }),
      this.prisma.bookingPayment.count({ where }),
      this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, name: true, taxConfig: true },
      }),
    ]);

    // Compute robust metrics and breakdowns
    const allMatchingForMetrics = await this.prisma.bookingPayment.findMany({
      where,
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        method: true,
        source: true,
        createdAt: true,
        visit: {
          select: {
            serviceId: true,
            locationId: true,
            service: { select: { id: true, name: true } },
            location: { select: { id: true, name: true } },
            visitInvoice: { select: { totalTax: true, subtotal: true } },
          },
        },
        appointment: {
          select: {
            serviceId: true,
            locationId: true,
            service: { select: { id: true, name: true } },
            location: { select: { id: true, name: true } },
          },
        },
      },
    });

    let totalRevenue = 0;
    let totalTaxAmount = 0;
    let successfulCount = 0;
    let refundedCount = 0;
    let refundedAmount = 0;
    let pendingCount = 0;

    const locationBreakdownMap = new Map<string, { id: string; name: string; revenue: number; count: number }>();
    const serviceBreakdownMap = new Map<string, { id: string; name: string; revenue: number; count: number }>();
    const methodBreakdownMap = new Map<string, { method: string; revenue: number; count: number }>();

    for (const p of allMatchingForMetrics) {
      const isSucceeded = p.status === 'SUCCEEDED';
      if (isSucceeded) {
        totalRevenue += p.amount;
        successfulCount++;

        // Location revenue aggregation
        const loc = p.visit?.location || p.appointment?.location;
        const locId = loc?.id || 'unknown';
        const locName = loc?.name || 'Unassigned Location';
        if (!locationBreakdownMap.has(locId)) {
          locationBreakdownMap.set(locId, { id: locId, name: locName, revenue: 0, count: 0 });
        }
        const locItem = locationBreakdownMap.get(locId)!;
        locItem.revenue += p.amount;
        locItem.count += 1;

        // Service revenue aggregation
        const svc = p.visit?.service || p.appointment?.service;
        const svcId = svc?.id || 'unknown';
        const svcName = svc?.name || 'General Service';
        if (!serviceBreakdownMap.has(svcId)) {
          serviceBreakdownMap.set(svcId, { id: svcId, name: svcName, revenue: 0, count: 0 });
        }
        const svcItem = serviceBreakdownMap.get(svcId)!;
        svcItem.revenue += p.amount;
        svcItem.count += 1;

        // Payment method breakdown
        const methodKey = p.method || 'OTHER';
        if (!methodBreakdownMap.has(methodKey)) {
          methodBreakdownMap.set(methodKey, { method: methodKey, revenue: 0, count: 0 });
        }
        const mItem = methodBreakdownMap.get(methodKey)!;
        mItem.revenue += p.amount;
        mItem.count += 1;

        // Estimated tax if invoice exists or tax config applies
        if (p.visit?.visitInvoice?.totalTax) {
          totalTaxAmount += p.visit.visitInvoice.totalTax;
        } else if (tenant?.taxConfig) {
          const cfg = tenant.taxConfig as any;
          const rate = Number(cfg.defaultTaxRatePercent) || 0;
          if (rate > 0) {
            const tax = cfg.taxInclusive
              ? p.amount - p.amount / (1 + rate / 100)
              : (p.amount * rate) / 100;
            totalTaxAmount += Math.round(tax);
          }
        }
      } else if (p.status === 'REFUNDED') {
        refundedCount++;
        refundedAmount += p.amount;
      } else if (p.status === 'PENDING') {
        pendingCount++;
      }
    }

    const locationBreakdown = Array.from(locationBreakdownMap.values()).sort((a, b) => b.revenue - a.revenue);
    const serviceBreakdown = Array.from(serviceBreakdownMap.values()).sort((a, b) => b.revenue - a.revenue);
    const methodBreakdown = Array.from(methodBreakdownMap.values()).sort((a, b) => b.revenue - a.revenue);

    return {
      payments: payments.map((p) => {
        const customer = p.visit?.customer || p.appointment?.customer || null;
        const service = p.visit?.service || p.appointment?.service || null;
        const location = p.visit?.location || p.appointment?.location || null;
        const invoice = p.visit?.visitInvoice || null;

        return {
          id: p.id,
          amount: p.amount,
          currency: p.currency || 'ZAR',
          status: p.status,
          method: p.method || 'OTHER',
          source: p.source,
          description: p.description,
          receiptUrl: p.receiptUrl,
          proofUrl: p.proofUrl,
          stripePaymentIntentId: p.stripePaymentIntentId,
          stripeChargeId: p.stripeChargeId,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          recordedByStaffId: p.recordedByStaffId,
          visitId: p.visitId,
          appointmentId: p.appointmentId,
          customer: customer
            ? {
                id: customer.id,
                name: customer.name,
                phone: customer.phone,
                email: customer.email,
              }
            : null,
          service: service
            ? {
                id: service.id,
                name: service.name,
                basePrice: service.basePrice,
              }
            : null,
          location: location
            ? {
                id: location.id,
                name: location.name,
              }
            : null,
          invoice: invoice
            ? {
                id: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                subtotal: invoice.subtotal,
                totalTax: invoice.totalTax,
                total: invoice.total,
                status: invoice.status,
                taxLines: invoice.taxLines,
              }
            : null,
        };
      }),
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + payments.length < totalCount,
      },
      summary: {
        totalRevenue,
        totalTaxAmount,
        netRevenue: Math.max(0, totalRevenue - totalTaxAmount),
        successfulCount,
        refundedCount,
        refundedAmount,
        pendingCount,
        currency: payments[0]?.currency || 'ZAR',
        locationBreakdown,
        serviceBreakdown,
        methodBreakdown,
      },
    };
  }
}
