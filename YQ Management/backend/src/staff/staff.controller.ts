import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { StaffService } from './staff.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { WorkspaceGuard } from '../auth/workspace.guard';
import type { AuthenticatedRequest } from '../auth/types/auth.types';

@Controller('staff')
@UseGuards(AuthGuard('jwt'), RolesGuard, WorkspaceGuard)
@Roles(Role.TENANT_ADMIN, Role.ADMIN, Role.MANAGER, Role.OPERATOR)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post()
  create(
    @Req() req: AuthenticatedRequest,
    @Body() createStaffDto: CreateStaffDto,
  ) {
    return this.staffService.create(req.user.tenantId, createStaffDto);
  }

  @Get()
  findAll(
    @Req() req: AuthenticatedRequest,
    @Query('locationId') locationId?: string,
  ) {
    return this.staffService.findAll(req.user.tenantId, locationId);
  }

  @Get(':id')
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.staffService.findOne(id, req.user.tenantId);
  }

  @Patch(':id')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateStaffDto: UpdateStaffDto,
  ) {
    return this.staffService.update(id, req.user.tenantId, updateStaffDto);
  }

  @Delete(':id')
  @Roles(Role.TENANT_ADMIN, Role.ADMIN) // Restrict delete to admins
  remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.staffService.remove(id, req.user.tenantId);
  }
}
