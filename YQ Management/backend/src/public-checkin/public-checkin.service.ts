import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PublicCheckinService {
  private readonly logger = new Logger(PublicCheckinService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async sendOtp(dto: { phone: string; tenantId: string; locationId?: string }) {
    const { phone, tenantId, locationId } = dto;

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Business not found');
    if (!tenant.selfServeModeEnabled) {
      throw new BadRequestException('Self-serve check-in is not enabled for this location');
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentOtps = await this.prisma.checkInOtp.count({
      where: { phone, tenantId, createdAt: { gte: oneHourAgo } },
    });
    if (recentOtps >= 3) {
      throw new BadRequestException('Too many OTP requests. Please wait before trying again.');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 6 * 60 * 1000);

    await this.prisma.checkInOtp.create({
      data: { phone, tenantId, locationId, code, expiresAt },
    });

    const message = `🔐 Your check-in code for *${tenant.name}* is: *${code}*\n\nThis code expires in 6 minutes.`;
    try {
      await this.notificationsService.sendWhatsAppMessage(phone, message, tenantId);
    } catch (err) {
      this.logger.warn(`WhatsApp OTP delivery failed for ${phone}. [DEV OTP] Code: ${code}`);
    }

    return { success: true, message: 'OTP sent to your WhatsApp number.' };
  }

  async verifyOtp(dto: { phone: string; tenantId: string; locationId?: string; code: string }) {
    const { phone, tenantId, locationId, code } = dto;

    const otp = await this.prisma.checkInOtp.findFirst({
      where: { phone, tenantId, code, verified: false, expiresAt: { gte: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) throw new UnauthorizedException('Invalid or expired OTP. Please request a new one.');

    await this.prisma.checkInOtp.update({ where: { id: otp.id }, data: { verified: true } });

    const sessionToken = otp.id;

    const customer = await this.prisma.customer.findFirst({ where: { phone, tenantId } });
    if (!customer) return { sessionToken, visits: [] };

    const whereClause: any = {
      customerId: customer.id,
      tenantId,
      currentState: { notIn: ['COMPLETED', 'CANCELLED', 'NO_SHOW', 'MISSED', 'ABANDONED'] },
    };
    if (locationId) whereClause.locationId = locationId;

    const visits = await this.prisma.visit.findMany({
      where: whereClause,
      include: {
        service: { select: { name: true, expectedDuration: true, requireManualCheckIn: true } },
        location: { select: { name: true, address: true } },
        queue: { select: { name: true, status: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const enrichedVisits = await Promise.all(
      visits.map(async (visit) => {
        let position = 0;
        let estimatedWaitTime = 0;
        if (visit.currentState === 'WAITING' || visit.currentState === 'CHECKED_IN') {
          const waitingAhead = await this.prisma.visit.count({
            where: {
              queueId: visit.queueId,
              currentState: { in: ['WAITING', 'CHECKED_IN'] },
              createdAt: { lt: visit.createdAt },
            },
          });
          position = waitingAhead + 1;
          estimatedWaitTime = waitingAhead * (visit.service?.expectedDuration || 5);
        }
        return {
          id: visit.id,
          displayId: visit.displayId,
          accessToken: visit.accessToken,
          serviceName: visit.service?.name,
          locationName: visit.location?.name,
          scheduledTime: visit.scheduledTime,
          currentState: visit.currentState,
          position,
          estimatedWaitTime,
          requiresCheckIn: visit.service?.requireManualCheckIn || false,
        };
      }),
    );

    return { sessionToken, visits: enrichedVisits };
  }

  async confirmCheckIn(visitId: string, sessionToken: string) {
    const otp = await this.prisma.checkInOtp.findFirst({
      where: { id: sessionToken, verified: true, createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) } },
    });
    if (!otp) throw new UnauthorizedException('Session expired. Please re-enter your OTP.');

    const visit = await this.prisma.visit.findFirst({
      where: { id: visitId, tenantId: otp.tenantId },
      include: {
        customer: { select: { name: true, phone: true } },
        service: { select: { name: true, expectedDuration: true } },
        location: { select: { name: true } },
        tenant: { select: { name: true } },
      },
    });
    if (!visit) throw new NotFoundException('Booking not found');

    const customer = await this.prisma.customer.findFirst({ where: { phone: otp.phone, tenantId: otp.tenantId } });
    if (!customer || visit.customerId !== customer.id) {
      throw new UnauthorizedException('This booking does not belong to your phone number');
    }

    if (['CHECKED_IN', 'IN_SERVICE', 'COMPLETED'].includes(visit.currentState)) {
      return { success: true, alreadyCheckedIn: true, currentState: visit.currentState };
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.visit.update({
        where: { id: visitId },
        data: { currentState: 'CHECKED_IN', waitingStart: new Date(), checkInTime: new Date(), priority: 10 },
      });
      await tx.outboxEvent.create({
        data: {
          type: 'VISIT_CHECKED_IN',
          payload: { visitId: u.id, queueId: u.queueId, tenantId: u.tenantId, source: 'SELF_SERVE' },
        },
      });
      return u;
    });

    const phone = visit.customer?.phone || otp.phone;
    if (phone) {
      const waitingAhead = await this.prisma.visit.count({
        where: {
          queueId: visit.queueId,
          currentState: { in: ['WAITING', 'CHECKED_IN'] },
          createdAt: { lt: visit.createdAt },
        },
      });
      const position = waitingAhead + 1;
      const ewt = waitingAhead * (visit.service?.expectedDuration || 5);
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.qmova.yqbuddy.com';
      const statusUrl = `${baseUrl}/status/${visit.accessToken}`;
      const msg =
        `✅ You've checked in at *${visit.location?.name || visit.tenant?.name}*!\n\n` +
        `📋 Booking: *${visit.service?.name}*\n` +
        `🔢 Your position: *#${position}*\n` +
        (ewt > 0 ? `⏱ Estimated wait: *${ewt} mins*\n\n` : '\n') +
        `Track your status: ${statusUrl}`;
      await this.notificationsService.sendWhatsAppMessage(phone, msg, visit.tenantId).catch((e) =>
        this.logger.warn(`WhatsApp check-in confirmation failed: ${e.message}`),
      );
    }

    return { success: true, alreadyCheckedIn: false, currentState: updated.currentState };
  }
}
