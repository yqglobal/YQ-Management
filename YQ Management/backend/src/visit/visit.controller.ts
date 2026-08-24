import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  Query,
  UseGuards,
} from '@nestjs/common';
import { VisitService } from './visit.service';
import { CreateVisitDto } from './dto/create-visit.dto';
import { UpdateVisitDto } from './dto/update-visit.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/types/auth.types';

@UseGuards(JwtAuthGuard)
@Controller('visits')
export class VisitController {
  constructor(private readonly visitService: VisitService) {}

  @Post()
  create(
    @Req() req: AuthenticatedRequest,
    @Body() createVisitDto: CreateVisitDto,
  ) {
    // Override tenantId with the authenticated user's tenantId for security
    createVisitDto.tenantId = req.user.tenantId;
    return this.visitService.create(createVisitDto);
  }

  @Get()
  findAll(
    @Req() req: AuthenticatedRequest,
    @Query('scope') scope?: 'today' | 'history',
  ) {
    return this.visitService.findAll(req.user, scope);
  }

  @Get(':id')
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.visitService.findOne(id, req.user.tenantId);
  }

  @Patch(':id')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateVisitDto: UpdateVisitDto,
  ) {
    return this.visitService.update(id, req.user.tenantId, updateVisitDto);
  }

  @Delete(':id')
  remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.visitService.remove(id, req.user.tenantId);
  }

  @Post(':id/checkin')
  checkIn(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.visitService.checkIn(id, req.user.tenantId);
  }

  @Post(':id/start')
  startService(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.visitService.startService(id, req.user.tenantId);
  }

  @Post(':id/complete')
  completeService(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.visitService.completeService(id, req.user.tenantId, req.user.userId);
  }

  @Post(':id/cancel')
  cancelVisit(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.visitService.cancelVisit(id, req.user.tenantId, req.user.userId);
  }
}
