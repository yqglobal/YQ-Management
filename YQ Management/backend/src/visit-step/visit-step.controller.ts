import {
  Controller, Get, Post, Body, Param, Req, UseGuards,
} from '@nestjs/common';
import { VisitStepService } from './visit-step.service';
import { AdvanceStepDto } from './dto/advance-step.dto';
import { RedeemEntitlementDto } from './dto/redeem-entitlement.dto';
import { ScanStepDto } from './dto/scan-step.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('visit-steps')
export class VisitStepController {
  constructor(private readonly visitStepService: VisitStepService) {}

  @Get('by-visit/:visitId')
  getVisitSteps(@Req() req: any, @Param('visitId') visitId: string) {
    return this.visitStepService.getVisitSteps(req.user.tenantId, visitId);
  }

  @Post('scan')
  handleScan(@Req() req: any, @Body() dto: ScanStepDto) {
    return this.visitStepService.handleScan(req.user.tenantId, dto.accessToken, req.user.id, dto.targetStepId);
  }

  @Post(':stepId/activate')
  activateStep(@Req() req: any, @Param('stepId') stepId: string) {
    return this.visitStepService.activateStep(req.user.tenantId, stepId, req.user.id);
  }

  @Post(':stepId/advance')
  advanceStep(@Req() req: any, @Param('stepId') stepId: string, @Body() dto: AdvanceStepDto) {
    return this.visitStepService.advanceStep(req.user.tenantId, stepId, req.user.id, dto);
  }

  @Post(':stepId/redeem')
  redeemCollection(@Req() req: any, @Param('stepId') stepId: string, @Body() dto: RedeemEntitlementDto) {
    return this.visitStepService.redeemCollection(req.user.tenantId, stepId, req.user.id, dto);
  }
}
