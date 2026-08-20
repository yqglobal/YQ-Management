import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardAnalytics(tenantId: string, timeframe: string = 'today') {
    // 1. Calculate Date Range
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    if (timeframe === '7d') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (timeframe === '30d') {
      startDate.setDate(startDate.getDate() - 30);
    }

    const tokens = await this.prisma.visit.findMany({
      where: {
        tenantId,
        createdAt: { gte: startDate },
      },
      select: {
        currentState: true,
        createdAt: true,
        serviceStart: true,
        completedAt: true,
        rating: true,
        service: { select: { id: true, name: true } },
        queue: { select: { id: true, name: true } },
        operatorUser: {
          select: { id: true, email: true, personalSettings: true },
        },
      },
    });

    let totalServed = 0;
    let totalMissed = 0;
    let totalCompleted = 0;

    let totalWaitTimeMs = 0;
    let waitTimeCount = 0;

    let totalServiceTimeMs = 0;
    let serviceTimeCount = 0;

    let totalRating = 0;
    let ratingCount = 0;

    let slaViolations = 0;
    const SLA_THRESHOLD_MINS = 15;

    const svcMap = new Map<string, { id: string; name: string; totalWaitMs: number; count: number; violations: number; walkaways: number; queues: Map<string, { name: string; totalWaitMs: number; count: number; violations: number; walkaways: number }> }>();

    const operatorStats = new Map<
      string,
      { email: string; name: string; served: number; serviceTimeMs: number }
    >();

    tokens.forEach((t: any) => {
      let isWalkaway = ['NO_SHOW', 'CANCELLED', 'MISSED'].includes(t.currentState);

      if (t.currentState === 'COMPLETED') totalCompleted++;
      if (isWalkaway) totalMissed++;

      let waitMs = 0;
      let hasWait = false;
      if (t.serviceStart && t.createdAt) {
        waitMs = t.serviceStart.getTime() - t.createdAt.getTime();
        hasWait = true;
      }

      if (hasWait && t.currentState !== 'MISSED' && t.currentState !== 'CANCELLED' && t.currentState !== 'NO_SHOW') {
        totalServed++;
        totalWaitTimeMs += waitMs;
        waitTimeCount++;

        if (waitMs > SLA_THRESHOLD_MINS * 60000) {
          slaViolations++;
        }

        if (t.completedAt) {
          totalServiceTimeMs += t.completedAt.getTime() - t.serviceStart.getTime();
          serviceTimeCount++;
        }
      }

      if (t.rating) {
        totalRating += t.rating;
        ratingCount++;
      }

      // Populate Service and Queue metrics
      if (t.service) {
        if (!svcMap.has(t.service.id)) {
          svcMap.set(t.service.id, { id: t.service.id, name: t.service.name, totalWaitMs: 0, count: 0, violations: 0, walkaways: 0, queues: new Map() });
        }
        const svcEntry = svcMap.get(t.service.id)!;
        svcEntry.count++;
        if (hasWait) svcEntry.totalWaitMs += waitMs;
        if (hasWait && waitMs > SLA_THRESHOLD_MINS * 60000) svcEntry.violations++;
        if (isWalkaway) svcEntry.walkaways++;

        if (t.queue) {
          if (!svcEntry.queues.has(t.queue.id)) {
            svcEntry.queues.set(t.queue.id, { name: t.queue.name, totalWaitMs: 0, count: 0, violations: 0, walkaways: 0 });
          }
          const qEntry = svcEntry.queues.get(t.queue.id)!;
          qEntry.count++;
          if (hasWait) qEntry.totalWaitMs += waitMs;
          if (hasWait && waitMs > SLA_THRESHOLD_MINS * 60000) qEntry.violations++;
          if (isWalkaway) qEntry.walkaways++;
        }
      }

      if (t.operatorUser && t.currentState === 'COMPLETED' && t.serviceStart && t.completedAt) {
        const opId = t.operatorUser.id;
        const opEmail = t.operatorUser.email;
        const settings: any = t.operatorUser.personalSettings || {};
        const opName = settings.firstName
          ? `${settings.firstName} ${settings.lastName || ''}`.trim()
          : opEmail.split('@')[0];

        if (!operatorStats.has(opId)) {
          operatorStats.set(opId, { email: opEmail, name: opName, served: 0, serviceTimeMs: 0 });
        }
        const stats = operatorStats.get(opId)!;
        stats.served++;
        stats.serviceTimeMs += t.completedAt.getTime() - t.serviceStart.getTime();
      }
    });

    const averageWaitTimeMins =
      waitTimeCount > 0
        ? Math.floor(totalWaitTimeMs / waitTimeCount / 60000)
        : 0;
    const averageServiceTimeMins =
      serviceTimeCount > 0
        ? Math.floor(totalServiceTimeMs / serviceTimeCount / 60000)
        : 0;
    const csatScore =
      ratingCount > 0 ? Number((totalRating / ratingCount).toFixed(1)) : 0;

    const dropOffRate =
      totalCompleted + totalMissed > 0
        ? Math.round((totalMissed / (totalCompleted + totalMissed)) * 100)
        : 0;

    // 2. Chart Data - if timeframe is today, show hourly. If 7d or 30d, show daily.
    let chartData = [];

    if (timeframe === 'today') {
      const hourlyDataMap = new Map<
        number,
        {
          timeLabel: string;
          volume: number;
          waitTimeSum: number;
          waitCount: number;
        }
      >();
      for (let i = 8; i <= 20; i++) {
        hourlyDataMap.set(i, {
          timeLabel: `${i}:00`,
          volume: 0,
          waitTimeSum: 0,
          waitCount: 0,
        });
      }

      tokens.forEach((t: any) => {
        const h = t.createdAt.getHours();
        if (hourlyDataMap.has(h)) {
          const entry = hourlyDataMap.get(h)!;
          entry.volume++;
          if (t.serviceStart) {
            entry.waitTimeSum +=
              (t.serviceStart.getTime() - t.createdAt.getTime()) / 60000;
            entry.waitCount++;
          }
        }
      });

      chartData = Array.from(hourlyDataMap.values()).map((d) => ({
        timeLabel: d.timeLabel,
        volume: d.volume,
        avgWaitTime:
          d.waitCount > 0 ? Math.floor(d.waitTimeSum / d.waitCount) : 0,
      }));
    } else {
      // Group by day for 7d/30d
      const dailyDataMap = new Map<
        string,
        {
          timeLabel: string;
          volume: number;
          waitTimeSum: number;
          waitCount: number;
        }
      >();

      // Initialize days
      const daysCount = timeframe === '7d' ? 7 : 30;
      for (let i = daysCount - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0]; // YYYY-MM-DD
        dailyDataMap.set(key, {
          timeLabel: key,
          volume: 0,
          waitTimeSum: 0,
          waitCount: 0,
        });
      }

      tokens.forEach((t: any) => {
        const key = t.createdAt.toISOString().split('T')[0];
        if (dailyDataMap.has(key)) {
          const entry = dailyDataMap.get(key)!;
          entry.volume++;
          if (t.serviceStart) {
            entry.waitTimeSum +=
              (t.serviceStart.getTime() - t.createdAt.getTime()) / 60000;
            entry.waitCount++;
          }
        }
      });

      chartData = Array.from(dailyDataMap.values()).map((d) => ({
        timeLabel: d.timeLabel,
        volume: d.volume,
        avgWaitTime:
          d.waitCount > 0 ? Math.floor(d.waitTimeSum / d.waitCount) : 0,
      }));
    }

    const staffPerformance = Array.from(operatorStats.values()).map((op) => ({
      name: op.name,
      email: op.email,
      served: op.served,
      avgServiceTimeMins:
        op.served > 0 ? Math.floor(op.serviceTimeMs / op.served / 60000) : 0,
    }));
    // Sort leaderboard by most served
    staffPerformance.sort((a, b) => b.served - a.served);

    const servicePerformance = Array.from(svcMap.values()).map(s => ({
      ...s,
      avgMins: s.count > 0 && s.totalWaitMs > 0 ? Math.round(s.totalWaitMs / s.count / 60000) : null,
      queues: Array.from(s.queues.values()).map(q => ({
        ...q,
        avgMins: q.count > 0 && q.totalWaitMs > 0 ? Math.round(q.totalWaitMs / q.count / 60000) : null,
      }))
    }));

    return {
      kpis: {
        totalVisits: tokens.length,
        totalServed,
        averageWaitTimeMins,
        averageServiceTimeMins,
        dropOffRate,
        csatScore,
        slaViolations,
      },
      chartData,
      staffPerformance,
      servicePerformance,
    };
  }
}
