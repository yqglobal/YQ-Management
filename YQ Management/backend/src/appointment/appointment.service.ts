import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { RedisService } from '../redis/redis.service';
import { GoogleService } from '../integrations/google/google.service';
import { QueueGateway } from '../queue/queue.gateway';

@Injectable()
export class AppointmentService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => WhatsappService))
    private readonly whatsappService: WhatsappService,
    private readonly redisService: RedisService,
    private readonly googleService: GoogleService,
    @Inject(forwardRef(() => QueueGateway))
    private readonly queueGateway: QueueGateway,
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

    this.queueGateway.broadcastTenantUpdate(appointment.tenantId, 'APPOINTMENT_CREATED', {
      appointment,
    });

    // Sync to Google Calendar
    this.googleService
      .syncAppointmentToCalendar(appointment.tenantId, appointment)
      .catch((err) => {
        console.error('Failed to sync appointment to Google Calendar', err);
      });

    return appointment;
  }

  async findAll(userTokenPayload: any, status?: string, locationId?: string) {
    const where: any = { tenantId: userTokenPayload.tenantId };

    if (locationId) {
      where.locationId = locationId;
    }

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

      if (user && user.allowedServiceIds && user.allowedServiceIds.length > 0) {
        where.serviceId = { in: user.allowedServiceIds };
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
      if (updated.customer) {
        const message = `Hello ${updated.customer.name}, unfortunately your appointment requested for ${formattedDate} has been declined. Reason: ${reason}. Please contact us if you have any questions.`;
        if (updated.customer.phone) {
          await this.whatsappService
            .sendToTenant(updated.tenantId, updated.customer.phone, message)
            .catch((e) =>
              console.error('Failed to send rejection whatsapp', e),
            );
        }
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
      if (updated.customer) {
        const message = `Hello ${updated.customer.name}, your appointment requested for ${formattedDate} has been accepted and is now scheduled. See you soon!`;
        if (updated.customer.phone) {
          await this.whatsappService
            .sendToTenant(updated.tenantId, updated.customer.phone, message)
            .catch((e) => console.error('Failed to send approval whatsapp', e));
        }
      }
    } else if (
      existing.status !== 'CHECKED_IN' &&
      updated.status === 'CHECKED_IN'
    ) {
      if (updated.customer) {
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
    }

    // Sync to Google Calendar
    if (!['CANCELLED', 'NO_SHOW', 'MISSED', 'REJECTED'].includes(updated.status)) {
      this.googleService.updateAppointmentInCalendar(updated.tenantId, updated).catch(console.error);
    } else {
      // If cancelled/rejected/missed, we should remove from calendar
      this.googleService.deleteAppointmentFromCalendar(updated.tenantId, updated).catch(console.error);
    }

    return updated;
  }

  async remove(id: string, tenantId: string) {
    const appointment = await this.findOne(id, tenantId);

    const deleted = await this.prisma.appointment.delete({
      where: { id },
    });

    this.googleService.deleteAppointmentFromCalendar(tenantId, appointment).catch(console.error);

    return deleted;
  }

  /**
   * Unified schedule view for the timeline calendar.
   * Returns appointments, walk-in visits, avg durations, and gap analysis for a given date.
   */
  async getScheduleView(tenantId: string, date: string, start?: string, end?: string, locationId?: string) {
    const dayStart = start ? new Date(start) : new Date(`${date}T00:00:00.000Z`);
    const dayEnd = end ? new Date(end) : new Date(`${date}T23:59:59.999Z`);

    // Fetch all appointments for the day
    const appointments = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        ...(locationId ? { locationId } : {}),
        scheduledStart: { gte: dayStart, lte: dayEnd },
      },
      include: { customer: true, service: true, location: true, staff: true },
      orderBy: { scheduledStart: 'asc' },
    });

    // Fetch all visits for the day (walkins + appointment-linked)
    const visits = await this.prisma.visit.findMany({
      where: {
        tenantId,
        ...(locationId ? { locationId } : {}),
        createdAt: { gte: dayStart, lte: dayEnd },
        currentState: { notIn: ['NO_SHOW', 'CANCELLED'] },
      },
      include: { customer: true, service: true, staff: true },
      orderBy: { createdAt: 'asc' },
    });

    // Fetch services to get duration data
    const services = await this.prisma.service.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        expectedDuration: true,
        bufferDuration: true,
        concurrentSlots: true,
        allowAppointments: true,
        appointmentGranularityMins: true,
        avgActualDurationMins: true,
        locationId: true,
      },
    });

    // Build per-service gap and idle analysis
    const serviceStats = services.map((svc) => {
      const svcAppointments = appointments
        .filter((a) => a.serviceId === svc.id)
        .sort(
          (a, b) =>
            new Date(a.scheduledStart).getTime() -
            new Date(b.scheduledStart).getTime(),
        );

      const gaps: Array<{ start: string; end: string; durationMins: number }> =
        [];

      for (let i = 0; i < svcAppointments.length - 1; i++) {
        const gapStart = new Date(svcAppointments[i].scheduledEnd).getTime();
        const gapEnd = new Date(
          svcAppointments[i + 1].scheduledStart,
        ).getTime();
        const durationMins = Math.round((gapEnd - gapStart) / 60000);
        if (durationMins >= 10) {
          gaps.push({
            start: new Date(gapStart).toISOString(),
            end: new Date(gapEnd).toISOString(),
            durationMins,
          });
        }
      }

      const effectiveDurationMins =
        svc.avgActualDurationMins !== null &&
        svc.avgActualDurationMins !== undefined
          ? svc.avgActualDurationMins
          : svc.expectedDuration;

      return {
        serviceId: svc.id,
        effectiveDurationMins,
        gaps,
      };
    });

    return {
      date,
      appointments,
      visits,
      services,
      serviceStats,
    };
  }

  /**
   * Called when a visit is completed. Updates the rolling avg actual duration
   * for the service (rolling over the last 30 completed visits).
   */
  async updateAvgActualDuration(
    serviceId: string,
    tenantId: string,
  ): Promise<void> {
    try {
      const recentCompleted = await this.prisma.visit.findMany({
        where: {
          serviceId,
          tenantId,
          currentState: 'COMPLETED',
          serviceStart: { not: null },
          completedAt: { not: null },
        },
        select: { serviceStart: true, completedAt: true },
        orderBy: { completedAt: 'desc' },
        take: 30,
      });

      if (recentCompleted.length < 5) return; // Not enough data

      const totalMs = recentCompleted.reduce((sum, v) => {
        const dur = v.completedAt!.getTime() - v.serviceStart!.getTime();
        return sum + Math.max(0, dur);
      }, 0);

      const avgMins = Math.round(totalMs / recentCompleted.length / 60000);
      if (avgMins <= 0) return;

      const service = await this.prisma.service.findUnique({ where: { id: serviceId }, select: { emaExpectedDuration: true, expectedDuration: true } });
      const currentEma = service?.emaExpectedDuration || service?.expectedDuration || avgMins;
      
      const latestVisit = recentCompleted[0];
      const latestDuration = (latestVisit.completedAt!.getTime() - latestVisit.serviceStart!.getTime()) / 60000;
      
      // ML Exponential Moving Average (alpha = 0.2 for ~10 periods)
      const alpha = 0.2;
      const newEma = (latestDuration * alpha) + (currentEma * (1 - alpha));

      await this.prisma.service.update({
        where: { id: serviceId },
        data: { avgActualDurationMins: avgMins, emaExpectedDuration: newEma },
      });
    } catch (e) {
      console.error(`Failed to update duration stats for service ${serviceId}: ${e.message}`);
    }
  }

  async getAvailableSlots(tenantId: string, serviceId: string, date: string, locationId?: string) {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId, tenantId },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    // Determine eligible staff
    // A staff member is eligible if:
    // 1. Their allowedServiceIds includes the service ID OR
    // 2. Their skills array contains ALL required skills of the service
    const staffMembers = await this.prisma.staff.findMany({
      where: {
        tenantId,
        ...(locationId ? { locationId } : {}),
      },
      include: {
        services: true
      }
    });

    const eligibleStaff = staffMembers.filter((staff) => {
      if (staff.services?.some(s => s.id === serviceId)) {
        return true;
      }
      if (service.requiredSkills && service.requiredSkills.length > 0) {
        // Subset logic: all required skills must be in staff's skills
        const staffSkills = staff.skills || [];
        return service.requiredSkills.every((skill) => staffSkills.includes(skill));
      }
      return false;
    });

    if (eligibleStaff.length === 0) {
      return []; // No staff available for this service
    }

    // Now, we would typically generate slots based on business hours, exception dates, and existing appointments.
    // For simplicity, let's generate mock slots for the eligible staff members.
    // Real implementation would calculate true availability per staff member.
    
    const slots = [];
    const baseDate = new Date(date);
    baseDate.setHours(9, 0, 0, 0); // Start at 9 AM

    for (let i = 0; i < 6; i++) {
      const slotStart = new Date(baseDate.getTime() + i * (service.appointmentGranularityMins || 30) * 60000);
      const slotEnd = new Date(slotStart.getTime() + (service.expectedDuration || 30) * 60000);
      
      // Assign the first eligible staff for demonstration
      const assignedStaff = eligibleStaff[i % eligibleStaff.length];
      
      slots.push({
        start: slotStart.toISOString(),
        end: slotEnd.toISOString(),
        staffId: assignedStaff.id,
        staffName: assignedStaff.name,
      });
    }

    return slots;
  }
}
