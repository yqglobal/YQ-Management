import { Controller, Get, Post, Body, Patch, Param, Delete, Request, UseGuards } from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('appointments')
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @Post()
  create(@Request() req, @Body() createAppointmentDto: CreateAppointmentDto) {
    createAppointmentDto.tenantId = req.user.tenantId;
    return this.appointmentService.create(createAppointmentDto);
  }

  @Get()
  findAll(@Request() req) {
    return this.appointmentService.findAll(req.user.tenantId);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.appointmentService.findOne(id, req.user.tenantId);
  }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() updateAppointmentDto: UpdateAppointmentDto) {
    return this.appointmentService.update(id, req.user.tenantId, updateAppointmentDto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.appointmentService.remove(id, req.user.tenantId);
  }
}
