import {
  Controller,
  Get,
  Post,
  UseGuards,
  Req,
  Body,
  Param,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { WhatsappService } from './whatsapp.service';
import { WhatsappLogger } from './whatsapp.logger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { WorkspaceGuard } from '../auth/workspace.guard';
import type { AuthenticatedRequest } from '../auth/types/auth.types';
import { SubscriptionService } from '../subscription/subscription.service';
import { BillingException } from '../billing/errors/billing-exceptions';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Controller('whatsapp')
export class WhatsappController {
  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly whatsappLogger: WhatsappLogger,
    private readonly subscriptionService: SubscriptionService,
    @InjectQueue('whatsapp-webhooks') private readonly webhooksQueue: Queue,
  ) {}

  private async checkWhatsappFeature(tenantId: string) {
    const sub = await this.subscriptionService.getSubscription(tenantId);
    if (!sub || !sub.plan) return;

    const features = (sub.plan.features as any) || {};
    if (
      features.whatsappNotifications === false &&
      features.whatsappChat === false &&
      features.whatsappChatbot === false
    ) {
      throw new BillingException(
        'WhatsApp integration is not available on your current plan. Please upgrade.',
      );
    }
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN, Role.ADMIN, Role.OPERATOR)
  @Post('connect')
  async connect(
    @Req() req: AuthenticatedRequest,
    @Body() body?: { forceRefresh?: boolean },
  ) {
    const targetId =
      req.user.tenantId ||
      (req.user as any).workspaceId ||
      (req.user as any).userId;

    await this.checkWhatsappFeature(req.user.tenantId);
    return this.whatsappService.connect(targetId, body?.forceRefresh);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN, Role.ADMIN, Role.OPERATOR)
  @Post('generate-validation-code')
  async generateValidationCode(@Req() req: AuthenticatedRequest) {
    const targetId =
      req.user.tenantId ||
      (req.user as any).workspaceId ||
      (req.user as any).userId;
    await this.checkWhatsappFeature(req.user.tenantId);
    return this.whatsappService.generateValidationCode(targetId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN, Role.ADMIN, Role.OPERATOR)
  @Post('pairing-code')
  async generatePairingCode(
    @Req() req: AuthenticatedRequest,
    @Body() body: { phoneNumber: string },
  ) {
    const targetId =
      req.user.tenantId ||
      (req.user as any).workspaceId ||
      (req.user as any).userId;
    await this.checkWhatsappFeature(req.user.tenantId);
    return this.whatsappService.generatePairingCode(targetId, body.phoneNumber);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN, Role.ADMIN, Role.OPERATOR)
  @Post('connect-with-code')
  connectWithCode(
    @Req() req: AuthenticatedRequest,
    @Body() body: { validationCode: string },
  ) {
    const targetId =
      req.user.tenantId ||
      (req.user as any).workspaceId ||
      (req.user as any).userId;
    return this.whatsappService.connectWithValidationCode(
      targetId,
      body.validationCode,
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN, Role.ADMIN, Role.OPERATOR)
  @Post('disconnect')
  disconnect(@Req() req: AuthenticatedRequest) {
    const targetId =
      req.user.tenantId ||
      (req.user as any).workspaceId ||
      (req.user as any).userId;
    return this.whatsappService.disconnect(targetId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN, Role.ADMIN, Role.OPERATOR)
  @Post('test')
  testMessage(
    @Req() req: AuthenticatedRequest,
    @Body() body: { phone: string; message: string },
  ) {
    const targetId =
      req.user.tenantId ||
      (req.user as any).workspaceId ||
      (req.user as any).userId;
    return this.whatsappService.testMessage(targetId, body.phone, body.message);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('status')
  status(@Req() req: AuthenticatedRequest) {
    const targetId = req.user.tenantId || (req.user as any).workspaceId;
    if (!targetId) {
      return { state: 'unconfigured' };
    }
    return this.whatsappService.status(targetId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('cached-qr')
  async getCachedQr(@Req() req: AuthenticatedRequest) {
    const targetId =
      req.user.tenantId ||
      (req.user as any).workspaceId ||
      (req.user as any).userId;
    if (!targetId) return { qr: null };
    const result = await this.whatsappService.getCachedQr(targetId);
    if (!result) return { qr: null };
    return { qr: result.qr || null, expiresAt: result.expiresAt || null };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('logs')
  getLogs(@Req() req: AuthenticatedRequest) {
    const targetId = req.user.tenantId || (req.user as any).workspaceId;
    if (!targetId) {
      return [];
    }
    return this.whatsappService.getTenantLogs(targetId);
  }

  @Post('webhook/:instanceName')
  @Throttle({ default: { limit: 200, ttl: 60000 } })
  async handleWebhook(
    @Param('instanceName') instanceName: string,
    @Req() req: any,
    @Body() body: any,
  ) {
    const expectedSecret = process.env.WEBHOOK_SECRET;
    if (!expectedSecret && process.env.NODE_ENV === 'production') {
      throw new UnauthorizedException('Webhook secret not configured');
    }
    if (expectedSecret) {
      const secret = req.query.secret as string;
      if (!secret || secret !== expectedSecret) {
        throw new UnauthorizedException('Invalid webhook secret');
      }
    }

    // Push the webhook payload to BullMQ for asynchronous processing
    await this.webhooksQueue.add(
      'process-webhook',
      { instanceName, body },
      { removeOnComplete: true, removeOnFail: 100 }, // Keep 100 failed jobs for debugging
    );

    return { accepted: true };
  }

  // Dev helper: simulate an Evolution webhook payload locally.
  // Protected: only accessible to authenticated SUPER_ADMIN users to avoid accidental exposure.
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Post('simulate-webhook/:instanceName')
  async simulateWebhook(
    @Param('instanceName') instanceName: string,
    @Req() req: AuthenticatedRequest,
    @Body() body: any,
  ) {
    // Directly invoke the handler so we can test processing without requiring the webhook secret.
    return this.whatsappService.handleWebhook(instanceName, body);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Get('debug/:key')
  async getDebugKey(@Param('key') key: string) {
    return { key, value: await this.whatsappService.getDebugKey(key) };
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Get('debug')
  async getDebugKeyQuery(@Req() req: any) {
    const key = req.query.key as string;
    if (!key) return { error: 'missing key query param' };
    return { key, value: await this.whatsappService.getDebugKey(key) };
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN, Role.ADMIN, Role.OPERATOR)
  @Post('settings')
  saveChatbotSettings(@Req() req: AuthenticatedRequest, @Body() body: any) {
    const targetId =
      req.user.tenantId ||
      (req.user as any).workspaceId ||
      (req.user as any).userId;
    return this.whatsappService.saveChatbotSettings(targetId, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('frontend-log')
  frontendLog(
    @Req() req: AuthenticatedRequest,
    @Body() body: { level: string; message: string; data?: any },
  ) {
    const targetId =
      req.user.tenantId ||
      (req.user as any).workspaceId ||
      (req.user as any).userId;
    const source = `Frontend-[Tenant-${targetId}]`;
    const { level, message, data } = body;

    switch (level?.toLowerCase()) {
      case 'info':
        this.whatsappLogger.info(source, message, data);
        break;
      case 'error':
        this.whatsappLogger.error(source, message, data);
        break;
      case 'warn':
        this.whatsappLogger.warn(source, message, data);
        break;
      default:
        this.whatsappLogger.debug(source, message, data);
    }
    return { success: true };
  }
}
