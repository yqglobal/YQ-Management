import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { WorkspaceGuard } from '../auth/workspace.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import type { AuthenticatedRequest } from '../auth/types/auth.types';

@Controller('invoice')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard, WorkspaceGuard)
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.OPERATOR, Role.MANAGER)
  @Get('visit/:visitId')
  async getVisitInvoice(
    @Req() req: AuthenticatedRequest,
    @Param('visitId') visitId: string,
  ) {
    // Attempt to generate/fetch the invoice for the visit
    return this.invoiceService.generateVisitInvoice(visitId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard, WorkspaceGuard)
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
  @Get()
  async listInvoices(
    @Req() req: AuthenticatedRequest,
    @Query('offset') offset?: string,
    @Query('limit') limit?: string,
  ) {
    const o = parseInt(offset || '0', 10);
    const l = parseInt(limit || '50', 10);
    return this.invoiceService.listInvoices(req.user.tenantId, o, l);
  }
}
