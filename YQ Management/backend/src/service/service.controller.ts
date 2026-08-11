import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseGuards } from '@nestjs/common';
import { ServiceService } from './service.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/types/auth.types';

@UseGuards(JwtAuthGuard)
@Controller('service')
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() body: { name: string; description?: string; expectedDuration?: number; locationId?: string }) {
    return this.serviceService.create(req.user.tenantId, body);
  }

  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.serviceService.findAll(req.user.tenantId);
  }

  @Get(':id')
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.serviceService.findOne(id, req.user.tenantId);
  }

  @Patch(':id')
  update(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: { name?: string; description?: string; expectedDuration?: number; locationId?: string }) {
    return this.serviceService.update(id, req.user.tenantId, body);
  }

  @Delete(':id')
  remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.serviceService.remove(id, req.user.tenantId);
  }
}
