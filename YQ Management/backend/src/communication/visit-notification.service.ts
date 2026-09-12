import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import {
  CommunicationLogService,
  CommunicationChannel,
  CommunicationStatus,
} from './logging/communication-log.service';
import * as QRCode from 'qrcode';

/**
 * Supported visit lifecycle notification types.
 * Maps 1-to-1 with outbox event type strings.
 */
export type VisitNotificationType =
  | 'VISIT_CREATED'
  | 'VISIT_CALLED'
  | 'VISIT_CANCELLED'
  | 'VISIT_MISSED'
  | 'VISIT_COMPLETED';

/** Minimal payload shape from the outbox event. */
interface VisitEventPayload {
  visitId?: string;
  tenantId?: string;
  displayId?: string;
}

/**
 * VisitNotificationService — single source of truth for all visit-triggered
 * WhatsApp notifications.
 *
 * Design principles:
 * - Each notification type is independently try/caught; a failing "called"
 *   handler cannot affect the "created" handler.
 * - ETA computation uses the service's `expectedDuration` from the DB, not a
 *   hardcoded constant.
 * - Phone normalization is centralized in `normalizePhone()`.
 * - All DB lookups include only the fields required by that notification type
 *   (minimal `select`) to keep queries fast.
 */
@Injectable()
export class VisitNotificationService {
  private readonly logger = new Logger(VisitNotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => WhatsappService))
    private readonly whatsappService: WhatsappService,
    private readonly communicationLogService: CommunicationLogService,
  ) {}

  /**
   * Public entry point. Delegates to the appropriate private handler.
   * Swallows errors at this level — each handler does its own error handling,
   * but if an unknown type is passed we simply log and return.
   */
  async notify(type: VisitNotificationType, payload: VisitEventPayload): Promise<void> {
    if (!payload.visitId || !payload.tenantId) {
      this.logger.debug(`notify(${type}): skipped — missing visitId or tenantId`);
      return;
    }

    const handler = this.getHandler(type);
    if (!handler) {
      this.logger.warn(`notify: no handler for type "${type}"`);
      return;
    }

    try {
      await handler(payload as Required<Pick<VisitEventPayload, 'visitId' | 'tenantId'>> & VisitEventPayload);
    } catch (err: any) {
      this.logger.warn(
        `notify(${type}) failed for visitId=${payload.visitId}: ${err?.message}`,
      );
    }
  }

  private getHandler(type: VisitNotificationType) {
    const handlers: Record<VisitNotificationType, (p: VisitEventPayload) => Promise<void>> = {
      VISIT_CREATED:   (p) => this.handleVisitCreated(p),
      VISIT_CALLED:    (p) => this.handleVisitCalled(p),
      VISIT_CANCELLED: (p) => this.handleVisitCancelled(p),
      VISIT_MISSED:    (p) => this.handleVisitMissed(p),
      VISIT_COMPLETED: (p) => this.handleVisitCompleted(p),
    };
    return handlers[type] ?? null;
  }

  // ─── Phone normalization ────────────────────────────────────────────────────

  /**
   * Normalizes a phone number to the format expected by the WhatsApp API.
   * Strips all non-digit characters. Handles both local and E.164 formats.
   */
  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  // ─── Shared DB fetch helpers ────────────────────────────────────────────────

  /** Fetches visit with minimal fields common to all notification types. */
  private async fetchVisitBase(visitId: string) {
    return this.prisma.visit.findUnique({
      where: { id: visitId },
      select: {
        id: true,
        tenantId: true,
        locationId: true,
        displayId: true,
        accessToken: true,
        scheduledTime: true,
        waitingStart: true,
        serviceStart: true,
        completedAt: true,
        queueId: true,
        createdAt: true,
        customer: { select: { name: true, phone: true } },
        service: { select: { name: true, expectedDuration: true } },
        location: { select: { name: true, googlePlaceId: true } },
        tenant: {
          select: {
            whatsappConnected: true,
            whatsappInstanceId: true,
            enableSmartReviews: true,
            reviewWaitThresholdMins: true,
            subscriptions: {
              where: { status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE'] } },
              include: { plan: true },
            },
          },
        },
      },
    });
  }

  /** Returns false and logs the reason if the visit is not eligible for WhatsApp. */
  private canSendWhatsApp(
    visit: Awaited<ReturnType<typeof this.fetchVisitBase>>,
    type: string,
  ): visit is NonNullable<typeof visit> {
    if (!visit) {
      this.logger.debug(`${type}: visit not found`);
      return false;
    }
    if (!visit.tenant?.whatsappConnected || !visit.tenant?.whatsappInstanceId) {
      this.logger.debug(`${type}: WhatsApp not connected for tenant ${visit.tenantId}`);
      return false;
    }
    if (!visit.customer?.phone) {
      this.logger.debug(`${type}: no customer phone for visit ${visit.id}`);
      return false;
    }
    return true;
  }

  /** Builds the Qmova watermark based on the tenant's subscription plan. */
  private buildWatermark(visit: NonNullable<Awaited<ReturnType<typeof this.fetchVisitBase>>>): string {
    const sub = visit.tenant.subscriptions?.[0];
    let planFeatures: Record<string, unknown> = {};
    try {
      planFeatures =
        typeof sub?.plan?.features === 'string'
          ? (JSON.parse(sub.plan.features) as Record<string, unknown>)
          : (sub?.plan?.features as Record<string, unknown> ?? {});
    } catch { /* ignore */ }

    const hasCustomBranding =
      sub?.status === 'TRIAL' || planFeatures.customBranding === true;
    return hasCustomBranding ? '' : '\n\nPowered by Qmova';
  }

  // ─── Handlers ────────────────────────────────────────────────────────────────

  /**
   * VISIT_CREATED: Sends a queue-joined confirmation with position, ETA, and a
   * QR code linking to the customer's live status page.
   *
   * ETA uses `service.expectedDuration` (from DB) per person ahead — not a
   * hardcoded constant.
   */
  private async handleVisitCreated(payload: VisitEventPayload): Promise<void> {
    const visit = await this.fetchVisitBase(payload.visitId!);
    if (!this.canSendWhatsApp(visit, 'VISIT_CREATED')) return;

    const locationText = visit.location?.name ? ` at ${visit.location.name}` : '';
    const serviceName = visit.service?.name || 'the service';
    const displayId = visit.displayId || payload.displayId || 'Unknown';
    // Use actual service duration for ETA, default to 10 only if unset
    const perPersonMins = visit.service?.expectedDuration ?? 10;

    const watermark = this.buildWatermark(visit);

    const statusUrl = process.env.APP_URL
      ? `${process.env.APP_URL}/customer/status/${visit.accessToken}`
      : null;
    const linkText = statusUrl ? `\n\nTrack your status: ${statusUrl}` : '';

    let message: string;

    if (visit.scheduledTime) {
      // Scheduled appointment confirmation
      const formattedDate = new Intl.DateTimeFormat('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(new Date((visit as any).scheduledTime));

      message = `Hi ${visit.customer.name}, your booking was confirmed for *${serviceName}*${locationText} at *${formattedDate}*. Thanks for booking!${linkText}${watermark}`;
    } else {
      // Walk-in: calculate queue position and ETA
      let positionText: string;
      if (visit.queueId) {
        const peopleAhead = await this.prisma.visit.count({
          where: {
            queueId: visit.queueId,
            currentState: 'WAITING',
            createdAt: { lt: visit.createdAt },
          },
        });
        const etaMins = (peopleAhead + 1) * perPersonMins;
        positionText = `\n\nThere are *${peopleAhead}* people ahead of you. Estimated wait: *~${etaMins} mins*. Please move towards the reception when it's your turn.`;
      } else {
        positionText = `\n\nWe'll notify you when it's almost your turn. Type *STATUS* to check your position.`;
      }

      message =
        `Hello ${visit.customer.name} 👋 Your ticket *${displayId}* has been issued${locationText} for *${serviceName}*.` +
        `${positionText}${linkText}${watermark}`;
    }

    // Attempt to send QR code image; fall back to plain text
    if (statusUrl) {
      try {
        const qrDataUrl = await QRCode.toDataURL(statusUrl);
        const qrBase64 = qrDataUrl.split(',')[1] || qrDataUrl;
        const result = await this.whatsappService.sendMediaMessage(
          visit.tenant.whatsappInstanceId!,
          visit.customer.phone!,
          qrBase64,
          'image',
          message,
        );
        await this.communicationLogService.log({
          tenantId: visit.tenantId,
          channel: CommunicationChannel.WHATSAPP,
          type: 'queue_joined',
          recipient: visit.customer.phone!,
          body: message,
          status: result.success ? CommunicationStatus.SENT : CommunicationStatus.FAILED,
          provider: 'evolution',
          providerId: (result as any).providerId,
          errorMessage: result.error,
        });
        return;
      } catch (err: any) {
        this.logger.warn(`VISIT_CREATED QR send failed (${err.message}), falling back to text`);
      }
    }

    const result = await this.whatsappService.sendMessage(
      visit.tenant.whatsappInstanceId!,
      visit.customer.phone!,
      message,
    );
    await this.communicationLogService.log({
      tenantId: visit.tenantId,
      channel: CommunicationChannel.WHATSAPP,
      type: 'queue_joined',
      recipient: visit.customer.phone!,
      body: message,
      status: result.success ? CommunicationStatus.SENT : CommunicationStatus.FAILED,
      provider: 'evolution',
      providerId: (result as any).providerId,
      errorMessage: result.error,
    });
  }

  /** VISIT_CALLED: "It's your turn" notification. */
  private async handleVisitCalled(payload: VisitEventPayload): Promise<void> {
    const visit = await this.fetchVisitBase(payload.visitId!);
    if (!this.canSendWhatsApp(visit, 'VISIT_CALLED')) return;

    const displayId = visit.displayId || payload.displayId || 'Unknown';
    const message =
      `🔔 *It's Your Turn!*\n\nHello ${visit.customer.name}, ticket *${displayId}* for *${visit.service?.name || 'your service'}* is now being called.\n\nPlease proceed to the counter immediately.`;

    const result = await this.whatsappService.sendMessage(
      visit.tenant.whatsappInstanceId!,
      visit.customer.phone!,
      message,
    );
    await this.communicationLogService.log({
      tenantId: visit.tenantId,
      channel: CommunicationChannel.WHATSAPP,
      type: 'visit_called',
      recipient: visit.customer.phone!,
      body: message,
      status: result.success ? CommunicationStatus.SENT : CommunicationStatus.FAILED,
      provider: 'evolution',
      providerId: (result as any).providerId,
      errorMessage: result.error,
    });
  }

  /** VISIT_CANCELLED: Cancellation notification. */
  private async handleVisitCancelled(payload: VisitEventPayload): Promise<void> {
    const visit = await this.fetchVisitBase(payload.visitId!);
    if (!this.canSendWhatsApp(visit, 'VISIT_CANCELLED')) return;

    const displayId = visit.displayId || payload.displayId || 'Unknown';
    const message =
      `❌ *Booking Cancelled*\n\nHello ${visit.customer.name}, your booking for *${visit.service?.name || 'the service'}* (Ticket: ${displayId}) has been cancelled.`;

    const result = await this.whatsappService.sendMessage(
      visit.tenant.whatsappInstanceId!,
      visit.customer.phone!,
      message,
    );
    await this.communicationLogService.log({
      tenantId: visit.tenantId,
      channel: CommunicationChannel.WHATSAPP,
      type: 'visit_cancelled',
      recipient: visit.customer.phone!,
      body: message,
      status: result.success ? CommunicationStatus.SENT : CommunicationStatus.FAILED,
      provider: 'evolution',
      providerId: (result as any).providerId,
      errorMessage: result.error,
    });
  }

  /** VISIT_MISSED: Missed turn notification. */
  private async handleVisitMissed(payload: VisitEventPayload): Promise<void> {
    const visit = await this.fetchVisitBase(payload.visitId!);
    if (!this.canSendWhatsApp(visit, 'VISIT_MISSED')) return;

    const displayId = visit.displayId || payload.displayId || 'Unknown';
    const message =
      `⚠️ *Missed Turn*\n\nHello ${visit.customer.name}, we called your ticket *${displayId}* for *${visit.service?.name || 'the service'}* but you were not present. Please speak to the receptionist.`;

    const result = await this.whatsappService.sendMessage(
      visit.tenant.whatsappInstanceId!,
      visit.customer.phone!,
      message,
    );
    await this.communicationLogService.log({
      tenantId: visit.tenantId,
      channel: CommunicationChannel.WHATSAPP,
      type: 'visit_missed',
      recipient: visit.customer.phone!,
      body: message,
      status: result.success ? CommunicationStatus.SENT : CommunicationStatus.FAILED,
      provider: 'evolution',
      providerId: (result as any).providerId,
      errorMessage: result.error,
    });
  }

  /**
   * VISIT_COMPLETED: Smart Review Gating.
   * Sends a 1–5 star rating request via WhatsApp only when:
   *   1. Tenant has Smart Reviews enabled.
   *   2. The location has a Google Place ID configured.
   *   3. The customer's actual wait time was within the tenant's threshold.
   *
   * Also sets the chat session to step 20 so the chatbot knows to expect a
   * rating response. Phone normalization is consistent with the chatbot's
   * own session lookup.
   */
  private async handleVisitCompleted(payload: VisitEventPayload): Promise<void> {
    const visit = await this.fetchVisitBase(payload.visitId!);
    if (!this.canSendWhatsApp(visit, 'VISIT_COMPLETED')) return;

    if (!visit.tenant.enableSmartReviews || !visit.location?.googlePlaceId) {
      this.logger.debug(
        `VISIT_COMPLETED: Smart Reviews disabled or no Google Place ID for visit ${visit.id}`,
      );
      return;
    }

    // Only send if customer didn't wait too long
    if (!visit.waitingStart || !visit.serviceStart) {
      this.logger.debug(`VISIT_COMPLETED: missing wait timestamps for visit ${visit.id}`);
      return;
    }

    const waitTimeMs = new Date(visit.serviceStart).getTime() - new Date(visit.waitingStart).getTime();
    const waitTimeMins = Math.floor(waitTimeMs / 60000);
    const threshold = visit.tenant.reviewWaitThresholdMins ?? 15;

    if (waitTimeMins > threshold) {
      this.logger.log(
        `VISIT_COMPLETED: skipping review for ${visit.customer.phone} — wait ${waitTimeMins}m > threshold ${threshold}m`,
      );
      return;
    }

    const message =
      `🌟 *How did we do?*\n\nHi ${visit.customer.name}, thanks for visiting us for ${visit.service?.name || 'your service'}!\n\nPlease reply with a number from *1 to 5* to rate your experience (5 being excellent).`;

    const result = await this.whatsappService.sendMessage(
      visit.tenant.whatsappInstanceId!,
      visit.customer.phone!,
      message,
    );
    this.logger.log(
      `Smart Review request sent to ${visit.customer.phone} (wait ${waitTimeMins}m <= threshold ${threshold}m)`,
    );

    await this.communicationLogService.log({
      tenantId: visit.tenantId,
      channel: CommunicationChannel.WHATSAPP,
      type: 'visit_completed',
      recipient: visit.customer.phone!,
      body: message,
      status: result.success ? CommunicationStatus.SENT : CommunicationStatus.FAILED,
      provider: 'evolution',
      providerId: (result as any).providerId,
      errorMessage: result.error,
    });

    // Set chat session to step 20 so the chatbot awaits a rating reply.
    // `normalizePhone` is used here for consistent session lookup.
    try {
      const normalizedPhone = this.normalizePhone(visit.customer.phone!);
      await this.prisma.chatSession.upsert({
        where: { tenantId_phone: { tenantId: visit.tenantId, phone: normalizedPhone } },
        update: { step: 20, context: { locationId: visit.locationId } },
        create: { tenantId: visit.tenantId, phone: normalizedPhone, step: 20, context: { locationId: visit.locationId } },
      });
    } catch (err: any) {
      this.logger.error(`VISIT_COMPLETED: failed to set chat session step 20 — ${err.message}`);
    }
  }
}
