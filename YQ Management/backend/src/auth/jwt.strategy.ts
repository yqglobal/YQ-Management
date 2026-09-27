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
        select: { id: true, role: true, tenantId: true },
      });

      if (!user) {
        throw new UnauthorizedException('User no longer exists');
      }

      // Sync role and tenantId from DB in case they were updated
      payload.role = user.role;
      payload.tenantId = user.tenantId;
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
