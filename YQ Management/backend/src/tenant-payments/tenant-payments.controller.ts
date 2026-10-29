import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  Param,
  Query,
} from '@nestjs/common';
import { TenantPaymentsService } from './tenant-payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('tenant-payments')
export class TenantPaymentsController {
  constructor(private readonly tenantPaymentsService: TenantPaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('records')
  listPayments(
    @Req() req: any,
    @Query('locationId') locationId?: string,
    @Query('serviceId') serviceId?: string,
    @Query('status') status?: string,
    @Query('method') method?: string,
    @Query('timeframe') timeframe?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.tenantPaymentsService.listPayments(req.user.tenantId, {
      locationId,
      serviceId,
      status,
      method,
      timeframe,
      startDate,
      endDate,
      search,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

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
  @Post('reset')
  resetConnectAccount(@Req() req: any) {
    return this.tenantPaymentsService.resetConnectAccount(req.user.tenantId);
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
    @Body()
    body: {
      method?: string;
      proofUrl?: string;
      description?: string;
      sendWhatsAppReceipt?: boolean;
    },
  ) {
    return this.tenantPaymentsService.completePayment(id, body?.method, {
      proofUrl: body?.proofUrl,
      description: body?.description,
      sendWhatsAppReceipt: body?.sendWhatsAppReceipt,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('manual')
  recordManualPayment(
    @Req() req: any,
    @Body()
    body: {
      visitId: string;
      amount: number;
      method: string;
      description?: string;
      source?: 'CHECKIN' | 'CHECKOUT';
      proofUrl?: string;
      sendWhatsAppReceipt?: boolean;
    },
  ) {
    return this.tenantPaymentsService.recordManualPayment(
      req.user.tenantId,
      body.visitId,
      body.amount,
      body.method,
      body.description,
      {
        source: body.source,
        staffId: req.user.userId,
        proofUrl: body.proofUrl,
        sendWhatsAppReceipt: body.sendWhatsAppReceipt,
      },
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
