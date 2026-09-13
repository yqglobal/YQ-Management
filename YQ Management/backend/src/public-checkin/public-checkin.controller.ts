import { Controller, Post, Body, Param } from '@nestjs/common';
import { PublicCheckinService } from './public-checkin.service';

@Controller('public-checkin')
export class PublicCheckinController {
  constructor(private readonly service: PublicCheckinService) {}

  @Post('send-otp')
  sendOtp(@Body() body: { phone: string; tenantId: string; locationId?: string }) {
    return this.service.sendOtp(body);
  }

  @Post('verify-otp')
  verifyOtp(@Body() body: { phone: string; tenantId: string; locationId?: string; code: string }) {
    return this.service.verifyOtp(body);
  }

  @Post(':visitId/confirm')
  confirmCheckIn(
    @Param('visitId') visitId: string,
    @Body() body: { sessionToken: string },
  ) {
    return this.service.confirmCheckIn(visitId, body.sessionToken);
  }
}
