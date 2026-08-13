import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  UseGuards,
  Req,
  Param,
} from '@nestjs/common';
import { TenantService } from './tenant.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { WorkspaceGuard } from '../auth/workspace.guard';
import type { AuthenticatedRequest } from '../auth/types/auth.types';

@Controller('tenant')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Roles(Role.SUPER_ADMIN)
  @Post()
  async createTenant(
    @Req() req: AuthenticatedRequest,
    @Body() body: { name: string; subdomain: string; branding?: any },
  ) {
    return this.tenantService.createTenant(body);
  }

  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
  @Get()
  @UseGuards(WorkspaceGuard)
  async getAllTenants(@Req() req: AuthenticatedRequest) {
    return this.tenantService.getAllTenants();
  }

  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
  @Get('export')
  async exportData(@Req() req: AuthenticatedRequest) {
    // Only TENANT_ADMIN or SUPER_ADMIN can export
    return this.tenantService.exportData(req.user.tenantId);
  }

  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.ADMIN)
  @Get('me')
  async getMyTenant(@Req() req: AuthenticatedRequest) {
    return this.tenantService.getTenantById(req.user.tenantId);
  }

  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
  @Patch(':id')
  @UseGuards(WorkspaceGuard)
  async updateTenant(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { name?: string; branding?: any; customerExperience?: any },
  ) {
    return this.tenantService.updateTenant(id, body);
  }

  // Public endpoint for customer portal subdomain routing
  @Get('public/:subdomain')
  async getPublicTenant(@Param('subdomain') subdomain: string) {
    return this.tenantService.getTenantBySubdomain(subdomain);
  }
}
