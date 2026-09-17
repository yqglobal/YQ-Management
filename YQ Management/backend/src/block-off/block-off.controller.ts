import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { BlockOffService } from './block-off.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { WorkspaceGuard } from '../auth/workspace.guard';
import type { AuthenticatedRequest } from '../auth/types/auth.types';

@Controller('block-offs')
@UseGuards(AuthGuard('jwt'), RolesGuard, WorkspaceGuard)
export class BlockOffController {
  constructor(private readonly blockOffService: BlockOffService) {}

  @Post()
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN, Role.ADMIN)
  async createBlockOff(@Req() req: AuthenticatedRequest, @Body() body: any) {
    return this.blockOffService.createBlockOff(req.user.tenantId, body);
  }

  @Get()
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN, Role.ADMIN, Role.OPERATOR)
  async getBlockOffs(
    @Req() req: AuthenticatedRequest,
    @Query('locationId') locationId?: string,
    @Query('queueId') queueId?: string,
  ) {
    return this.blockOffService.getBlockOffs(req.user.tenantId, locationId, queueId);
  }

  @Delete(':id')
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN, Role.ADMIN)
  async deleteBlockOff(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.blockOffService.deleteBlockOff(req.user.tenantId, id);
  }
}
