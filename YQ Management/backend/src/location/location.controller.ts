import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseGuards } from '@nestjs/common';
import { LocationService } from './location.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/types/auth.types';

@UseGuards(JwtAuthGuard)
@Controller('location')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() body: { name: string; address?: string }) {
    return this.locationService.create(req.user.tenantId, body);
  }

  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.locationService.findAll(req.user.tenantId);
  }

  @Get(':id')
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.locationService.findOne(id, req.user.tenantId);
  }

  @Patch(':id')
  update(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: { name?: string; address?: string }) {
    return this.locationService.update(id, req.user.tenantId, body);
  }

  @Delete(':id')
  remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.locationService.remove(id, req.user.tenantId);
  }
}
