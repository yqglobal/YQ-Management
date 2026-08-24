import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CommunicationEvent } from './events/communication-events.enum';
import type { EmailProvider } from './interfaces/email.provider';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { TemplateService } from './templates/template.service';
import * as QRCode from 'qrcode';
import {
  CommunicationLogService,
  CommunicationChannel,
  CommunicationStatus,
} from './logging/communication-log.service';

interface CommunicationPayload {
  [key: string]: any;
}

@Injectable()
export class CommunicationService {
  private readonly logger = new Logger(CommunicationService.name);

  constructor(
    @InjectQueue('communication') private readonly communicationQueue: Queue,
    @Inject('EmailProvider') private readonly emailProvider: EmailProvider,
    private readonly whatsappService: WhatsappService,
    private readonly templateService: TemplateService,
    private readonly communicationLogService: CommunicationLogService,
  ) {}

  private async resolveTenantId(workspaceId: string): Promise<string | null> {
    if (!workspaceId) return null;
    try {
      const workspace = await this.whatsappService[
        'prisma'
      ].workspace.findUnique({
        where: { id: workspaceId },
        select: { tenantId: true },
      });
      return workspace?.tenantId || null;
    } catch (e) {
      this.logger.warn(
        `Failed to resolve tenant for workspace ${workspaceId}: ${e instanceof Error ? e.message : e}`,
      );
      return null;
    }
  }

  async publish(event: CommunicationEvent, payload: CommunicationPayload) {
    this.logger.log(`Publishing communication event: ${event}`);

    const jobData = { event, payload, timestamp: new Date().toISOString() };
    await this.communicationQueue.add('process', jobData, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });
  }

  async processEvent(event: CommunicationEvent, payload: CommunicationPayload) {
    switch (event) {
      case CommunicationEvent.USER_REGISTERED:
        await this.handleUserRegistered(payload);
        break;
      case CommunicationEvent.LOGIN_OTP_REQUESTED:
        await this.handleLoginOtpRequested(payload);
        break;
      case CommunicationEvent.SIGNUP_OTP_REQUESTED:
        await this.handleSignupOtpRequested(payload);
        break;
      case CommunicationEvent.PASSWORD_RESET_REQUESTED:
        await this.handlePasswordResetRequested(payload);
        break;
      case CommunicationEvent.WORKSPACE_INVITED:
        await this.handleWorkspaceInvited(payload);
        break;
      case CommunicationEvent.CUSTOMER_VERIFIED:
        await this.handleCustomerVerified(payload);
        break;
      case CommunicationEvent.QUEUE_JOINED:
        await this.handleQueueJoined(payload);
        break;
      case CommunicationEvent.POSITION_CHANGED:
        await this.handlePositionChanged(payload);
        break;
      case CommunicationEvent.NOW_SERVING:
        await this.handleNowServing(payload);
        break;
      case CommunicationEvent.QUEUE_DELAYED:
        await this.handleQueueDelayed(payload);
        break;
      case CommunicationEvent.QUEUE_COMPLETED:
        await this.handleQueueCompleted(payload);
        break;
      case CommunicationEvent.QUEUE_CANCELLED:
        await this.handleQueueCancelled(payload);
        break;
      case CommunicationEvent.FEEDBACK_REQUESTED:
        await this.handleFeedbackRequested(payload);
        break;
      case CommunicationEvent.CHECK_IN:
        await this.handleCheckIn(payload);
        break;
      case CommunicationEvent.TOKEN_TRANSFERRED:
        await this.handleTokenTransferred(payload);
        break;
      case CommunicationEvent.BILLING_PAYMENT_SUCCESS:
        await this.handleBillingPaymentSuccess(payload);
        break;
      case CommunicationEvent.BILLING_PAYMENT_FAILED:
        await this.handleBillingPaymentFailed(payload);
        break;
      case CommunicationEvent.BILLING_TRIAL_ENDING:
        await this.handleBillingTrialEnding(payload);
        break;
      case CommunicationEvent.BILLING_SUBSCRIPTION_RENEWED:
        await this.handleBillingSubscriptionRenewed(payload);
        break;
      case CommunicationEvent.BILLING_SUBSCRIPTION_CANCELLED:
        await this.handleBillingSubscriptionCancelled(payload);
        break;
      case CommunicationEvent.BILLING_SUBSCRIPTION_EXPIRED:
        await this.handleBillingSubscriptionExpired(payload);
        break;
      case CommunicationEvent.BILLING_PAYMENT_REMINDER:
        await this.handleBillingPaymentReminder(payload);
        break;
      case CommunicationEvent.MARKETING_WELCOME:
        await this.handleMarketingWelcome(payload);
        break;
      default:
        this.logger.warn(`Unknown communication event: ${event}`);
    }
  }

  private async handleUserRegistered(payload: any) {
    const { email, name } = payload;
    if (!email) return;

    const template = this.templateService.renderEmail('welcome', {
      name: name || 'there',
      dashboard_url: `${process.env.APP_URL ? (process.env.APP_URL.startsWith('http') ? process.env.APP_URL : 'https://' + process.env.APP_URL) : 'http://localhost:3001'}/dashboard`,
    });

    const result = await this.emailProvider.send({
      to: email,
      subject: template.subject || 'Qmova Notification',
      htmlContent: template.html,
      textContent: template.text,
      tags: [{ name: 'type', value: 'marketing' }],
    });

    await this.communicationLogService.log({
      channel: CommunicationChannel.EMAIL,
      type: 'welcome',
      recipient: email,
      subject: template.subject || 'Qmova Notification',
      body: template.text || '',
      status: result.success
        ? CommunicationStatus.SENT
        : CommunicationStatus.FAILED,
      provider: 'brevo',
      providerId: (result as any).providerId,
      errorMessage: result.error,
      workspaceId: payload.workspaceId,
    });
  }

  private async handleLoginOtpRequested(payload: any) {
    const { email, otp } = payload;
    if (!email) return;

    const template = this.templateService.renderEmail('login_otp', { otp });
    const result = await this.emailProvider.send({
      to: email,
      subject: template.subject || 'Qmova Notification',
      htmlContent: template.html,
      textContent: template.text,
      tags: [{ name: 'type', value: 'auth' }],
    });

    await this.communicationLogService.log({
      channel: CommunicationChannel.EMAIL,
      type: 'login_otp',
      recipient: email,
      subject: template.subject || 'Qmova Notification',
      body: template.text || '',
      status: result.success
        ? CommunicationStatus.SENT
        : CommunicationStatus.FAILED,
      provider: 'brevo',
      providerId: (result as any).providerId,
      errorMessage: result.error,
      workspaceId: payload.workspaceId,
    });
  }

  private async handleSignupOtpRequested(payload: any) {
    const { email, otp } = payload;
    if (!email) return;

    const template = this.templateService.renderEmail('signup_otp', { otp });
    const result = await this.emailProvider.send({
      to: email,
      subject: template.subject || 'Qmova Notification',
      htmlContent: template.html,
      textContent: template.text,
      tags: [{ name: 'type', value: 'auth' }],
    });

    await this.communicationLogService.log({
      channel: CommunicationChannel.EMAIL,
      type: 'signup_otp',
      recipient: email,
      subject: template.subject || 'Qmova Notification',
      body: template.text || '',
      status: result.success
        ? CommunicationStatus.SENT
        : CommunicationStatus.FAILED,
      provider: 'brevo',
      providerId: (result as any).providerId,
      errorMessage: result.error,
      workspaceId: payload.workspaceId,
    });
  }

  private async handlePasswordResetRequested(payload: any) {
    const { email, resetLink } = payload;
    if (!email) return;

    const template = this.templateService.renderEmail('password_reset', {
      name: 'User',
      reset_link: resetLink || '#',
    });
    const result = await this.emailProvider.send({
      to: email,
      subject: template.subject || 'Qmova Notification',
      htmlContent: template.html,
      textContent: template.text,
      tags: [{ name: 'type', value: 'auth' }],
    });

    await this.communicationLogService.log({
      channel: CommunicationChannel.EMAIL,
      type: 'password_reset',
      recipient: email,
      subject: template.subject || 'Qmova Notification',
      body: template.text || '',
      status: result.success
        ? CommunicationStatus.SENT
        : CommunicationStatus.FAILED,
      provider: 'brevo',
      providerId: (result as any).providerId,
      errorMessage: result.error,
      workspaceId: payload.workspaceId,
    });
  }

  private async handleWorkspaceInvited(payload: any) {
    const { email, code, inviterName } = payload;
    if (!email) return;

    const template = this.templateService.renderEmail('workspace_invite', {
      name: 'Team Member',
      inviter_name: inviterName || 'A team member',
      code: code || '',
    });
    const result = await this.emailProvider.send({
      to: email,
      subject: template.subject || 'Qmova Notification',
      htmlContent: template.html,
      textContent: template.text,
      tags: [{ name: 'type', value: 'invitation' }],
    });

    await this.communicationLogService.log({
      channel: CommunicationChannel.EMAIL,
      type: 'workspace_invite',
      recipient: email,
      subject: template.subject || 'Qmova Notification',
      body: template.text || '',
      status: result.success
        ? CommunicationStatus.SENT
        : CommunicationStatus.FAILED,
      provider: 'brevo',
      providerId: (result as any).providerId,
      errorMessage: result.error,
      workspaceId: payload.workspaceId,
    });
  }

  private async handleCustomerVerified(payload: any) {
    const { phone, otp } = payload;
    if (!phone) return;

    const body = this.templateService.renderWhatsApp('otp', { otp });
    const tenantId = await this.resolveTenantId(payload.workspaceId);
    const result = tenantId
      ? await this.whatsappService.sendToTenant(tenantId, phone, body)
      : { success: false, error: 'No tenant context for WhatsApp' };

    await this.communicationLogService.log({
      channel: CommunicationChannel.WHATSAPP,
      type: 'otp',
      recipient: phone,
      body,
      status: result.success
        ? CommunicationStatus.SENT
        : CommunicationStatus.FAILED,
      provider: 'evolution',
      providerId: (result as any).providerId,
      errorMessage: result.error,
      workspaceId: payload.workspaceId,
    });
  }

  private async handleQueueJoined(payload: any) {
    const { phone, name, queueName, position, tokenId, queueId, workspaceId } =
      payload;
    if (!phone) return;

    const link = `${process.env.APP_URL ? (process.env.APP_URL.startsWith('http') ? process.env.APP_URL : 'https://' + process.env.APP_URL) : 'http://localhost:3001'}/customer/status/${tokenId}`;
    const body = this.templateService.renderWhatsApp('queue_joined', {
      name: name || 'Customer',
      queue_name: queueName || 'the queue',
      position: position || '1',
      link,
    });
    const tenantId = await this.resolveTenantId(workspaceId);

    let result: any = {
      success: false,
      error: 'No tenant context for WhatsApp',
    };
    if (tenantId) {
      result = await this.whatsappService.sendToTenant(tenantId, phone, body);

      // Send QR Code as a follow-up media message
      try {
        const qrBase64DataUrl = await QRCode.toDataURL(link, {
          width: 400,
          margin: 2,
        });
        // The Data URL looks like: "data:image/png;base64,iVBORw0KGgo..."
        // Evolution API might accept the whole data URI or just the base64 part. Usually just base64 or data uri is fine.
        const base64Data = qrBase64DataUrl.split(',')[1] || qrBase64DataUrl;
        await this.whatsappService.sendMediaToTenant(
          tenantId,
          phone,
          qrBase64DataUrl, // Many APIs accept the data URI. If it fails, we can strip it. Evolution API accepts base64 with or without mime, let's send data URI.
          'image',
          'Your Boarding Pass',
        );
      } catch (err) {
        this.logger.error(`Failed to generate/send QR code to ${phone}:`, err);
      }
    }

    await this.communicationLogService.log({
      channel: CommunicationChannel.WHATSAPP,
      type: 'queue_joined',
      recipient: phone,
      body,
      status: result.success
        ? CommunicationStatus.SENT
        : CommunicationStatus.FAILED,
      provider: 'evolution',
      providerId: result.providerId,
      errorMessage: result.error,
      workspaceId,
    });
  }

  private async handlePositionChanged(payload: any) {
    const { phone, name, queueName, position, waitTime } = payload;
    if (!phone) return;

    const body = this.templateService.renderWhatsApp('position_update', {
      name: name || 'Customer',
      queue_name: queueName || 'the queue',
      position: String(position || '1'),
      wait_time: String(waitTime || '5'),
    });
    const tenantId = await this.resolveTenantId(payload.workspaceId);
    const result = tenantId
      ? await this.whatsappService.sendToTenant(tenantId, phone, body)
      : { success: false, error: 'No tenant context for WhatsApp' };

    await this.communicationLogService.log({
      channel: CommunicationChannel.WHATSAPP,
      type: 'position_update',
      recipient: phone,
      body,
      status: result.success
        ? CommunicationStatus.SENT
        : CommunicationStatus.FAILED,
      provider: 'evolution',
      providerId: (result as any).providerId,
      errorMessage: result.error,
      workspaceId: payload.workspaceId,
    });
  }

  private async handleNowServing(payload: any) {
    const { phone, name, queueName } = payload;
    if (!phone) return;

    const body = this.templateService.renderWhatsApp('now_serving', {
      name: name || 'Customer',
      queue_name: queueName || 'the queue',
    });
    const tenantId = await this.resolveTenantId(payload.workspaceId);
    const result = tenantId
      ? await this.whatsappService.sendToTenant(tenantId, phone, body)
      : { success: false, error: 'No tenant context for WhatsApp' };

    await this.communicationLogService.log({
      channel: CommunicationChannel.WHATSAPP,
      type: 'now_serving',
      recipient: phone,
      body,
      status: result.success
        ? CommunicationStatus.SENT
        : CommunicationStatus.FAILED,
      provider: 'evolution',
      providerId: (result as any).providerId,
      errorMessage: result.error,
      workspaceId: payload.workspaceId,
    });
  }

  private async handleQueueDelayed(payload: any) {
    const { phone, name, queueName, waitTime } = payload;
    if (!phone) return;

    const body = this.templateService.renderWhatsApp('delay', {
      name: name || 'Customer',
      queue_name: queueName || 'the queue',
      wait_time: String(waitTime || '10'),
    });
    const tenantId = await this.resolveTenantId(payload.workspaceId);
    const result = tenantId
      ? await this.whatsappService.sendToTenant(tenantId, phone, body)
      : { success: false, error: 'No tenant context for WhatsApp' };

    await this.communicationLogService.log({
      channel: CommunicationChannel.WHATSAPP,
      type: 'delay',
      recipient: phone,
      body,
      status: result.success
        ? CommunicationStatus.SENT
        : CommunicationStatus.FAILED,
      provider: 'evolution',
      providerId: (result as any).providerId,
      errorMessage: result.error,
      workspaceId: payload.workspaceId,
    });
  }

  private async handleQueueCompleted(payload: any) {
    const { phone, name, queueName } = payload;
    if (!phone) return;

    const body = this.templateService.renderWhatsApp('queue_closed', {
      name: name || 'Customer',
      queue_name: queueName || 'the queue',
    });
    const tenantId = await this.resolveTenantId(payload.workspaceId);
    const result = tenantId
      ? await this.whatsappService.sendToTenant(tenantId, phone, body)
      : { success: false, error: 'No tenant context for WhatsApp' };

    await this.communicationLogService.log({
      channel: CommunicationChannel.WHATSAPP,
      type: 'queue_completed',
      recipient: phone,
      body,
      status: result.success
        ? CommunicationStatus.SENT
        : CommunicationStatus.FAILED,
      provider: 'evolution',
      providerId: (result as any).providerId,
      errorMessage: result.error,
      workspaceId: payload.workspaceId,
    });
  }

  private async handleQueueCancelled(payload: any) {
    const { phone, name, queueName } = payload;
    if (!phone) return;

    const body = this.templateService.renderWhatsApp('queue_cancelled', {
      name: name || 'Customer',
      queue_name: queueName || 'the queue',
    });
    const tenantId = await this.resolveTenantId(payload.workspaceId);
    const result = tenantId
      ? await this.whatsappService.sendToTenant(tenantId, phone, body)
      : { success: false, error: 'No tenant context for WhatsApp' };

    await this.communicationLogService.log({
      channel: CommunicationChannel.WHATSAPP,
      type: 'queue_cancelled',
      recipient: phone,
      body,
      status: result.success
        ? CommunicationStatus.SENT
        : CommunicationStatus.FAILED,
      provider: 'evolution',
      providerId: (result as any).providerId,
      errorMessage: result.error,
      workspaceId: payload.workspaceId,
    });
  }

  private async handleFeedbackRequested(payload: any) {
    const { phone, name, queueName } = payload;
    if (!phone) return;

    const body = this.templateService.renderWhatsApp('feedback', {
      name: name || 'Customer',
      queue_name: queueName || 'the queue',
    });
    const tenantId = await this.resolveTenantId(payload.workspaceId);
    const result = tenantId
      ? await this.whatsappService.sendToTenant(tenantId, phone, body)
      : { success: false, error: 'No tenant context for WhatsApp' };

    await this.communicationLogService.log({
      channel: CommunicationChannel.WHATSAPP,
      type: 'feedback',
      recipient: phone,
      body,
      status: result.success
        ? CommunicationStatus.SENT
        : CommunicationStatus.FAILED,
      provider: 'evolution',
      providerId: (result as any).providerId,
      errorMessage: result.error,
      workspaceId: payload.workspaceId,
    });
  }

  private async handleCheckIn(payload: any) {
    const { phone, name, queueName } = payload;
    if (!phone) return;

    const body = this.templateService.renderWhatsApp('queue_joined', {
      name: name || 'Customer',
      queue_name: queueName || 'the queue',
      position: '1',
      link: `${process.env.APP_URL ? (process.env.APP_URL.startsWith('http') ? process.env.APP_URL : 'https://' + process.env.APP_URL) : 'http://localhost:3001'}/customer/status/${payload.tokenId || ''}`,
    });
    const tenantId = await this.resolveTenantId(payload.workspaceId);
    const result = tenantId
      ? await this.whatsappService.sendToTenant(tenantId, phone, body)
      : { success: false, error: 'No tenant context for WhatsApp' };

    await this.communicationLogService.log({
      channel: CommunicationChannel.WHATSAPP,
      type: 'check_in',
      recipient: phone,
      body,
      status: result.success
        ? CommunicationStatus.SENT
        : CommunicationStatus.FAILED,
      provider: 'evolution',
      providerId: (result as any).providerId,
      errorMessage: result.error,
      workspaceId: payload.workspaceId,
    });
  }

  private async handleTokenTransferred(payload: any) {
    const { phone, newQueueName } = payload;
    if (!phone) return;

    const body = this.templateService.renderWhatsApp('queue_cancelled', {
      name: 'Customer',
      queue_name: newQueueName || 'a new queue',
    });
    const tenantId = await this.resolveTenantId(payload.workspaceId);
    const result = tenantId
      ? await this.whatsappService.sendToTenant(tenantId, phone, body)
      : { success: false, error: 'No tenant context for WhatsApp' };

    await this.communicationLogService.log({
      channel: CommunicationChannel.WHATSAPP,
      type: 'token_transferred',
      recipient: phone,
      body,
      status: result.success
        ? CommunicationStatus.SENT
        : CommunicationStatus.FAILED,
      provider: 'evolution',
      providerId: (result as any).providerId,
      errorMessage: result.error,
      workspaceId: payload.workspaceId,
    });
  }

  private async handleBillingPaymentSuccess(payload: any) {
    const { email, workspaceName, amount, currency } = payload;
    if (!email) return;

    const template = this.templateService.renderEmail('payment_success', {
      workspace: workspaceName,
      amount: amount?.toFixed(2),
      currency: currency || 'ZAR',
    });
    const result = await this.emailProvider.send({
      to: email,
      subject: template.subject || 'Qmova Notification',
      htmlContent: template.html,
      textContent: template.text,
      tags: [{ name: 'type', value: 'billing' }],
    });

    await this.communicationLogService.log({
      channel: CommunicationChannel.EMAIL,
      type: 'payment_success',
      recipient: email,
      subject: template.subject || 'Qmova Notification',
      body: template.text || '',
      status: result.success
        ? CommunicationStatus.SENT
        : CommunicationStatus.FAILED,
      provider: 'brevo',
      providerId: result.providerId,
      errorMessage: result.error,
      workspaceId: payload.workspaceId,
    });
  }

  private async handleBillingPaymentFailed(payload: any) {
    const { email, workspaceName } = payload;
    if (!email) return;

    const template = this.templateService.renderEmail('payment_failed', {
      workspace: workspaceName,
    });
    const result = await this.emailProvider.send({
      to: email,
      subject: template.subject || 'Qmova Notification',
      htmlContent: template.html,
      textContent: template.text,
      tags: [{ name: 'type', value: 'billing' }],
    });

    await this.communicationLogService.log({
      channel: CommunicationChannel.EMAIL,
      type: 'payment_failed',
      recipient: email,
      subject: template.subject || 'Qmova Notification',
      body: template.text || '',
      status: result.success
        ? CommunicationStatus.SENT
        : CommunicationStatus.FAILED,
      provider: 'brevo',
      providerId: result.providerId,
      errorMessage: result.error,
      workspaceId: payload.workspaceId,
    });
  }

  private async handleBillingTrialEnding(payload: any) {
    const { email, workspaceName, daysRemaining } = payload;
    if (!email) return;

    const template = this.templateService.renderEmail('trial_ending', {
      workspace: workspaceName,
      days: String(daysRemaining || 7),
    });
    const result = await this.emailProvider.send({
      to: email,
      subject: template.subject || 'Qmova Notification',
      htmlContent: template.html,
      textContent: template.text,
      tags: [{ name: 'type', value: 'billing' }],
    });

    await this.communicationLogService.log({
      channel: CommunicationChannel.EMAIL,
      type: 'trial_ending',
      recipient: email,
      subject: template.subject || 'Qmova Notification',
      body: template.text || '',
      status: result.success
        ? CommunicationStatus.SENT
        : CommunicationStatus.FAILED,
      provider: 'brevo',
      providerId: result.providerId,
      errorMessage: result.error,
      workspaceId: payload.workspaceId,
    });
  }

  private async handleBillingSubscriptionRenewed(payload: any) {
    const { email, workspaceName, nextBillingDate } = payload;
    if (!email) return;

    const template = this.templateService.renderEmail('subscription_renewed', {
      workspace: workspaceName,
      next_billing_date: nextBillingDate
        ? new Date(nextBillingDate).toLocaleDateString()
        : 'soon',
    });
    const result = await this.emailProvider.send({
      to: email,
      subject: template.subject || 'Qmova Notification',
      htmlContent: template.html,
      textContent: template.text,
      tags: [{ name: 'type', value: 'billing' }],
    });

    await this.communicationLogService.log({
      channel: CommunicationChannel.EMAIL,
      type: 'subscription_renewed',
      recipient: email,
      subject: template.subject || 'Qmova Notification',
      body: template.text || '',
      status: result.success
        ? CommunicationStatus.SENT
        : CommunicationStatus.FAILED,
      provider: 'brevo',
      providerId: result.providerId,
      errorMessage: result.error,
      workspaceId: payload.workspaceId,
    });
  }

  private async handleBillingSubscriptionCancelled(payload: any) {
    const { email, workspaceName } = payload;
    if (!email) return;

    const template = this.templateService.renderEmail(
      'subscription_cancelled',
      {
        workspace: workspaceName,
      },
    );
    const result = await this.emailProvider.send({
      to: email,
      subject: template.subject || 'Qmova Notification',
      htmlContent: template.html,
      textContent: template.text,
      tags: [{ name: 'type', value: 'billing' }],
    });

    await this.communicationLogService.log({
      channel: CommunicationChannel.EMAIL,
      type: 'subscription_cancelled',
      recipient: email,
      subject: template.subject || 'Qmova Notification',
      body: template.text || '',
      status: result.success
        ? CommunicationStatus.SENT
        : CommunicationStatus.FAILED,
      provider: 'brevo',
      providerId: result.providerId,
      errorMessage: result.error,
      workspaceId: payload.workspaceId,
    });
  }

  private async handleBillingSubscriptionExpired(payload: any) {
    const { email, workspaceName } = payload;
    if (!email) return;

    const template = this.templateService.renderEmail('subscription_expired', {
      workspace: workspaceName,
    });
    const result = await this.emailProvider.send({
      to: email,
      subject: template.subject || 'Qmova Notification',
      htmlContent: template.html,
      textContent: template.text,
      tags: [{ name: 'type', value: 'billing' }],
    });

    await this.communicationLogService.log({
      channel: CommunicationChannel.EMAIL,
      type: 'subscription_expired',
      recipient: email,
      subject: template.subject || 'Qmova Notification',
      body: template.text || '',
      status: result.success
        ? CommunicationStatus.SENT
        : CommunicationStatus.FAILED,
      provider: 'brevo',
      providerId: result.providerId,
      errorMessage: result.error,
      workspaceId: payload.workspaceId,
    });
  }

  private async handleBillingPaymentReminder(payload: any) {
    const { email, workspaceName, amount, currency } = payload;
    if (!email) return;

    const template = this.templateService.renderEmail('payment_reminder', {
      workspace: workspaceName,
      amount: amount?.toFixed(2),
      currency: currency || 'ZAR',
    });
    const result = await this.emailProvider.send({
      to: email,
      subject: template.subject || 'Qmova Notification',
      htmlContent: template.html,
      textContent: template.text,
      tags: [{ name: 'type', value: 'billing' }],
    });

    await this.communicationLogService.log({
      channel: CommunicationChannel.EMAIL,
      type: 'payment_reminder',
      recipient: email,
      subject: template.subject || 'Qmova Notification',
      body: template.text || '',
      status: result.success
        ? CommunicationStatus.SENT
        : CommunicationStatus.FAILED,
      provider: 'brevo',
      providerId: result.providerId,
      errorMessage: result.error,
      workspaceId: payload.workspaceId,
    });
  }

  private async handleMarketingWelcome(payload: any) {
    const { email, name } = payload;
    if (!email) return;

    const template = this.templateService.renderEmail('welcome', {
      name: name || 'there',
      dashboard_url: `${process.env.APP_URL ? (process.env.APP_URL.startsWith('http') ? process.env.APP_URL : 'https://' + process.env.APP_URL) : 'http://localhost:3001'}/dashboard`,
    });
    const result = await this.emailProvider.send({
      to: email,
      subject: template.subject || 'Qmova Notification',
      htmlContent: template.html,
      textContent: template.text,
      tags: [{ name: 'type', value: 'marketing' }],
    });

    await this.communicationLogService.log({
      channel: CommunicationChannel.EMAIL,
      type: 'marketing_welcome',
      recipient: email,
      subject: template.subject || 'Qmova Notification',
      body: template.text || '',
      status: result.success
        ? CommunicationStatus.SENT
        : CommunicationStatus.FAILED,
      provider: 'brevo',
      providerId: result.providerId,
      errorMessage: result.error,
      workspaceId: payload.workspaceId,
    });
  }
}
