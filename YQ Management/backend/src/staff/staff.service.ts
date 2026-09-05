import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface WeeklyScheduleSlot {
  day: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
  startTime: string; // "09:00"
  endTime: string;   // "17:00"
  enabled: boolean;
}

interface ExceptionDate {
  date: string;    // "2026-12-25"
  reason?: string; // "Christmas"
  allDay?: boolean;
  startTime?: string;
  endTime?: string;
}

interface CreateProviderDto {
  name: string;
  title?: string;
  email?: string;
  phone?: string;
  bio?: string;
  avatarUrl?: string;
  color?: string;
  locationId?: string;
  userId?: string;
  capacity?: number;
  status?: string;
  weeklySchedule?: WeeklyScheduleSlot[];
  exceptionDates?: ExceptionDate[];
  serviceIds?: string[];
}

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateProviderDto) {
    const { serviceIds, weeklySchedule, exceptionDates, ...rest } = dto;

    const provider = await this.prisma.staff.create({
      data: {
        ...rest,
        tenantId,
        weeklySchedule: weeklySchedule ? (weeklySchedule as any) : undefined,
        exceptionDates: exceptionDates ? (exceptionDates as any) : undefined,
        ...(serviceIds && serviceIds.length > 0
          ? {
              services: {
                connect: serviceIds.map((id) => ({ id })),
              },
            }
          : {}),
      },
      include: { services: { select: { id: true, name: true } } },
    });

    return provider;
  }

  async findAll(tenantId: string, locationId?: string) {
    return this.prisma.staff.findMany({
      where: {
        tenantId,
        ...(locationId && { locationId }),
      },
      include: {
        services: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const provider = await this.prisma.staff.findFirst({
      where: { id, tenantId },
      include: {
        services: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
      },
    });
    if (!provider) {
      throw new NotFoundException(`Provider with ID ${id} not found`);
    }
    return provider;
  }

  async update(id: string, tenantId: string, dto: Partial<CreateProviderDto>) {
    await this.findOne(id, tenantId); // verify exists

    const { serviceIds, weeklySchedule, exceptionDates, ...rest } = dto;

    return this.prisma.staff.update({
      where: { id },
      data: {
        ...rest,
        ...(weeklySchedule !== undefined ? { weeklySchedule: weeklySchedule as any } : {}),
        ...(exceptionDates !== undefined ? { exceptionDates: exceptionDates as any } : {}),
        ...(serviceIds !== undefined
          ? {
              services: {
                set: serviceIds.map((sid) => ({ id: sid })),
              },
            }
          : {}),
      },
      include: { services: { select: { id: true, name: true } } },
    });
  }

  async updateSchedule(
    id: string,
    tenantId: string,
    weeklySchedule: WeeklyScheduleSlot[],
    exceptionDates?: ExceptionDate[],
  ) {
    await this.findOne(id, tenantId);
    return this.prisma.staff.update({
      where: { id },
      data: {
        weeklySchedule: weeklySchedule as any,
        ...(exceptionDates !== undefined ? { exceptionDates: exceptionDates as any } : {}),
      },
    });
  }

  async updateServices(id: string, tenantId: string, serviceIds: string[]) {
    await this.findOne(id, tenantId);
    return this.prisma.staff.update({
      where: { id },
      data: {
        services: {
          set: serviceIds.map((sid) => ({ id: sid })),
        },
      },
      include: { services: { select: { id: true, name: true } } },
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.staff.delete({ where: { id } });
  }

  /**
   * Find providers available for a given service. If date is provided, filters by weeklySchedule.
   */
  async findAvailableForService(
    tenantId: string,
    serviceId: string,
    date?: string,
  ) {
    if (!serviceId) throw new BadRequestException('serviceId is required');

    const providers = await this.prisma.staff.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
        services: {
          some: { id: serviceId },
        },
      },
      include: {
        services: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
      },
    });

    if (!date) return providers;

    const targetDate = new Date(date);
    const dayOfWeek = targetDate
      .toLocaleDateString('en-US', { weekday: 'long' })
      .toUpperCase();

    // Filter by availability on that day
    return providers.filter((p) => {
      const schedule = (p.weeklySchedule as any[]) || [];
      // If no schedule defined, provider is available all days (open availability)
      if (schedule.length === 0) return true;

      const daySlot = schedule.find(
        (s) => s.day === dayOfWeek && s.enabled !== false,
      );
      if (!daySlot) return false;

      // Check exception dates
      const exceptions = (p.exceptionDates as any[]) || [];
      const hasException = exceptions.some((e) => e.date === date);
      return !hasException;
    });
  }
}
