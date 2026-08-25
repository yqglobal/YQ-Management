import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import { PlansService } from './plans.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { CreatePlanDto } from './dto/plan.dto';
import { UpdatePlanDto } from './dto/plan.dto';
import { ChangePlanStatusDto } from './dto/plan.dto';
import { DuplicatePlanDto } from './dto/plan.dto';
import { UuidPipe } from '../common/pipes/validation.pipes';
import { WorkspaceGuard } from '../auth/workspace.guard';
import type { AuthenticatedRequest } from '../auth/types/auth.types';

@Controller('billing/plans')
@UseGuards(AuthGuard('jwt'))
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  async listPlans(
    @Query('status') statusFilter?: string,
    @Query('offset') offset?: number,
    @Query('limit') limit?: number,
  ) {
    return this.plansService.listPlans(statusFilter, offset ?? 0, limit ?? 50);
  }

  @Get(':id')
  async getPlan(@Param('id', UuidPipe) id: string) {
    return this.plansService.getPlan(id);
  }

  @Post()
  @UseGuards(RolesGuard, WorkspaceGuard)
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  async createPlan(@Body() dto: CreatePlanDto) {
    return this.plansService.createPlan(dto);
  }

  @Put(':id')
  @UseGuards(RolesGuard, WorkspaceGuard)
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  async updatePlan(
    @Param('id', UuidPipe) id: string,
    @Body() dto: UpdatePlanDto,
  ) {
    return this.plansService.updatePlan(id, dto);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard, WorkspaceGuard)
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  async changePlanStatus(
    @Param('id', UuidPipe) id: string,
    @Body() dto: ChangePlanStatusDto,
  ) {
    return this.plansService.changePlanStatus(id, dto.status);
  }

  @Post(':id/duplicate')
  @UseGuards(RolesGuard, WorkspaceGuard)
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  async duplicatePlan(
    @Param('id', UuidPipe) id: string,
    @Body() dto: DuplicatePlanDto,
  ) {
    return this.plansService.duplicatePlan(id, dto.name);
  }

  @Delete(':id')
  @UseGuards(RolesGuard, WorkspaceGuard)
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  deletePlan(@Param('id') id: string) {
    return this.plansService.deletePlan(id);
  }
}
