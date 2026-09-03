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
