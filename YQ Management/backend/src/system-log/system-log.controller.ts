import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { SystemLogService } from './system-log.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { AuthenticatedRequest } from '../auth/types/auth.types';

@Controller('system-logs')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class SystemLogController {
  constructor(private readonly systemLogService: SystemLogService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN) // Only super admins can view global system logs
  async getSystemLogs(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('level') level?: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.systemLogService.getLogs({
      skip: skip ? parseInt(skip, 10) : 0,
      take: take ? parseInt(take, 10) : 50,
      level,
      tenantId,
    });
  }
}
