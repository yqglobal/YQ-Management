import { Controller, Get, Post, Body, Param, Req, UseGuards } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/types/auth.types';

@UseGuards(JwtAuthGuard)
@Controller('customer')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() body: { name: string; phone?: string; email?: string }) {
    return this.customerService.create(req.user.tenantId, body);
  }

  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.customerService.findAll(req.user.tenantId);
  }

  @Get(':id')
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.customerService.findOne(id, req.user.tenantId);
  }
}
