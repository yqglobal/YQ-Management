import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Delete,
  Param,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { WorkspaceGuard } from '../auth/workspace.guard';
import type { AuthenticatedRequest } from '../auth/types/auth.types';
import { Throttle } from '@nestjs/throttler';

@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard, WorkspaceGuard)
@Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN, Role.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getUsers(@Req() req: AuthenticatedRequest) {
    return this.usersService.getUsersByTenant(req.user.tenantId);
  }

  @Post()
  createUser(@Req() req: AuthenticatedRequest, @Body() body: any) {
    return this.usersService.createUser(req.user.tenantId, body);
  }

  @Post('send-invite-email')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  sendInviteEmail(
    @Req() req: AuthenticatedRequest,
    @Body() body: { email: string; code: string; role: string },
  ) {
    return this.usersService.sendInviteEmail(req.user.tenantId, body);
  }

  @Post('resend-invite/:id')
  resendInvite(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.usersService.resendInvite(req.user.tenantId, id);
  }

  @Post(':id/role')
  async updateRole(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { role: Role },
  ) {
    return this.usersService.updateRole(
      req.user.tenantId,
      id,
      body.role,
      req.user.userId,
      req.user.email,
    );
  }

  @Get('me/export')
  async exportMyData(@Req() req: AuthenticatedRequest) {
    return this.usersService.exportUserData(req.user.tenantId, req.user.userId);
  }

  @Delete('me')
  async deleteMe(@Req() req: AuthenticatedRequest) {
    return this.usersService.deleteMe(req.user.tenantId, req.user.userId);
  }

  @Delete(':id')
  async deleteUser(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const result = await this.usersService.deleteUser(
      req.user.tenantId,
      id,
      req.user.userId,
    );
    return result;
  }

  @Post(':id/transfer-ownership')
  @Roles(Role.TENANT_ADMIN) // Must be a TENANT_ADMIN (the actual owner logic is in the service)
  async transferOwnership(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string, // the target user to become owner
  ) {
    return this.usersService.transferOwnership(
      req.user.tenantId,
      req.user.userId, // current owner
      id,
    );
  }
}
