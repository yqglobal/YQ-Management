import { Controller, Get, Param } from '@nestjs/common';
import { VisitService } from './visit.service';

@Controller('public-visit')
export class PublicVisitController {
  constructor(private readonly visitService: VisitService) {}

  @Get(':id')
  async getPublicVisit(@Param('id') id: string) {
    // In a real scenario, this would only return non-sensitive data
    // For now, we bypass the tenant check by passing undefined or finding a way to fetch it
    const visit = await this.visitService.findOnePublic(id);
    return visit;
  }
}
