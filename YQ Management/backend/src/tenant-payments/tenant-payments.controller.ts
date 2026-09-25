import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TenantPaymentsService } from './tenant-payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('tenant-payments')
export class TenantPaymentsController {
  constructor(private readonly tenantPaymentsService: TenantPaymentsService) {}

  @Post('connect')
  createConnectAccount(@Req() req: any) {
    return this.tenantPaymentsService.createConnectAccount(req.user.tenantId);
  }

  @Get('status')
  getAccountStatus(@Req() req: any) {
    return this.tenantPaymentsService.getAccountStatus(req.user.tenantId);
  }

  @Post('intent')
  createPaymentIntent(
    @Req() req: any,
    @Body() dto: { amount: number; visitId?: string; visitStepId?: string; appointmentId?: string; description?: string }
  ) {
    return this.tenantPaymentsService.createPaymentIntent(req.user.tenantId, dto.amount, {
      visitId: dto.visitId,
      visitStepId: dto.visitStepId,
      appointmentId: dto.appointmentId,
      description: dto.description,
    });
  }
}
