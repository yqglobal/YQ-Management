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
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Post()
  async createTenant(
    @Req() req: AuthenticatedRequest,
    @Body() body: { name: string; subdomain: string; branding?: any },
  ) {
    return this.tenantService.createTenant(body);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard, WorkspaceGuard)
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
  @Get()
  async getAllTenants(@Req() req: AuthenticatedRequest) {
    return this.tenantService.getAllTenants();
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
  @Get('export')
  async exportData(@Req() req: AuthenticatedRequest) {
    // Only TENANT_ADMIN or SUPER_ADMIN can export
    return this.tenantService.exportData(req.user.tenantId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.ADMIN)
  @Get('me')
  async getMyTenant(@Req() req: AuthenticatedRequest) {
    return this.tenantService.getTenantById(req.user.tenantId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard, WorkspaceGuard)
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
  @Patch(':id')
  async updateTenant(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { name?: string; subdomain?: string; branding?: any; customerExperience?: any },
  ) {
    // SECURITY: TENANT_ADMIN can only update their own tenant.
    // SUPER_ADMIN can update any tenant.
    if (req.user.role !== Role.SUPER_ADMIN && id !== req.user.tenantId) {
      throw new Error('Forbidden: You can only update your own tenant.');
    }
    return this.tenantService.updateTenant(id, body);
  }

  // Public endpoint for customer portal subdomain routing
  @Get('public/:subdomain')
  async getPublicTenant(@Param('subdomain') subdomain: string) {
    return this.tenantService.getTenantBySubdomain(subdomain);
  }

  // Public endpoint for TV display to fetch TTS config by tenantId
  @Get('public/id/:tenantId')
  async getPublicTenantById(@Param('tenantId') tenantId: string) {
    const tenant = await this.tenantService.getTenantById(tenantId);
    // Only expose safe, public fields for the TV display
    return {
      id: tenant?.id,
      name: tenant?.name,
      branding: tenant?.branding,
      subdomain: tenant?.subdomain,
      customerExperience: tenant?.customerExperience,
    };
  }
}
