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
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
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
  constructor(
    private readonly invitationService: InvitationService,
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService,
  ) {}

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

  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN, Role.MANAGER)
  @Post('send-email')
  async sendEmailInvitation(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateInvitationDto & { email: string },
  ) {
    if (!body.email) {
      throw new Error('Email is required to send an invitation');
    }

    const invitation = await this.invitationService.createInvitation(
      req.user.tenantId,
      body,
    );

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: req.user.tenantId },
    });

    const userSettings = req.user.personalSettings as any;
    const inviterName = userSettings?.fullName || 'A team member';

    await this.emailService.sendTeamInviteEmail(
      body.email,
      invitation.code,
      inviterName,
      tenant?.name || 'Your Team',
      body.role || Role.OPERATOR,
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
