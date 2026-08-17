import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ServiceService } from './service.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/types/auth.types';

@Controller('service')
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  // Public endpoint for customer portal - no auth required
  @Get('public/tenant/:tenantId')
  async getPublicServicesForTenant(@Param('tenantId') tenantId: string) {
    return this.serviceService.findAllPublic(tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      name: string;
      description?: string;
      expectedDuration?: number;
      locationId?: string;
      queueIds?: string[];
    },
  ) {
    return this.serviceService.create(req.user.tenantId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.serviceService.findAll(req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.serviceService.findOne(id, req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      expectedDuration?: number;
      locationId?: string;
      queueIds?: string[];
    },
  ) {
    return this.serviceService.update(id, req.user.tenantId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.serviceService.remove(id, req.user.tenantId);
  }
}
