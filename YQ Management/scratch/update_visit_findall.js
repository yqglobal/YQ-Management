const fs = require('fs');
const path = require('path');

const visitServicePath = path.join(__dirname, '../backend/src/visit/visit.service.ts');
let content = fs.readFileSync(visitServicePath, 'utf-8');

const targetMethod = `  async findAll(
    userTokenPayload: any,
    scope?: 'today' | 'history',
    locationId?: string,
    queueId?: string,
    tzParam?: string,
  ) {`;

const newMethod = `  async findAll(
    userTokenPayload: any,
    scope?: 'today' | 'history',
    locationId?: string,
    queueId?: string,
    tzParam?: string,
    timeframe?: string,
    startDate?: string,
    endDate?: string,
    serviceId?: string,
  ) {
    const where: any = { tenantId: userTokenPayload.tenantId };
    if (locationId) {
      where.locationId = locationId;
    }
    if (queueId) {
      where.queueId = queueId;
    }
    if (serviceId) {
      where.serviceId = serviceId;
    }
    if (
      userTokenPayload.role === 'OPERATOR' ||
      userTokenPayload.role === 'MANAGER'
    ) {
      const user = await this.prisma.user.findUnique({
        where: { id: userTokenPayload.userId },
      });
      if (
        user &&
        user.allowedLocationIds &&
        user.allowedLocationIds.length > 0
      ) {
        where.locationId = { in: user.allowedLocationIds };
      }

      if (user && user.allowedServiceIds && user.allowedServiceIds.length > 0) {
        where.serviceId = { in: user.allowedServiceIds };
      }
    }
    if (scope === 'today') {
      const tz = tzParam || 'UTC';
      const zonedNow = toZonedTime(new Date(), tz);
      zonedNow.setHours(0, 0, 0, 0);
      const start = fromZonedTime(zonedNow, tz);

      const zonedEnd = toZonedTime(new Date(), tz);
      zonedEnd.setHours(23, 59, 59, 999);
      const end = fromZonedTime(zonedEnd, tz);

      where.createdAt = { gte: start, lte: end };
    } else if (scope === 'history') {
      where.currentState = { in: ['COMPLETED', 'NO_SHOW', 'CANCELLED'] };
      if (startDate && endDate) {
        where.createdAt = { gte: new Date(startDate), lte: new Date(endDate) };
      } else if (startDate) {
        where.createdAt = { gte: new Date(startDate) };
      } else {
        // default history scope logic if no custom dates?
      }
    }`;

// Wait, the original method target is:
/*
  async findAll(
    userTokenPayload: any,
    scope?: 'today' | 'history',
    locationId?: string,
    queueId?: string,
    tzParam?: string,
  ) {
    const where: any = { tenantId: userTokenPayload.tenantId };
    if (locationId) {
      where.locationId = locationId;
    }
...
*/

// Let's do a more precise string replacement.
