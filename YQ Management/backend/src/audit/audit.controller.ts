import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  Query,
} from '@nestjs/common';
import { AuditService } from './audit.service';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { WorkspaceGuard } from '../auth/workspace.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import type { AuthenticatedRequest } from '../auth/types/auth.types';

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Post('log')
  async logFrontendEvent(
    @Body() body: any,
    @Req() request: Request & { user?: any },
  ) {
    const {
      action,
      resource,
      resourceId,
      details,
      customerId,
      tenantId: bodyTenantId,
    } = body;

    const user = request.user;
    const userId = user?.id || user?.userId || null;
    const tenantId = user?.tenantId || bodyTenantId || null;

    await this.auditService.log(
      userId,
      tenantId,
      customerId || null,
      action || 'Frontend Event',
      resource || null,
      resourceId || null,
      'FRONTEND',
      'EVENT',
      200,
      0,
      details,
      request.ip,
      request.headers['user-agent'],
    );

    return { success: true };
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard, WorkspaceGuard)
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN, Role.ADMIN) // Only admins can view audit logs
  async getAuditLogs(
    @Req() request: AuthenticatedRequest,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('action') action?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const tenantId = request.user.tenantId;
    return this.auditService.getLogsForTenant(
      tenantId,
      skip ? parseInt(skip, 10) : 0,
      take ? parseInt(take, 10) : 50,
      { action, status, startDate, endDate },
    );
  }
}
