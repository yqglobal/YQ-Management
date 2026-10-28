import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  Res,
  Query,
  UseGuards,
} from '@nestjs/common';
import { LocationService } from './location.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import type { AuthenticatedRequest } from '../auth/types/auth.types';

@UseGuards(JwtAuthGuard)
@Controller('location')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Post()
  @Roles(Role.OWNER, Role.SUPER_ADMIN)
  create(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      name: string;
      address?: string;
      city?: string;
      totalFloors?: number;
      timezone?: string;
      businessHours?: any;
      exceptionDates?: string[];
    },
  ) {
    return this.locationService.create(req.user.tenantId, body);
  }

  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.locationService.findAll(req.user.tenantId, req.user);
  }

  @Get(':id/deletion-impact')
  @Roles(Role.OWNER, Role.SUPER_ADMIN, Role.ADMIN)
  getDeletionImpact(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.locationService.getDeletionImpact(id, req.user.tenantId);
  }

  @Get(':id/export')
  @Roles(Role.OWNER, Role.SUPER_ADMIN, Role.ADMIN)
  async exportLocationData(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Res() res: any,
  ) {
    const { filename, buffer } =
      await this.locationService.exportLocationDataZip(id, req.user.tenantId);

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    return res.end(buffer);
  }

  @Get(':id')
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.locationService.findOne(id, req.user.tenantId, req.user);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.SUPER_ADMIN)
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      address?: string;
      city?: string;
      totalFloors?: number;
      timezone?: string;
      businessHours?: any;
      exceptionDates?: string[];
    },
  ) {
    return this.locationService.update(id, req.user.tenantId, body);
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.SUPER_ADMIN)
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Query('deleteQueues') deleteQueues?: string,
    @Query('archiveData') archiveData?: string,
  ) {
    return this.locationService.remove(id, req.user.tenantId, {
      deleteQueues: deleteQueues !== 'false',
      archiveData: archiveData !== 'false',
    });
  }
}
