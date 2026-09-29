const fs = require('fs');
const path = require('path');

const vsPath = path.join(__dirname, '../backend/src/visit/visit.service.ts');
let vsContent = fs.readFileSync(vsPath, 'utf-8');

const target = `  async findAll(
    userTokenPayload: any,
    scope?: 'today' | 'history',
    locationId?: string,
    queueId?: string,
    tzParam?: string,
  ) {`;
const replacement = `  async findAll(
    userTokenPayload: any,
    scope?: 'today' | 'history' | 'analytics',
    locationId?: string,
    queueId?: string,
    tzParam?: string,
    timeframe?: string,
    startDate?: string,
    endDate?: string,
    serviceId?: string,
  ) {`;
vsContent = vsContent.replace(target, replacement);

const target2 = `    if (queueId) {
      where.queueId = queueId;
    }`;
const replacement2 = `    if (queueId) {
      where.queueId = queueId;
    }
    if (serviceId) {
      where.serviceId = serviceId;
    }`;
vsContent = vsContent.replace(target2, replacement2);

const target3 = `    } else if (scope === 'history') {
      where.currentState = { in: ['COMPLETED', 'NO_SHOW', 'CANCELLED'] };
    }`;
const replacement3 = `    } else if (scope === 'history' || scope === 'analytics') {
      if (scope === 'history') {
        where.currentState = { in: ['COMPLETED', 'NO_SHOW', 'CANCELLED'] };
      }
      if (startDate && endDate) {
        where.createdAt = { gte: new Date(startDate), lte: new Date(endDate) };
      } else if (startDate) {
        where.createdAt = { gte: new Date(startDate) };
      } else if (timeframe === '7d') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        where.createdAt = { gte: d };
      } else if (timeframe === '30d') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        where.createdAt = { gte: d };
      } else if (timeframe === 'today') {
        const tz = tzParam || 'UTC';
        const zonedNow = require('date-fns-tz').toZonedTime(new Date(), tz);
        zonedNow.setHours(0, 0, 0, 0);
        where.createdAt = { gte: require('date-fns-tz').fromZonedTime(zonedNow, tz) };
      }
    }`;
vsContent = vsContent.replace(target3, replacement3);
fs.writeFileSync(vsPath, vsContent, 'utf-8');
console.log('Updated visit.service.ts');
