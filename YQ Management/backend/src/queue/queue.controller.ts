import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  Req,
  Query,
  Delete,
} from '@nestjs/common';
import { QueueService } from './queue.service';
import { AuthGuard } from '@nestjs/passport';
import { QueueStatus, Role } from '@prisma/client';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { WorkspaceGuard } from '../auth/workspace.guard';
import type { AuthenticatedRequest } from '../auth/types/auth.types';

@Controller('queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  @Post()
  async createQueue(
    @Req() req: AuthenticatedRequest,
    @Body() body: { name: string; formConfig?: any; tokenDisplayConfig?: any },
  ) {
    return this.queueService.createQueue(
      req.user.tenantId,
      req.user.workspaceId,
      body.name,
      body.formConfig,
      body.tokenDisplayConfig,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async getQueues(@Req() req: AuthenticatedRequest) {
    return this.queueService.getQueuesForTenant(req.user.tenantId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('history')
  async getHistory(@Req() req: AuthenticatedRequest) {
    return this.queueService.getHistory(req.user.tenantId);
  }

  @UseGuards(AuthGuard('jwt'), WorkspaceGuard)
  @Get(':id')
  async getQueue(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.queueService.getQueueByIdForTenant(id, req.user.tenantId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  @Patch(':id')
  async updateQueue(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      formConfig?: any;
      tokenDisplayConfig?: any;
      nextQueueId?: string | null;
      allowAppointments?: boolean;
      requireManualCheckIn?: boolean;
      appointmentGranularityMins?: number;
    },
  ) {
    return this.queueService.updateQueueForTenant(id, req.user.tenantId, body);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  @Delete(':id')
  async deleteQueue(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.queueService.deleteQueueForTenant(id, req.user.tenantId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/tokens')
  async getQueueTokens(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.queueService.getQueueTokensForTenant(id, req.user.tenantId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  @Patch(':id/status')
  async updateStatus(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { status: QueueStatus },
  ) {
    return this.queueService.updateQueueStatusForTenant(
      id,
      req.user.tenantId,
      body.status,
    );
  }

  // Public endpoint for customer portal subdomain routing
  @Get('public/tenant/:tenantId')
  async getPublicQueuesForTenant(@Param('tenantId') tenantId: string) {
    return this.queueService.getPublicQueuesForTenant(tenantId);
  }

  // Public endpoint for live TV display
  @Get('public/:id')
  async getPublicQueue(@Param('id') id: string) {
    return this.queueService.getQueueById(id);
  }

  // Public endpoint for live TV display tokens
  @Get('public/:id/tokens')
  async getPublicQueueTokens(@Param('id') id: string) {
    return this.queueService.getQueueTokens(id);
  }

  // Public endpoint to get available slots for appointments
  @Get(':id/slots')
  async getAvailableSlots(
    @Param('id') id: string,
    @Query('date') date: string,
  ) {
    return this.queueService.getAvailableSlots(id, date);
  }
}
