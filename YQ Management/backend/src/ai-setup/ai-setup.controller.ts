import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AiSetupService } from './ai-setup.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('ai-setup')
export class AiSetupController {
  constructor(private readonly aiSetupService: AiSetupService) {}

  @Post('generate-flow')
  generateServiceFlow(@Req() req: any, @Body() body: { prompt: string }) {
    return this.aiSetupService.generateServiceFlow(body.prompt, req.user.tenantId);
  }
}
