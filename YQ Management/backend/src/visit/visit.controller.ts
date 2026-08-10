import { Controller, Get, Post, Body, Patch, Param, Delete, Request, UseGuards } from '@nestjs/common';
import { VisitService } from './visit.service';
import { CreateVisitDto } from './dto/create-visit.dto';
import { UpdateVisitDto } from './dto/update-visit.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('visits')
export class VisitController {
  constructor(private readonly visitService: VisitService) {}

  @Post()
  create(@Request() req, @Body() createVisitDto: CreateVisitDto) {
    // Override tenantId with the authenticated user's tenantId for security
    createVisitDto.tenantId = req.user.tenantId;
    return this.visitService.create(createVisitDto);
  }

  @Get()
  findAll(@Request() req) {
    return this.visitService.findAll(req.user.tenantId);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.visitService.findOne(id, req.user.tenantId);
  }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() updateVisitDto: UpdateVisitDto) {
    return this.visitService.update(id, req.user.tenantId, updateVisitDto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.visitService.remove(id, req.user.tenantId);
  }

  @Post(':id/checkin')
  checkIn(@Request() req, @Param('id') id: string) {
    return this.visitService.checkIn(id, req.user.tenantId);
  }

  @Post(':id/start')
  startService(@Request() req, @Param('id') id: string) {
    return this.visitService.startService(id, req.user.tenantId);
  }

  @Post(':id/complete')
  completeService(@Request() req, @Param('id') id: string) {
    return this.visitService.completeService(id, req.user.tenantId);
  }
}
