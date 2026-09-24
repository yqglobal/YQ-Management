import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { SlaPolicyService } from './sla-policy.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('sla-policies')
@UseGuards(AuthGuard('jwt'))
export class SlaPolicyController {
  constructor(private readonly slaPolicyService: SlaPolicyService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.slaPolicyService.findAll(req.user.tenantId);
  }

  @Post()
  create(@Req() req: any, @Body() data: any) {
    return this.slaPolicyService.create(req.user.tenantId, data);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Req() req: any, @Body() data: any) {
    return this.slaPolicyService.update(id, req.user.tenantId, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.slaPolicyService.remove(id, req.user.tenantId);
  }
}
