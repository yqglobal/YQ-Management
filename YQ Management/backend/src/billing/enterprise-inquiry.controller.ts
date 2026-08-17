import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { EnterpriseInquiryService, CreateEnterpriseInquiryDto } from './enterprise-inquiry.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { Request } from 'express';

@Controller('billing/enterprise-inquiries')
export class EnterpriseInquiryController {
  constructor(private readonly inquiryService: EnterpriseInquiryService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createInquiry(@Req() req: Request, @Body() dto: CreateEnterpriseInquiryDto) {
    const tenantId = (req.user as any)?.tenantId;
    return this.inquiryService.createInquiry(tenantId, dto);
  }
}
