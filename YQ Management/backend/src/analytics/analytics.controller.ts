import { Controller, Get, UseGuards, Req, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { WorkspaceGuard } from '../auth/workspace.guard';
import type { AuthenticatedRequest } from '../auth/types/auth.types';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard, WorkspaceGuard)
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN, Role.OPERATOR)
  @Get('export')
  async exportAnalytics(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
    @Query('timeframe') timeframe: string,
    @Query('tz') tz: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const csv = await this.analyticsService.exportAnalyticsCSV(
      req.user.tenantId,
      timeframe || 'today',
      tz || 'UTC',
      startDate,
      endDate,
    );
    res.header('Content-Type', 'text/csv');
    res.attachment(`qmova-analytics-${timeframe}.csv`);
    return res.send(csv);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard, WorkspaceGuard)
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN, Role.OPERATOR)
  @Get()
  async getDashboardAnalytics(
    @Req() req: AuthenticatedRequest,
    @Query('timeframe') timeframe: string,
    @Query('tz') tz: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getDashboardAnalytics(
      req.user.tenantId,
      timeframe || 'today',
      tz || 'UTC',
      startDate,
      endDate,
    );
  }
}
