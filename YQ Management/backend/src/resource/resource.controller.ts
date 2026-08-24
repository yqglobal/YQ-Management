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
import { ResourceService } from './resource.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { WorkspaceGuard } from '../auth/workspace.guard';
import type { AuthenticatedRequest } from '../auth/types/auth.types';

@Controller('resource')
@UseGuards(AuthGuard('jwt'), RolesGuard, WorkspaceGuard)
@Roles(Role.TENANT_ADMIN, Role.ADMIN, Role.MANAGER, Role.OPERATOR)
export class ResourceController {
  constructor(private readonly resourceService: ResourceService) {}

  @Post()
  create(
    @Req() req: AuthenticatedRequest,
    @Body() createResourceDto: CreateResourceDto,
  ) {
    return this.resourceService.create(req.user.tenantId, createResourceDto);
  }

  @Get()
  findAll(
    @Req() req: AuthenticatedRequest,
    @Query('locationId') locationId?: string,
  ) {
    return this.resourceService.findAll(req.user.tenantId, locationId);
  }

  @Get(':id')
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.resourceService.findOne(id, req.user.tenantId);
  }

  @Patch(':id')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateResourceDto: UpdateResourceDto,
  ) {
    return this.resourceService.update(
      id,
      req.user.tenantId,
      updateResourceDto,
    );
  }

  @Delete(':id')
  @Roles(Role.TENANT_ADMIN, Role.ADMIN) // Restrict delete to admins
  remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.resourceService.remove(id, req.user.tenantId);
  }
}
