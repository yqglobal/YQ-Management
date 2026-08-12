import { Controller, Post, Body, Req, UseGuards, Ip, Headers } from '@nestjs/common';
import { PoliciesService } from './policies.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/types/auth.types';

@Controller('policies')
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  @UseGuards(JwtAuthGuard)
  @Post('accept')
  async acceptPolicy(
    @Req() req: AuthenticatedRequest,
    @Body() body: { type: string; version: string },
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.policiesService.acceptPolicy(
      req.user.userId,
      body.type as any,
      body.version,
      ip,
      userAgent,
    );
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Post('cookie-preferences')
  async saveCookiePreferences(
    @Req() req: any,
    @Body() body: { anonymousId?: string; preferences: any },
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const userId = req.user?.userId;
    return this.policiesService.saveCookiePreferences(
      userId,
      body.anonymousId,
      body.preferences,
      ip,
      userAgent,
    );
  }
}
