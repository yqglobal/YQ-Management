import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@Injectable()
export class AppointmentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createAppointmentDto: CreateAppointmentDto) {
    // Basic Availability Engine Check (Prevent double booking for same staff at same time)
    if (createAppointmentDto.staffId) {
      const conflict = await this.prisma.appointment.findFirst({
        where: {
          staffId: createAppointmentDto.staffId,
          status: { notIn: ['CANCELLED', 'NO_SHOW', 'MISSED'] },
          OR: [
            {
              scheduledStart: { lt: createAppointmentDto.scheduledEnd },
              scheduledEnd: { gt: createAppointmentDto.scheduledStart },
            },
          ],
        },
      });
      if (conflict) {
        throw new ConflictException(
          'The selected staff member is already booked for this time slot.',
        );
      }
    }

    return this.prisma.appointment.create({
      data: createAppointmentDto,
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.appointment.findMany({
      where: { tenantId },
      include: {
        customer: true,
        service: true,
        location: true,
        staff: true,
      },
      orderBy: {
        scheduledStart: 'asc',
      },
    });
  }

  async findOne(id: string, tenantId: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, tenantId },
      include: {
        customer: true,
        service: true,
        location: true,
        staff: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }

    return appointment;
  }

  async update(
    id: string,
    tenantId: string,
    updateAppointmentDto: UpdateAppointmentDto,
  ) {
    const existing = await this.findOne(id, tenantId);

    // If updating time or staff, check for conflicts
    const staffId =
      updateAppointmentDto.staffId !== undefined
        ? updateAppointmentDto.staffId
        : existing.staffId;
    const scheduledStart =
      updateAppointmentDto.scheduledStart || existing.scheduledStart;
    const scheduledEnd =
      updateAppointmentDto.scheduledEnd || existing.scheduledEnd;
    const status = updateAppointmentDto.status || existing.status;

    if (staffId && !['CANCELLED', 'NO_SHOW', 'MISSED'].includes(status)) {
      const conflict = await this.prisma.appointment.findFirst({
        where: {
          id: { not: id },
          staffId: staffId,
          status: { notIn: ['CANCELLED', 'NO_SHOW', 'MISSED'] },
          OR: [
            {
              scheduledStart: { lt: scheduledEnd },
              scheduledEnd: { gt: scheduledStart },
            },
          ],
        },
      });
      if (conflict) {
        throw new ConflictException(
          'The selected staff member is already booked for this time slot.',
        );
      }
    }

    return this.prisma.appointment.update({
      where: { id },
      data: updateAppointmentDto,
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);

    return this.prisma.appointment.delete({
      where: { id },
    });
  }
}
