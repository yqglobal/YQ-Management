import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
  Query,
} from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ServiceFlowService } from '../service-flow/service-flow.service';

@Controller('onboarding')
export class OnboardingController {
  constructor(
    private readonly onboardingService: OnboardingService,
    private readonly flowService: ServiceFlowService,
  ) {}

  @Get('industries')
  getIndustries() {
    return this.onboardingService.getIndustries();
  }

  @Get('business-catalog')
  getBusinessCatalog() {
    return this.onboardingService.getBusinessCatalog();
  }

  /**
   * Check plan fit for given resource requirements.
   * No auth required so it can be called before account creation too.
   * GET /onboarding/check-plan-fit?locations=2&services=5
   */
  @Get('check-plan-fit')
  async checkPlanFit(
    @Query('locations') locations: string,
    @Query('services') services: string,
  ) {
    const totalLocations = Math.max(1, parseInt(locations ?? '1', 10) || 1);
    const totalServices = Math.max(0, parseInt(services ?? '0', 10) || 0);
    return this.onboardingService.checkPlanFit(totalLocations, totalServices);
  }

  /**
   * New multi-location provisioning endpoint.
   * Provisions all locations, services, and queues atomically.
   * POST /onboarding/provision-multi
   */
  @UseGuards(JwtAuthGuard)
  @Post('provision-multi')
  async provisionMulti(@Req() req: any, @Body() body: any) {
    const result = await this.onboardingService.provisionMulti(
      req.user.tenantId,
      body,
    );

    // Apply industry flow templates to services that have seedFlow=true
    for (const loc of result.locations) {
      if (loc.blueprintKey && loc.serviceIdsWithFlow?.length > 0) {
        for (const serviceId of loc.serviceIdsWithFlow) {
          try {
            await this.flowService.applyIndustryTemplate(
              req.user.tenantId,
              serviceId,
              loc.blueprintKey,
            );
          } catch (error) {
            console.error(
              `Failed to apply template ${loc.blueprintKey} to service ${serviceId}`,
              error,
            );
          }
        }
      }
    }

    return result;
  }

  /**
   * Legacy single-location provision for backward compat.
   * POST /onboarding/provision
   */
  @UseGuards(JwtAuthGuard)
  @Post('provision')
  async provision(@Req() req: any, @Body() body: any) {
    const result = await this.onboardingService.provision(
      req.user.tenantId,
      body,
    );

    if (body.blueprintKey && result.serviceIdsWithFlow?.length > 0) {
      for (const serviceId of result.serviceIdsWithFlow) {
        try {
          await this.flowService.applyIndustryTemplate(
            req.user.tenantId,
            serviceId,
            body.blueprintKey,
          );
        } catch (error) {
          console.error(
            `Failed to apply template ${body.blueprintKey} to service ${serviceId}`,
            error,
          );
        }
      }
    } else if (body.blueprintKey && result.serviceIds?.length > 0) {
      for (const serviceId of result.serviceIds) {
        try {
          await this.flowService.applyIndustryTemplate(
            req.user.tenantId,
            serviceId,
            body.blueprintKey,
          );
        } catch (error) {
          console.error(
            `Failed to apply template ${body.blueprintKey} to service ${serviceId}`,
            error,
          );
        }
      }
    }

    return result;
  }
}
