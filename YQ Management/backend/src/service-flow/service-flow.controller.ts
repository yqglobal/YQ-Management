import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ServiceFlowService } from './service-flow.service';
import { CreateFlowDto } from './dto/create-flow.dto';
import { UpdateFlowDto } from './dto/update-flow.dto';
import { CreateStepDto } from './dto/create-step.dto';
import { UpdateStepDto } from './dto/update-step.dto';
import { ReorderStepsDto } from './dto/reorder-steps.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('service-flows')
export class ServiceFlowController {
  constructor(private readonly serviceFlowService: ServiceFlowService) {}

  @Post()
  createFlow(@Req() req: any, @Body() dto: CreateFlowDto) {
    return this.serviceFlowService.createFlow(req.user.tenantId, dto);
  }

  @Get('by-service/:serviceId')
  getFlowByService(@Req() req: any, @Param('serviceId') serviceId: string) {
    return this.serviceFlowService.getFlowByServiceId(req.user.tenantId, serviceId);
  }

  @Get(':flowId')
  getFlow(@Req() req: any, @Param('flowId') flowId: string) {
    return this.serviceFlowService.getFlowWithSteps(req.user.tenantId, flowId);
  }

  @Patch(':flowId')
  updateFlow(@Req() req: any, @Param('flowId') flowId: string, @Body() dto: UpdateFlowDto) {
    return this.serviceFlowService.updateFlow(req.user.tenantId, flowId, dto);
  }

  @Delete(':flowId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteFlow(@Req() req: any, @Param('flowId') flowId: string) {
    return this.serviceFlowService.deleteFlow(req.user.tenantId, flowId);
  }

  @Post(':flowId/duplicate')
  duplicateFlow(@Req() req: any, @Param('flowId') flowId: string) {
    return this.serviceFlowService.duplicateFlow(req.user.tenantId, flowId);
  }

  @Post(':flowId/steps')
  createStep(@Req() req: any, @Param('flowId') flowId: string, @Body() dto: CreateStepDto) {
    return this.serviceFlowService.createStep(req.user.tenantId, flowId, dto);
  }

  @Patch(':flowId/steps/:stepId')
  updateStep(@Req() req: any, @Param('stepId') stepId: string, @Body() dto: UpdateStepDto) {
    return this.serviceFlowService.updateStep(req.user.tenantId, stepId, dto);
  }

  @Delete(':flowId/steps/:stepId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteStep(@Req() req: any, @Param('stepId') stepId: string) {
    return this.serviceFlowService.deleteStep(req.user.tenantId, stepId);
  }

  @Post(':flowId/steps/reorder')
  reorderSteps(@Req() req: any, @Param('flowId') flowId: string, @Body() dto: ReorderStepsDto) {
    return this.serviceFlowService.reorderSteps(req.user.tenantId, flowId, dto.orderedStepIds);
  }

  @Get('templates/list')
  listTemplates() {
    return this.serviceFlowService.listIndustryTemplates();
  }

  @Post('templates/:templateKey/apply')
  applyTemplate(@Req() req: any, @Param('templateKey') templateKey: string, @Query('serviceId') serviceId: string) {
    return this.serviceFlowService.applyIndustryTemplate(req.user.tenantId, serviceId, templateKey);
  }
}
