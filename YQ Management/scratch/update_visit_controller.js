const fs = require('fs');
const path = require('path');

const vcPath = path.join(__dirname, '../backend/src/visit/visit.controller.ts');
let vcContent = fs.readFileSync(vcPath, 'utf-8');

const target = `  findAll(
    @Req() req: AuthenticatedRequest,
    @Query('scope') scope?: 'today' | 'history',
    @Query('locationId') locationId?: string,
    @Query('queueId') queueId?: string,
    @Query('tz') tz?: string,
  ) {
    return this.visitService.findAll(req.user, scope, locationId, queueId, tz);
  }`;

const replacement = `  findAll(
    @Req() req: AuthenticatedRequest,
    @Query('scope') scope?: 'today' | 'history' | 'analytics',
    @Query('locationId') locationId?: string,
    @Query('queueId') queueId?: string,
    @Query('tz') tz?: string,
    @Query('timeframe') timeframe?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('serviceId') serviceId?: string,
  ) {
    return this.visitService.findAll(req.user, scope, locationId, queueId, tz, timeframe, startDate, endDate, serviceId);
  }`;

vcContent = vcContent.replace(target, replacement);
fs.writeFileSync(vcPath, vcContent, 'utf-8');
console.log('Updated visit.controller.ts');
