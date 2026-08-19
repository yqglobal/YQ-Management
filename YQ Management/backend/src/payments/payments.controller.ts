import {
  Controller,
  Post,
  Body,
  Headers,
  UseGuards,
  Request,
  Get,
  Req,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN, Role.ADMIN)
  @Post('generate-link')
  async generatePaymentLink(
    @Req() req: any,
    @Body() body: { planId: string; billingInterval: string },
  ) {
    const tenantId = req.user.tenantId;
    return this.paymentsService.generatePaymentLink(
      tenantId,
      body.planId,
      body.billingInterval,
    );
  }

  @Post('webhook')
  async handleWebhook(@Body() body: any, @Headers() headers: any) {
    return this.paymentsService.handleWebhook(body, headers);
  }
}
