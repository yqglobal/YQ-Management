import {
  Controller,
  Get,
  Post,
  Body,
  Delete,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { InvitationService } from './invitation.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { UuidPipe } from '../common/pipes/validation.pipes';
import { TenantGuard } from '../auth/tenant.guard';
import { CreateInvitationDto } from './dto/invitation.dto';
import type { AuthenticatedRequest } from '../auth/types/auth.types';

@Controller('invitations')
@UseGuards(AuthGuard('jwt'), RolesGuard, TenantGuard)
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN, Role.MANAGER)
  @Get()
  async getInvitations(@Req() req: AuthenticatedRequest) {
    return this.invitationService.getInvitations(req.user.tenantId);
  }

  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN, Role.MANAGER)
  @Post()
  async createInvitation(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateInvitationDto,
  ) {
    const invitation = await this.invitationService.createInvitation(
      req.user.tenantId,
      body,
    );
    return { success: true, invitation };
  }

  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  @Post('join-code')
  async createJoinCode(
    @Req() req: AuthenticatedRequest,
    @Body() body: { role?: string },
  ) {
    const role = (body.role as Role) || Role.OPERATOR;
    const invitation = await this.invitationService.createJoinCode(
      req.user.tenantId,
      role,
    );
    return { success: true, invitation };
  }

  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN, Role.MANAGER)
  @Delete(':id')
  async revokeInvitation(
    @Req() req: AuthenticatedRequest,
    @Param('id', UuidPipe) id: string,
  ) {
    await this.invitationService.revokeInvitation(id, req.user.tenantId);
    return { success: true };
  }
}
