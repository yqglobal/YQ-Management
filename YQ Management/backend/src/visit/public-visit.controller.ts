import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { VisitService } from './visit.service';

@Controller('public-visit')
export class PublicVisitController {
  constructor(private readonly visitService: VisitService) {}

  @Get(':accessToken')
  async getPublicVisit(@Param('accessToken') accessToken: string) {
    // In a real scenario, this would only return non-sensitive data
    const visit = await this.visitService.findOnePublic(accessToken);
    return visit;
  }

  @Post('queue/:queueId/join')
  async joinQueue(
    @Param('queueId') queueId: string,
    @Body() body: { name: string; phone?: string | null },
  ) {
    return this.visitService.joinQueue(queueId, body);
  }
}
