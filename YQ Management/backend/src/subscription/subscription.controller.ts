import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { CreateSubscriptionDto } from './dto/subscription.dto';
import { UpgradeSubscriptionDto } from './dto/subscription.dto';
import { DowngradeSubscriptionDto } from './dto/subscription.dto';
import { CancelSubscriptionDto } from './dto/subscription.dto';
import { ResumeSubscriptionDto } from './dto/subscription.dto';
import { WorkspaceGuard } from '../auth/workspace.guard';
import type { AuthenticatedRequest } from '../auth/types/auth.types';

@Controller('billing/subscriptions')
@UseGuards(AuthGuard('jwt'), RolesGuard, WorkspaceGuard)
@Roles(Role.TENANT_ADMIN)
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('current')
  async getCurrent(@Req() req: AuthenticatedRequest) {
    return this.subscriptionService.getSubscription(req.user.tenantId);
  }

  @Post('')
  @Roles(Role.TENANT_ADMIN)
  async createSubscription(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateSubscriptionDto,
  ) {
    return this.subscriptionService.createSubscription(
      req.user.tenantId,
      dto,
    );
  }

  @Post('trial')
  @Roles(Role.TENANT_ADMIN)
  async startTrial(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateSubscriptionDto,
  ) {
    return this.subscriptionService.startFreeTrial(
      req.user.tenantId,
      body.planId,
      body.trialDays ?? 7,
    );
  }

  @Put('upgrade')
  @Roles(Role.TENANT_ADMIN)
  async upgradeSubscription(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpgradeSubscriptionDto,
  ) {
    return this.subscriptionService.upgradeSubscription(
      req.user.tenantId,
      dto,
    );
  }

  @Put('downgrade')
  @Roles(Role.TENANT_ADMIN)
  async downgradeSubscription(
    @Req() req: AuthenticatedRequest,
    @Body() dto: DowngradeSubscriptionDto,
  ) {
    return this.subscriptionService.downgradeSubscription(
      req.user.tenantId,
      dto,
    );
  }

  @Post('cancel')
  @Roles(Role.TENANT_ADMIN)
  async cancelSubscription(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CancelSubscriptionDto,
  ) {
    return this.subscriptionService.cancelSubscription(
      req.user.tenantId,
      dto,
    );
  }

  @Post('resume')
  @Roles(Role.TENANT_ADMIN)
  async resumeSubscription(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ResumeSubscriptionDto,
  ) {
    return this.subscriptionService.resumeSubscription(
      req.user.tenantId,
      dto,
    );
  }

  @Get('history')
  async getHistory(
    @Req() req: AuthenticatedRequest,
    @Query('offset') offset?: number,
    @Query('limit') limit?: number,
  ) {
    return this.subscriptionService.getSubscriptionHistory(
      req.user.tenantId,
      offset ?? 0,
      limit ?? 50,
    );
  }

  @Post('expire-trial')
  @Roles(Role.TENANT_ADMIN)
  async expireTrial(@Req() req: AuthenticatedRequest) {
    return this.subscriptionService.expireTrial(req.user.tenantId);
  }

  @Post('renew')
  @Roles(Role.TENANT_ADMIN)
  async renewSubscription(@Req() req: AuthenticatedRequest) {
    return this.subscriptionService.renewSubscription(req.user.tenantId);
  }
}
