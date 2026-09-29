import { Controller, Post, Get, Body, Req, UseGuards, Param } from '@nestjs/common';
import { TenantPaymentsService } from './tenant-payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('tenant-payments')
export class TenantPaymentsController {
  constructor(private readonly tenantPaymentsService: TenantPaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('connect')
  createConnectAccount(@Req() req: any) {
    return this.tenantPaymentsService.createConnectAccount(req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('status')
  getAccountStatus(@Req() req: any) {
    return this.tenantPaymentsService.getAccountStatus(req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('intent')
  createPaymentIntent(
    @Req() req: any,
    @Body()
    dto: {
      amount: number;
      visitId?: string;
      visitStepId?: string;
      appointmentId?: string;
      description?: string;
    },
  ) {
    return this.tenantPaymentsService.createPaymentIntent(
      req.user.tenantId,
      dto.amount,
      {
        visitId: dto.visitId,
        visitStepId: dto.visitStepId,
        appointmentId: dto.appointmentId,
        description: dto.description,
      },
    );
  }

  @Post('public/intent')
  createPublicPaymentIntent(
    @Body()
    dto: {
      tenantId: string;
      amount: number;
      visitId?: string;
      visitStepId?: string;
      appointmentId?: string;
      description?: string;
    },
  ) {
    // For public bookings, they pass the tenantId in the body
    return this.tenantPaymentsService.createPaymentIntent(
      dto.tenantId,
      dto.amount,
      {
        visitId: dto.visitId,
        visitStepId: dto.visitStepId,
        appointmentId: dto.appointmentId,
        description: dto.description,
      },
    );
  }

  @Get('public/payment/:id')
  getPayment(@Param('id') id: string) {
    return this.tenantPaymentsService.getPayment(id);
  }

  @Post('public/payment/:id/complete')
  completePayment(
    @Param('id') id: string,
    @Body() body: { method?: string },
  ) {
    return this.tenantPaymentsService.completePayment(id, body?.method);
  }

  @UseGuards(JwtAuthGuard)
  @Post('manual')
  recordManualPayment(
    @Req() req: any,
    @Body() body: { visitId: string, amount: number, method: string, description?: string }
  ) {
    return this.tenantPaymentsService.recordManualPayment(
      req.user.tenantId,
      body.visitId,
      body.amount,
      body.method,
      body.description
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/refund')
  refundPayment(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.tenantPaymentsService.refundPayment(
      req.user.tenantId,
      id,
      body?.reason,
    );
  }
}
