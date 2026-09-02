import { Controller, Get, Query, Res, Patch, Body, BadRequestException, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
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

  @UseGuards(AuthGuard('jwt'))
  @Get('business-profile')
  async getBusinessProfileSettings(@Req() req: any) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('tenantId is required');
    }
    return this.googleService.getSettings(tenantId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('business-profile')
  async updateBusinessProfileSettings(
    @Req() req: any,
    @Body() data: { googlePlaceId?: string; enableSmartReviews?: boolean; reviewWaitThresholdMins?: number }
  ) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('tenantId is required');
    }
    return this.googleService.updateSettings(tenantId, data);
  }
}
