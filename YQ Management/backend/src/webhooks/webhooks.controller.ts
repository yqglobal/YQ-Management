import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { WorkspaceGuard } from '../auth/workspace.guard';
import type { AuthenticatedRequest } from '../auth/types/auth.types';

@Controller('webhooks')
@UseGuards(AuthGuard('jwt'), RolesGuard, WorkspaceGuard)
@Roles(Role.OWNER, Role.SUPER_ADMIN, Role.ADMIN)
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  async createWebhook(
    @Req() req: AuthenticatedRequest,
    @Body() body: { url: string; secret?: string; events: string[] },
  ) {
    return this.webhooksService.createWebhook(
      req.user.tenantId,
      body.url,
      body.secret || null,
      body.events,
    );
  }

  @Get()
  async getWebhooks(@Req() req: AuthenticatedRequest) {
    return this.webhooksService.getWebhooks(req.user.tenantId);
  }

  @Delete(':id')
  async deleteWebhook(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.webhooksService.deleteWebhook(id, req.user.tenantId);
  }
}
