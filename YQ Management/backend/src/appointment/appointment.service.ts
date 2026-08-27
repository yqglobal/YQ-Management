import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { RedisService } from '../redis/redis.service';
import { GoogleService } from '../integrations/google/google.service';

@Injectable()
export class AppointmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsappService,
    private readonly redisService: RedisService,
    private readonly googleService: GoogleService,
  ) {}

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

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: createAppointmentDto.tenantId },
      select: { appointmentApprovalMode: true },
    });

    const status =
      tenant?.appointmentApprovalMode === 'MANUAL'
        ? 'PENDING_APPROVAL'
        : 'SCHEDULED';

    const appointment = await this.prisma.appointment.create({
      data: {
        ...createAppointmentDto,
        tenantId: createAppointmentDto.tenantId!,
        status: createAppointmentDto.status || status,
      },
    });

    this.redisService.client.publish(
      'queue_events',
      JSON.stringify({
        type: 'APPOINTMENT_CREATED',
        tenantId: appointment.tenantId,
        appointment,
      }),
    );

    // Sync to Google Calendar
    this.googleService
      .syncAppointmentToCalendar(appointment.tenantId, appointment)
      .catch((err) => {
        console.error('Failed to sync appointment to Google Calendar', err);
      });

    return appointment;
  }

  async findAll(userTokenPayload: any, status?: string) {
    const where: any = { tenantId: userTokenPayload.tenantId };

    if (userTokenPayload.role === 'OPERATOR') {
      const user = await this.prisma.user.findUnique({
        where: { id: userTokenPayload.userId },
      });
      if (
        user &&
        user.allowedLocationIds &&
        user.allowedLocationIds.length > 0
      ) {
        where.locationId = { in: user.allowedLocationIds };
      }
    }

    if (status) {
      where.status = status;
    }
    return this.prisma.appointment.findMany({
      where,
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

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: updateAppointmentDto,
      include: { customer: true, tenant: true, location: true },
    });

    // Notify customer on status change
    if (
      existing.status === 'PENDING_APPROVAL' &&
      updated.status === 'REJECTED'
    ) {
      const reason = updateAppointmentDto.notes || 'No reason provided';
      const formattedDate = new Intl.DateTimeFormat('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(new Date(updated.scheduledStart));
      const message = `Hello ${updated.customer.name}, unfortunately your appointment requested for ${formattedDate} has been declined. Reason: ${reason}. Please contact us if you have any questions.`;
      if (updated.customer.phone) {
        await this.whatsappService
          .sendToTenant(updated.tenantId, updated.customer.phone, message)
          .catch((e) => console.error('Failed to send rejection whatsapp', e));
      }
    } else if (
      existing.status === 'PENDING_APPROVAL' &&
      updated.status === 'SCHEDULED'
    ) {
      const formattedDate = new Intl.DateTimeFormat('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(new Date(updated.scheduledStart));
      const message = `Hello ${updated.customer.name}, your appointment requested for ${formattedDate} has been accepted and is now scheduled. See you soon!`;
      if (updated.customer.phone) {
        await this.whatsappService
          .sendToTenant(updated.tenantId, updated.customer.phone, message)
          .catch((e) => console.error('Failed to send approval whatsapp', e));
      }
    } else if (
      existing.status !== 'CHECKED_IN' &&
      updated.status === 'CHECKED_IN'
    ) {
      const locationName = updated.location?.name
        ? ` at ${updated.location.name}`
        : '';
      const message = `Hello ${updated.customer.name}, you have been successfully checked in${locationName}. We will be with you shortly.`;
      if (updated.customer.phone) {
        await this.whatsappService
          .sendToTenant(updated.tenantId, updated.customer.phone, message)
          .catch((e) => console.error('Failed to send checkin whatsapp', e));
      }
    }

    return updated;
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);

    return this.prisma.appointment.delete({
      where: { id },
    });
  }
}
