import { Controller, Get, Query, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { GoogleService } from './google.service';

@Controller('integrations/google')
export class GoogleController {
  constructor(
    private readonly googleService: GoogleService,
    private readonly configService: ConfigService,
  ) {}

  @Get('connect')
  connect(@Query('tenantId') tenantId: string, @Res() res: Response) {
    if (!tenantId) {
      return res.status(400).send('tenantId is required');
    }
    const url = this.googleService.getAuthUrl(tenantId);
    return res.redirect(url);
  }

  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string, // state contains tenantId
    @Res() res: Response,
  ) {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';
    const tenantId = state;

    if (!code || !tenantId) {
      return res.redirect(
        `${frontendUrl}/dashboard/settings/integrations?google=error`,
      );
    }

    try {
      await this.googleService.handleCallback(code, tenantId);
      return res.redirect(
        `${frontendUrl}/dashboard/settings/integrations?google=success`,
      );
    } catch (error) {
      return res.redirect(
        `${frontendUrl}/dashboard/settings/integrations?google=error`,
      );
    }
  }
}
