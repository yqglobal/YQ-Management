import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private redisService: RedisService,
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
    }

    return {
      userId: payload.sub,
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      tenantId: payload.tenantId || payload.workspaceId,
      workspaceId: payload.workspaceId || payload.tenantId,
      personalSettings: payload.personalSettings,
      jti: payload.jti,
    };
  }
}
