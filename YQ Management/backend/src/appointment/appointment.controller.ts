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
  Query,
} from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/types/auth.types';

@UseGuards(JwtAuthGuard)
@Controller('appointments')
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @Post()
  create(
    @Req() req: AuthenticatedRequest,
    @Body() createAppointmentDto: CreateAppointmentDto,
  ) {
    createAppointmentDto.tenantId = req.user.tenantId;
    return this.appointmentService.create(createAppointmentDto);
  }

  @Get('schedule-view')
  getScheduleView(
    @Req() req: AuthenticatedRequest,
    @Query('date') date: string,
    @Query('locationId') locationId?: string,
  ) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    return this.appointmentService.getScheduleView(
      req.user.tenantId,
      targetDate,
      locationId,
    );
  }

  @Get()
  findAll(@Req() req: AuthenticatedRequest, @Query('status') status?: string) {
    return this.appointmentService.findAll(req.user, status);
  }

  @Get(':id')
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.appointmentService.findOne(id, req.user.tenantId);
  }

  @Patch(':id')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateAppointmentDto: UpdateAppointmentDto,
  ) {
    return this.appointmentService.update(
      id,
      req.user.tenantId,
      updateAppointmentDto,
    );
  }

  @Delete(':id')
  remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.appointmentService.remove(id, req.user.tenantId);
  }
}
