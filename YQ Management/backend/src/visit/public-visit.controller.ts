import { Controller, Get, Param, Post, Body, Query } from '@nestjs/common';
import { VisitService } from './visit.service';

@Controller('public-visit')
export class PublicVisitController {
  constructor(private readonly visitService: VisitService) {}

  @Get('status-multiple')
  async statusMultiple(@Query('tokens') tokens: string) {
    if (!tokens) return [];
    const tokenArray = tokens
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    return this.visitService.findMultiplePublic(tokenArray);
  }

  @Get('by-phone')
  async statusByPhone(@Query('phone') phone: string) {
    if (!phone) return [];
    return this.visitService.findByPhonePublic(phone);
  }

  @Get(':accessToken')
  async getPublicVisit(@Param('accessToken') accessToken: string) {
    // In a real scenario, this would only return non-sensitive data
    const visit = await this.visitService.findOnePublic(accessToken);
    return visit;
  }

  @Post(':accessToken/cancel')
  async cancelPublicVisit(@Param('accessToken') accessToken: string) {
    return this.visitService.cancelPublicVisit(accessToken);
  }

  @Post('queue/:queueId/join')
  async joinQueue(
    @Param('queueId') queueId: string,
    @Body() body: { name: string; phone?: string | null },
  ) {
    return this.visitService.joinQueue(queueId, body);
  }

  @Post('join-multiple')
  async joinMultiple(
    @Body()
    body: {
      customerName: string;
      phone?: string | null;
      otp?: string;
      language?: string;
      bookings: {
        serviceId: string;
        queueId?: string; // Made optional so frontend can specify or we infer
        scheduledFor?: string;
        formResponses?: any;
      }[];
    },
  ) {
    return this.visitService.joinMultiple(body);
  }
}
