import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private redisService: RedisService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: any) => {
          let token = null;
          if (request && request.cookies) {
            token = request.cookies['token'];
          }
          return token || ExtractJwt.fromAuthHeaderAsBearerToken()(request);
        },
      ]),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') || 'yq-queue-super-secret-key',
    });
  }

  async validate(payload: any) {
    if (payload.jti) {
      const isBlocked = await this.redisService.client.get(
        `blocklist:${payload.jti}`,
      );
      if (isBlocked) {
        throw new UnauthorizedException('Session expired');
      }
    }

    if (payload.isDeskToken) {
      const staff = await this.prisma.staff.findUnique({
        where: { id: payload.staffId },
        include: {
          services: { select: { id: true } },
        },
      });

      if (!staff || !staff.deskToken || staff.deskToken !== payload.deskToken) {
        throw new UnauthorizedException(
          'Desk token is invalid or has been revoked',
        );
      }

      return {
        userId: staff.id,
        sub: staff.id,
        staffId: staff.id,
        email: staff.email || `${staff.id}@desk.qmova.local`,
        role: 'STAFF',
        tenantId: staff.tenantId,
        isDeskToken: true,
        allowedPages: ['my-desk', 'service-desk'],
        allowedLocationIds: staff.locationId ? [staff.locationId] : [],
        allowedServiceIds: staff.services.map((s) => s.id),
      };
    }

    if (payload.sub) {
      const isUserBlocked = await this.redisService.client.get(
        `blocklist_user:${payload.sub}`,
      );
      if (isUserBlocked) {
        throw new UnauthorizedException('Access revoked');
      }

      // Verify user still exists in database to prevent orphaned JWT errors
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          role: true,
          tenantId: true,
          allowedPages: true,
          allowedLocationIds: true,
          allowedServiceIds: true,
        },
      });

      if (!user) {
        throw new UnauthorizedException('User no longer exists');
      }

      // Sync role, tenantId and allowed scopes from DB in case they were updated
      payload.role = user.role;
      payload.tenantId = user.tenantId;
      if (user.allowedPages) payload.allowedPages = user.allowedPages;
      if (user.allowedLocationIds)
        payload.allowedLocationIds = user.allowedLocationIds;
      if (user.allowedServiceIds)
        payload.allowedServiceIds = user.allowedServiceIds;
    }

    return {
      userId: payload.sub,
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      tenantId: payload.tenantId,
      personalSettings: payload.personalSettings,
      allowedPages: payload.allowedPages ?? [],
      allowedLocationIds: payload.allowedLocationIds ?? [],
      allowedServiceIds: payload.allowedServiceIds ?? [],
      jti: payload.jti,
    };
  }
}
