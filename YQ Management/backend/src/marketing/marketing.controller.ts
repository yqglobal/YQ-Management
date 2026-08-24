import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { MarketingService } from './marketing.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('super-admin/marketing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class MarketingController {
  constructor(private readonly marketingService: MarketingService) {}

  @Get('audiences')
  async getAudiences() {
    return this.marketingService.getAudienceCounts();
  }

  @Post('send')
  async sendCampaign(
    @Body() body: { audience: string; subject: string; htmlContent: string },
  ) {
    return this.marketingService.sendCampaign(
      body.audience,
      body.subject,
      body.htmlContent,
    );
  }
}
