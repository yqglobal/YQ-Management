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

    const tokens = await this.prisma.token.findMany({
      where: {
        queue: { tenantId },
        joinedAt: { gte: startDate },
      },
      select: {
        status: true,
        joinedAt: true,
        servedAt: true,
        completedAt: true,
        rating: true,
        operator: {
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

    const operatorStats = new Map<
      string,
      { email: string; name: string; served: number; serviceTimeMs: number }
    >();

    tokens.forEach((t) => {
      if (t.status === 'COMPLETED') totalCompleted++;
      if (t.status === 'MISSED') totalMissed++;

      if (t.servedAt && t.status !== 'MISSED') {
        totalServed++;
        totalWaitTimeMs += t.servedAt.getTime() - t.joinedAt.getTime();
        waitTimeCount++;

        if (t.completedAt) {
          totalServiceTimeMs += t.completedAt.getTime() - t.servedAt.getTime();
          serviceTimeCount++;
        }
      }

      if (t.rating) {
        totalRating += t.rating;
        ratingCount++;
      }

      if (t.operator && t.status === 'COMPLETED' && t.servedAt && t.completedAt) {
        const opId = t.operator.id;
        const opEmail = t.operator.email;
        const settings: any = t.operator.personalSettings || {};
        const opName = settings.firstName
          ? `${settings.firstName} ${settings.lastName || ''}`.trim()
          : opEmail.split('@')[0];

        if (!operatorStats.has(opId)) {
          operatorStats.set(opId, { email: opEmail, name: opName, served: 0, serviceTimeMs: 0 });
        }
        const stats = operatorStats.get(opId)!;
        stats.served++;
        stats.serviceTimeMs += t.completedAt.getTime() - t.servedAt.getTime();
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

      tokens.forEach((t) => {
        const h = t.joinedAt.getHours();
        if (hourlyDataMap.has(h)) {
          const entry = hourlyDataMap.get(h)!;
          entry.volume++;
          if (t.servedAt) {
            entry.waitTimeSum +=
              (t.servedAt.getTime() - t.joinedAt.getTime()) / 60000;
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

      tokens.forEach((t) => {
        const key = t.joinedAt.toISOString().split('T')[0];
        if (dailyDataMap.has(key)) {
          const entry = dailyDataMap.get(key)!;
          entry.volume++;
          if (t.servedAt) {
            entry.waitTimeSum +=
              (t.servedAt.getTime() - t.joinedAt.getTime()) / 60000;
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

    return {
      kpis: {
        totalServed,
        averageWaitTimeMins,
        averageServiceTimeMins,
        dropOffRate,
        csatScore,
      },
      chartData,
      staffPerformance,
    };
  }
}
