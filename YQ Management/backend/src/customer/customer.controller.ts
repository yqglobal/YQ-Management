import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Req,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CustomerService } from './customer.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/types/auth.types';

@UseGuards(JwtAuthGuard)
@Controller(['customer', 'customers'])
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  create(
    @Req() req: AuthenticatedRequest,
    @Body() body: { name: string; phone?: string; email?: string },
  ) {
    return this.customerService.create(req.user.tenantId, body);
  }

  @Get()
  findAll(
    @Req() req: AuthenticatedRequest,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.customerService.findAll(req.user.tenantId, cursor, limit ? parseInt(limit, 10) : undefined);
  }

  @Get(':id')
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.customerService.findOne(id, req.user.tenantId);
  }

  @Get(':id/visits')
  async getVisits(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const customer = await this.customerService.findOne(id, req.user.tenantId);
    return customer?.visits || [];
  }

  @Patch(':id')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { isVip?: boolean; isBlocked?: boolean; notes?: string; name?: string; phone?: string; email?: string }
  ) {
    return this.customerService.update(id, req.user.tenantId, body);
  }
}
