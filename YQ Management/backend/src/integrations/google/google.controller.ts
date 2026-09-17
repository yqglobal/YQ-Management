import {
  Controller,
  Get,
  Delete,
  Post,
  Query,
  Patch,
  Body,
  BadRequestException,
  Req,
  UseGuards,
  Param,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { GoogleService } from './google.service';

@Controller('integrations/google')
@UseGuards(AuthGuard('jwt'))
export class GoogleController {
  constructor(
    private readonly googleService: GoogleService,
    private readonly configService: ConfigService,
  ) {}

  // ─── Settings ─────────────────────────────────────────────────────────────────

  @Get('business-profile')
  async getBusinessProfileSettings(@Req() req: any) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new BadRequestException('tenantId is required');
    return this.googleService.getSettings(tenantId);
  }

  @Patch('business-profile')
  async updateBusinessProfileSettings(
    @Req() req: any,
    @Body() data: {
      enableSmartReviews?: boolean;
      reviewWaitThresholdMins?: number;
      locations?: any[];
    }
  ) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new BadRequestException('tenantId is required');
    return this.googleService.updateSettings(tenantId, data);
  }

  // ─── Disconnect ────────────────────────────────────────────────────────────────

  @Delete(':integrationId')
  async disconnectAccount(
    @Req() req: any,
    @Param('integrationId') integrationId: string,
  ) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new BadRequestException('tenantId is required');
    return this.googleService.disconnectIntegration(integrationId, tenantId);
  }

  // ─── Calendars ─────────────────────────────────────────────────────────────────

  @Get('calendars/:integrationId')
  async listCalendars(
    @Req() req: any,
    @Param('integrationId') integrationId: string,
  ) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new BadRequestException('tenantId is required');
    return this.googleService.listCalendars(integrationId, tenantId);
  }

  // ─── Google Business Profile ───────────────────────────────────────────────────

  @Get('business-accounts/:integrationId')
  async fetchBusinessAccounts(
    @Req() req: any,
    @Param('integrationId') integrationId: string,
  ) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new BadRequestException('tenantId is required');
    return this.googleService.fetchGoogleBusinessAccounts(integrationId, tenantId);
  }

  @Post('booking-button')
  async setBookingButton(
    @Req() req: any,
    @Body() body: {
      integrationId: string;
      gbpLocationName: string; // e.g. "accounts/123/locations/456"
      bookingUrl: string;
    },
  ) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new BadRequestException('tenantId is required');
    if (!body.integrationId || !body.gbpLocationName || !body.bookingUrl) {
      throw new BadRequestException('integrationId, gbpLocationName, and bookingUrl are required');
    }
    return this.googleService.setBookingUrl(
      body.integrationId,
      tenantId,
      body.gbpLocationName,
      body.bookingUrl,
    );
  }
}
