import { Controller, Post, Body, Req } from '@nestjs/common';
import { AuditService } from './audit.service';
import { Request } from 'express';

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Post('log')
  async logFrontendEvent(
    @Body() body: any,
    @Req() request: Request & { user?: any },
  ) {
    const {
      action,
      resource,
      resourceId,
      details,
      customerId,
      tenantId: bodyTenantId,
    } = body;

    const user = request.user;
    const userId = user?.id || user?.userId || null;
    const tenantId = user?.tenantId || bodyTenantId || null;

    await this.auditService.log(
      userId,
      tenantId,
      customerId || null,
      action || 'Frontend Event',
      resource || null,
      resourceId || null,
      'FRONTEND',
      'EVENT',
      200,
      0,
      details,
      request.ip,
      request.headers['user-agent'],
    );

    return { success: true };
  }
}
