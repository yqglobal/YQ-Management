import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  UseGuards,
  Request,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { WorkspaceGuard } from '../auth/workspace.guard';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { PaymentsService } from '../payments/payments.service';
import { InvoiceService } from '../invoice/invoice.service';
import { UsageService } from '../usage/usage.service';
import { CreateSubscriptionDto } from '../subscription/dto/subscription.dto';
import { UpgradeSubscriptionDto } from '../subscription/dto/subscription.dto';
import { DowngradeSubscriptionDto } from '../subscription/dto/subscription.dto';
import { CancelSubscriptionDto } from '../subscription/dto/subscription.dto';
import { ResumeSubscriptionDto } from '../subscription/dto/subscription.dto';
import { GenerateInvoiceDto } from './dto/billing.dto';
import type { AuthenticatedRequest } from '../auth/types/auth.types';

@Controller('billing')
@UseGuards(AuthGuard('jwt'), RolesGuard, WorkspaceGuard)
@Roles(Role.TENANT_ADMIN, Role.OPERATOR, Role.SUPER_ADMIN, Role.ADMIN)
export class BillingController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly paymentsService: PaymentsService,
    private readonly invoiceService: InvoiceService,
    private readonly usageService: UsageService,
    private readonly prisma: PrismaService,
  ) {}

  private async resolveTenantId(
    req: AuthenticatedRequest,
  ): Promise<string | null> {
    return req.user.tenantId || null;
  }

  @Get('workspace')
  async getWorkspaceBilling(@Request() req: AuthenticatedRequest) {
    const tenantId = await this.resolveTenantId(req);
    if (!tenantId) return null;
    const [subscription, transactions, usage] = await Promise.all([
      this.subscriptionService.getSubscription(tenantId),
      this.paymentsService.getTransactionHistory(tenantId, 0, 20),
      this.usageService.getUsage(tenantId),
    ]);

    return {
      subscription,
      transactions,
      usage,
      billingSettings: null,
    };
  }

  @Get('workspace/usage')
  async getUsage(
    @Request() req: AuthenticatedRequest,
    @Query('periodStart') periodStart?: string,
    @Query('periodEnd') periodEnd?: string,
  ) {
    const ps = periodStart ? new Date(periodStart) : undefined;
    const pe = periodEnd ? new Date(periodEnd) : undefined;
    const tenantId = await this.resolveTenantId(req);
    if (!tenantId) return null;
    return this.usageService.getUsage(tenantId, ps, pe);
  }

  @Get(['workspace/subscription', 'subscriptions/current'])
  async getCurrentSubscription(@Request() req: AuthenticatedRequest) {
    const targetId = await this.resolveTenantId(req);
    if (!targetId) return null;
    return this.subscriptionService.getSubscription(targetId);
  }

  @Post('workspace/subscription')
  @Roles(Role.TENANT_ADMIN)
  async createSubscription(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateSubscriptionDto,
  ) {
    const tenantId = await this.resolveTenantId(req);
    if (!tenantId) return null;
    return this.subscriptionService.createSubscription(tenantId, dto);
  }

  @Post('workspace/subscription/trial')
  @Roles(Role.TENANT_ADMIN)
  async startTrial(
    @Request() req: AuthenticatedRequest,
    @Body() body: CreateSubscriptionDto,
  ) {
    const tenantId = await this.resolveTenantId(req);
    if (!tenantId) return null;
    return this.subscriptionService.startFreeTrial(
      tenantId,
      body.planId,
      body.trialDays,
    );
  }

  @Put('workspace/subscription/upgrade')
  @Roles(Role.TENANT_ADMIN)
  async upgradeSubscription(
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpgradeSubscriptionDto,
  ) {
    const tenantId = await this.resolveTenantId(req);
    if (!tenantId) return null;
    return this.subscriptionService.upgradeSubscription(tenantId, dto);
  }

  @Put('workspace/subscription/downgrade')
  @Roles(Role.TENANT_ADMIN)
  async downgradeSubscription(
    @Request() req: AuthenticatedRequest,
    @Body() dto: DowngradeSubscriptionDto,
  ) {
    return this.subscriptionService.downgradeSubscription(
      req.user.tenantId,
      dto,
    );
  }

  @Get('workspace/subscription/downgrade-preview')
  @Roles(Role.TENANT_ADMIN, Role.ADMIN)
  async getDowngradePreview(
    @Request() req: AuthenticatedRequest,
    @Query('planId') planId: string,
  ) {
    if (!planId) {
      throw new BadRequestException('planId is required');
    }
    return this.subscriptionService.getDowngradePreview(
      req.user.tenantId,
      planId,
    );
  }

  @Post('workspace/subscription/cancel')
  @Roles(Role.TENANT_ADMIN)
  async cancelSubscription(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CancelSubscriptionDto,
  ) {
    return this.subscriptionService.cancelSubscription(req.user.tenantId, dto);
  }

  @Post('workspace/subscription/resume')
  @Roles(Role.TENANT_ADMIN)
  async resumeSubscription(
    @Request() req: AuthenticatedRequest,
    @Body() dto: ResumeSubscriptionDto,
  ) {
    return this.subscriptionService.resumeSubscription(req.user.tenantId, dto);
  }

  @Get('workspace/subscription/history')
  async getSubscriptionHistory(
    @Request() req: AuthenticatedRequest,
    @Query('offset') offset?: number,
    @Query('limit') limit?: number,
  ) {
    return this.subscriptionService.getSubscriptionHistory(
      req.user.tenantId,
      offset ?? 0,
      limit ?? 50,
    );
  }

  @Post('workspace/subscription/renew')
  @Roles(Role.TENANT_ADMIN)
  async renewSubscription(@Request() req: AuthenticatedRequest) {
    return this.subscriptionService.renewSubscription(req.user.tenantId);
  }

  @Post('workspace/subscription/expire-trial')
  @Roles(Role.TENANT_ADMIN)
  async expireTrial(@Request() req: AuthenticatedRequest) {
    return this.subscriptionService.expireTrial(req.user.tenantId);
  }
}

@Controller('billing/invoices')
@UseGuards(AuthGuard('jwt'), RolesGuard, WorkspaceGuard)
@Roles(Role.TENANT_ADMIN, Role.OPERATOR)
export class BillingInvoicesController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get('')
  async listInvoices(
    @Request() req: AuthenticatedRequest,
    @Query('offset') offset?: number,
    @Query('limit') limit?: number,
  ) {
    return this.invoiceService.listInvoices(
      req.user.tenantId,
      offset ?? 0,
      limit ?? 50,
    );
  }

  @Post('generate')
  @Roles(Role.TENANT_ADMIN)
  async generateInvoice(
    @Request() req: AuthenticatedRequest,
    @Body() body: GenerateInvoiceDto,
  ) {
    return this.invoiceService.generateInvoice(req.user.tenantId);
  }
}
