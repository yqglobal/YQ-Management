import { Controller, Get, Query, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(@Query('domain') domain?: string) {
    if (domain) {
      // Allow base domains and localhost explicitly
      if (domain.includes('localhost') || domain === process.env.BASE_DOMAIN || domain === 'qmova.app' || domain === 'www.qmova.app') {
        return { status: 'ok', timestamp: new Date().toISOString() };
      }

      // Check if domain matches a known tenant subdomain
      const subdomain = domain.split('.')[0];
      const tenant = await this.prisma.tenant.findUnique({
        where: { subdomain }
      });
      
      if (!tenant) {
        throw new NotFoundException('Domain not recognized');
      }
    }
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
