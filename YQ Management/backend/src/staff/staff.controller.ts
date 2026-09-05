import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { StaffService } from './staff.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import type { AuthenticatedRequest } from '../auth/types/auth.types';

@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  /**
   * Public endpoint: get available providers for a service on a given date.
   * Used by the booking page — no auth required.
   */
  @Get('available')
  findAvailable(
    @Query('tenantId') tenantId: string,
    @Query('serviceId') serviceId: string,
    @Query('date') date: string,
  ) {
    return this.staffService.findAvailableForService(tenantId, serviceId, date);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.TENANT_ADMIN, Role.ADMIN, Role.MANAGER)
  create(
    @Req() req: AuthenticatedRequest,
    @Body() body: any,
  ) {
    return this.staffService.create(req.user.tenantId, body);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.TENANT_ADMIN, Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  findAll(
    @Req() req: AuthenticatedRequest,
    @Query('locationId') locationId?: string,
  ) {
    return this.staffService.findAll(req.user.tenantId, locationId);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.TENANT_ADMIN, Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.staffService.findOne(id, req.user.tenantId);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.TENANT_ADMIN, Role.ADMIN, Role.MANAGER)
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.staffService.update(id, req.user.tenantId, body);
  }

  @Patch(':id/schedule')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.TENANT_ADMIN, Role.ADMIN, Role.MANAGER)
  updateSchedule(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { weeklySchedule: any[]; exceptionDates?: any[] },
  ) {
    return this.staffService.updateSchedule(
      id,
      req.user.tenantId,
      body.weeklySchedule,
      body.exceptionDates,
    );
  }

  @Patch(':id/services')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.TENANT_ADMIN, Role.ADMIN, Role.MANAGER)
  updateServices(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { serviceIds: string[] },
  ) {
    return this.staffService.updateServices(id, req.user.tenantId, body.serviceIds);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.TENANT_ADMIN, Role.ADMIN)
  remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.staffService.remove(id, req.user.tenantId);
  }
}
