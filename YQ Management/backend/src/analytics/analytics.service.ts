import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toZonedTime, fromZonedTime, format } from 'date-fns-tz';
import { Prisma } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardAnalytics(
    tenantId: string,
    timeframe: string = 'today',
    tz: string = 'UTC',
    startDateInput?: string,
    endDateInput?: string,
    locationId?: string,
  ) {
    // 1. Calculate Date Range using timezone
    const zonedNow = toZonedTime(new Date(), tz);
    zonedNow.setHours(0, 0, 0, 0);

    let startDate: Date;
    let endDate: Date | undefined = undefined;

    if (startDateInput) {
      const startParsed = new Date(startDateInput);
      const endParsed = new Date(endDateInput || startDateInput);

      const zonedStart = toZonedTime(startParsed, tz);
      zonedStart.setHours(0, 0, 0, 0);
      startDate = fromZonedTime(zonedStart, tz);

      const zonedEnd = toZonedTime(endParsed, tz);
      zonedEnd.setHours(23, 59, 59, 999);
      endDate = fromZonedTime(zonedEnd, tz);
    } else {
      if (timeframe === '7d' || timeframe === 'week') {
        zonedNow.setDate(zonedNow.getDate() - 6);
        startDate = fromZonedTime(zonedNow, tz);
      } else if (timeframe === '30d' || timeframe === 'month') {
        zonedNow.setDate(zonedNow.getDate() - 29);
        startDate = fromZonedTime(zonedNow, tz);
      } else if (timeframe === 'year' || timeframe === '1y') {
        const zonedStartOfYear = toZonedTime(new Date(), tz);
        zonedStartOfYear.setMonth(zonedStartOfYear.getMonth() - 11, 1);
        zonedStartOfYear.setHours(0, 0, 0, 0);
        startDate = fromZonedTime(zonedStartOfYear, tz);
      } else if (timeframe === 'all') {
        const [tenant, earliestVisit] = await Promise.all([
          this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { createdAt: true },
          }),
          this.prisma.visit.findFirst({
            where: { tenantId },
            orderBy: { createdAt: 'asc' },
            select: { createdAt: true },
          }),
        ]);

        let accountCreated = tenant?.createdAt || new Date();
        if (
          earliestVisit?.createdAt &&
          earliestVisit.createdAt < accountCreated
        ) {
          accountCreated = earliestVisit.createdAt;
        }

        const zonedAccountCreated = toZonedTime(accountCreated, tz);
        zonedAccountCreated.setHours(0, 0, 0, 0);
        startDate = fromZonedTime(zonedAccountCreated, tz);
      } else {
        startDate = fromZonedTime(zonedNow, tz);
      }

      if (timeframe === 'today') {
        const zonedEnd = toZonedTime(new Date(), tz);
        zonedEnd.setHours(23, 59, 59, 999);
        endDate = fromZonedTime(zonedEnd, tz);
      }
    }

    const tokens = await this.prisma.visit.findMany({
      where: {
        tenantId,
        ...(locationId && locationId !== 'all' ? { locationId } : {}),
        OR: [
          {
            scheduledTime: endDate
              ? { gte: startDate, lte: endDate }
              : { gte: startDate },
          },
          {
            scheduledTime: null,
            createdAt: endDate
              ? { gte: startDate, lte: endDate }
              : { gte: startDate },
          },
          {
            checkInTime: endDate
              ? { gte: startDate, lte: endDate }
              : { gte: startDate },
          },
          {
            actualArrival: endDate
              ? { gte: startDate, lte: endDate }
              : { gte: startDate },
          },
        ],
        NOT: {
          AND: [
            { currentState: { in: ['SCHEDULED', 'CREATED'] } },
            { scheduledTime: { gt: endDate || new Date() } },
          ],
        },
      },
      select: {
        id: true,
        displayId: true,
        currentState: true,
        createdAt: true,
        scheduledTime: true,
        checkInTime: true,
        actualArrival: true,
        waitingStart: true,
        serviceStart: true,
        completedAt: true,
        rating: true,
        feedbackText: true,
        customer: { select: { id: true, name: true, phone: true } },
        service: { select: { id: true, name: true } },
        queue: { select: { id: true, name: true } },
        operatorUser: {
          select: { id: true, email: true, personalSettings: true },
        },
      },
    });

    const kpiRaw = await this.prisma.$queryRaw<any[]>`
      SELECT 
        COUNT(id)::int as total_visits,
        COUNT(CASE WHEN "currentState" = 'COMPLETED' THEN 1 END)::int as total_completed,
        COUNT(CASE WHEN "currentState" IN ('NO_SHOW', 'CANCELLED', 'MISSED') THEN 1 END)::int as total_missed,
        COUNT(CASE WHEN "currentState" = 'CANCELLED' THEN 1 END)::int as total_cancelled,
        COUNT(CASE WHEN "currentState" = 'NO_SHOW' THEN 1 END)::int as total_no_show,
        COALESCE(SUM(EXTRACT(EPOCH FROM ("serviceStart" - COALESCE("waitingStart", "checkInTime", "createdAt")))), 0)::float as total_wait_time_secs,
        COALESCE(SUM(CASE WHEN "serviceStart" IS NOT NULL AND ("currentState" NOT IN ('NO_SHOW', 'CANCELLED', 'MISSED')) THEN 1 ELSE 0 END), 0)::int as wait_time_count,
        COUNT(CASE WHEN "serviceStart" IS NOT NULL AND ("serviceStart" - COALESCE("waitingStart", "checkInTime", "createdAt")) > INTERVAL '15 minutes' THEN 1 END)::int as sla_violations,
        COALESCE(SUM(EXTRACT(EPOCH FROM ("completedAt" - "serviceStart"))), 0)::float as total_service_time_secs,
        COALESCE(SUM(CASE WHEN "completedAt" IS NOT NULL THEN 1 ELSE 0 END), 0)::int as service_time_count,
        COALESCE(SUM(rating), 0)::float as total_rating,
        COUNT(rating)::int as rating_count
      FROM "Visit"
      WHERE "tenantId" = ${tenantId}
        ${locationId && locationId !== 'all' ? Prisma.sql`AND "locationId" = ${locationId}` : Prisma.empty}
        AND COALESCE("checkInTime", "actualArrival", "serviceStart", "scheduledTime", "createdAt") >= ${startDate}
        ${endDate ? Prisma.sql`AND COALESCE("checkInTime", "actualArrival", "serviceStart", "scheduledTime", "createdAt") <= ${endDate}` : Prisma.empty}
        AND NOT ("currentState" IN ('SCHEDULED', 'CREATED') AND "scheduledTime" > ${endDate || new Date()})
    `;

    const rawStats = kpiRaw[0] || {};
    const totalVisitsCount = Number(rawStats.total_visits ?? 0);
    const totalCompleted = Number(rawStats.total_completed ?? 0);
    const totalMissed = Number(rawStats.total_missed ?? 0);
    const totalCancelled = Number(rawStats.total_cancelled ?? 0);
    const totalNoShow = Number(rawStats.total_no_show ?? 0);
    const totalWaitTimeSecs = Number(rawStats.total_wait_time_secs ?? 0);
    const waitTimeCount = Number(rawStats.wait_time_count ?? 0);
    const slaViolations = Number(rawStats.sla_violations ?? 0);
    const totalServiceTimeSecs = Number(rawStats.total_service_time_secs ?? 0);
    const serviceTimeCount = Number(rawStats.service_time_count ?? 0);
    const totalRating = Number(rawStats.total_rating ?? 0);
    const ratingCount = Number(rawStats.rating_count ?? 0);

    const totalServed = waitTimeCount;
    const averageWaitTimeMins =
      waitTimeCount > 0
        ? Math.floor(totalWaitTimeSecs / waitTimeCount / 60)
        : 0;
    const averageServiceTimeMins =
      serviceTimeCount > 0
        ? Math.floor(totalServiceTimeSecs / serviceTimeCount / 60)
        : 0;
    const csatScore =
      ratingCount > 0
        ? Number((totalRating / ratingCount).toFixed(1))
        : 0;
    const dropOffRate =
      totalCompleted + totalMissed > 0
        ? Math.round((totalMissed / (totalCompleted + totalMissed)) * 100)
        : 0;

    const SLA_THRESHOLD_MINS = 15;

    const svcMap = new Map<
      string,
      {
        id: string;
        name: string;
        totalWaitMs: number;
        count: number;
        violations: number;
        walkaways: number;
        queues: Map<
          string,
          {
            name: string;
            totalWaitMs: number;
            count: number;
            violations: number;
            walkaways: number;
          }
        >;
      }
    >();

    const operatorStats = new Map<
      string,
      {
        email: string;
        name: string;
        served: number;
        serviceTimeMs: number;
        ratingSum: number;
        ratingCount: number;
        noShows: number;
      }
    >();

    // Pre-populate all services and their linked queues so they show up even with 0 visits
    const allServices = await this.prisma.service.findMany({
      where: { tenantId },
      include: { queues: { select: { id: true, name: true } } },
    });

    for (const svc of allServices) {
      const qMap = new Map<
        string,
        {
          name: string;
          totalWaitMs: number;
          count: number;
          violations: number;
          walkaways: number;
        }
      >();
      for (const q of svc.queues) {
        qMap.set(q.id, {
          name: q.name,
          totalWaitMs: 0,
          count: 0,
          violations: 0,
          walkaways: 0,
        });
      }
      svcMap.set(svc.id, {
        id: svc.id,
        name: svc.name,
        totalWaitMs: 0,
        count: 0,
        violations: 0,
        walkaways: 0,
        queues: qMap,
      });
    }

    tokens.forEach((t: any) => {
      const isWalkaway = ['NO_SHOW', 'CANCELLED', 'MISSED'].includes(
        t.currentState,
      );

      let waitMs = 0;
      let hasWait = false;
      if (t.serviceStart && (t.waitingStart || t.createdAt)) {
        waitMs =
          t.serviceStart.getTime() -
          (t.waitingStart?.getTime() || t.createdAt.getTime());
        hasWait = true;
      }

      if (
        hasWait &&
        t.currentState !== 'MISSED' &&
        t.currentState !== 'CANCELLED' &&
        t.currentState !== 'NO_SHOW'
      ) {
        if (t.completedAt) {
        }
      }

      // Populate Service and Queue metrics
      if (t.service) {
        if (!svcMap.has(t.service.id)) {
          svcMap.set(t.service.id, {
            id: t.service.id,
            name: t.service.name,
            totalWaitMs: 0,
            count: 0,
            violations: 0,
            walkaways: 0,
            queues: new Map(),
          });
        }
        const svcEntry = svcMap.get(t.service.id)!;
        svcEntry.count++;
        if (hasWait) svcEntry.totalWaitMs += waitMs;
        if (hasWait && waitMs > SLA_THRESHOLD_MINS * 60000)
          svcEntry.violations++;
        if (isWalkaway) svcEntry.walkaways++;

        if (t.queue) {
          if (!svcEntry.queues.has(t.queue.id)) {
            svcEntry.queues.set(t.queue.id, {
              name: t.queue.name,
              totalWaitMs: 0,
              count: 0,
              violations: 0,
              walkaways: 0,
            });
          }
          const qEntry = svcEntry.queues.get(t.queue.id)!;
          qEntry.count++;
          if (hasWait) qEntry.totalWaitMs += waitMs;
          if (hasWait && waitMs > SLA_THRESHOLD_MINS * 60000)
            qEntry.violations++;
          if (isWalkaway) qEntry.walkaways++;
        }
      }

      if (t.operatorUser && t.serviceStart) {
        const opId = t.operatorUser.id;
        const opEmail = t.operatorUser.email;
        const settings: any = t.operatorUser.personalSettings || {};
        const opName = settings.firstName
          ? `${settings.firstName} ${settings.lastName || ''}`.trim()
          : opEmail.split('@')[0];

        if (!operatorStats.has(opId)) {
          operatorStats.set(opId, {
            email: opEmail,
            name: opName,
            served: 0,
            serviceTimeMs: 0,
            ratingSum: 0,
            ratingCount: 0,
            noShows: 0,
          });
        }

        const stats = operatorStats.get(opId)!;

        if (t.currentState === 'COMPLETED' && t.completedAt) {
          stats.served++;
          stats.serviceTimeMs +=
            t.completedAt.getTime() - t.serviceStart.getTime();
          if (t.rating) {
            stats.ratingSum += t.rating;
            stats.ratingCount++;
          }
        }

        if (isWalkaway) {
          stats.noShows++;
        }
      }
    });

    const getVisitOperationalTime = (t: any): Date => {
      return (
        t.checkInTime ||
        t.actualArrival ||
        t.serviceStart ||
        t.scheduledTime ||
        t.createdAt
      );
    };

    // Compute Heatmap (Day of Week vs Hour)
    // 0 = Sunday, 1 = Monday, ... 6 = Saturday
    const heatmapMatrix = Array(7)
      .fill(0)
      .map(() => Array(24).fill(0));
    tokens.forEach((t: any) => {
      const opTime = getVisitOperationalTime(t);
      const d = toZonedTime(opTime, tz);
      const day = d.getDay();
      const hour = d.getHours();
      heatmapMatrix[day][hour]++;
    });

    const heatmapData = {
      matrix: heatmapMatrix,
      maxValue: Math.max(1, ...heatmapMatrix.flat()),
    };

    // 2. Chart Data - dynamically format based on timeframe:
    // - Today / 1-day custom: Hourly (8:00 - 20:00)
    // - Year / large ranges (> 90 days): Monthly (e.g. "Nov 2025")
    // - Week / Month / <= 90 days: Daily (e.g. "Mon 19" or "Oct 19")
    let chartData = [];
    const endCalcDate = endDate || new Date();
    const diffTime = Math.abs(endCalcDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const isSingleDay =
      timeframe === 'today' || diffTime <= 24 * 60 * 60 * 1000 + 1000;
    const isMonthlyView =
      timeframe === 'year' ||
      timeframe === '1y' ||
      (timeframe === 'all' && diffDays > 90) ||
      (timeframe === 'custom' && diffDays > 90);

    if (isSingleDay) {
      // 1. Hourly Breakdown (8:00 - 20:00)
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
        const opTime = getVisitOperationalTime(t);
        const h = parseInt(format(opTime, 'H', { timeZone: tz }), 10);
        if (hourlyDataMap.has(h)) {
          const entry = hourlyDataMap.get(h)!;
          entry.volume++;
          if (t.serviceStart) {
            entry.waitTimeSum +=
              (t.serviceStart.getTime() -
                (t.waitingStart?.getTime() || opTime.getTime())) /
              60000;
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
    } else if (isMonthlyView) {
      // 2. Monthly Breakdown (MMM yyyy)
      const monthlyDataMap = new Map<
        string,
        {
          timeLabel: string;
          volume: number;
          waitTimeSum: number;
          waitCount: number;
        }
      >();

      const curMonth = toZonedTime(startDate, tz);
      curMonth.setDate(1);
      curMonth.setHours(0, 0, 0, 0);

      const endMonth = toZonedTime(endCalcDate, tz);
      endMonth.setDate(1);
      endMonth.setHours(0, 0, 0, 0);

      while (curMonth <= endMonth) {
        const key = format(curMonth, 'yyyy-MM', { timeZone: tz });
        const label = format(curMonth, 'MMM yyyy', { timeZone: tz });
        monthlyDataMap.set(key, {
          timeLabel: label,
          volume: 0,
          waitTimeSum: 0,
          waitCount: 0,
        });
        curMonth.setMonth(curMonth.getMonth() + 1);
      }

      tokens.forEach((t: any) => {
        const opTime = getVisitOperationalTime(t);
        const key = format(opTime, 'yyyy-MM', { timeZone: tz });
        if (monthlyDataMap.has(key)) {
          const entry = monthlyDataMap.get(key)!;
          entry.volume++;
          if (t.serviceStart) {
            entry.waitTimeSum +=
              (t.serviceStart.getTime() -
                (t.waitingStart?.getTime() || opTime.getTime())) /
              60000;
            entry.waitCount++;
          }
        }
      });

      chartData = Array.from(monthlyDataMap.values()).map((d) => ({
        timeLabel: d.timeLabel,
        volume: d.volume,
        avgWaitTime:
          d.waitCount > 0 ? Math.floor(d.waitTimeSum / d.waitCount) : 0,
      }));
    } else {
      // 3. Daily Breakdown (EEE d for 7d/week, MMM d for 30d/month)
      const dailyDataMap = new Map<
        string,
        {
          timeLabel: string;
          volume: number;
          waitTimeSum: number;
          waitCount: number;
        }
      >();

      const cur = toZonedTime(startDate, tz);
      cur.setHours(0, 0, 0, 0);
      const endZoned = toZonedTime(endCalcDate, tz);
      endZoned.setHours(0, 0, 0, 0);

      const showDayOfWeek = timeframe === '7d' || timeframe === 'week';

      while (cur <= endZoned) {
        const key = format(cur, 'yyyy-MM-dd', { timeZone: tz });
        const label = showDayOfWeek
          ? format(cur, 'EEE d', { timeZone: tz })
          : format(cur, 'MMM d', { timeZone: tz });
        dailyDataMap.set(key, {
          timeLabel: label,
          volume: 0,
          waitTimeSum: 0,
          waitCount: 0,
        });
        cur.setDate(cur.getDate() + 1);
      }

      tokens.forEach((t: any) => {
        const opTime = getVisitOperationalTime(t);
        const key = format(opTime, 'yyyy-MM-dd', { timeZone: tz });
        if (dailyDataMap.has(key)) {
          const entry = dailyDataMap.get(key)!;
          entry.volume++;
          if (t.serviceStart) {
            entry.waitTimeSum +=
              (t.serviceStart.getTime() -
                (t.waitingStart?.getTime() || opTime.getTime())) /
              60000;
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
      noShows: op.noShows,
      csat:
        op.ratingCount > 0
          ? Number((op.ratingSum / op.ratingCount).toFixed(1))
          : 0,
      avgServiceTimeMins:
        op.served > 0 ? Math.floor(op.serviceTimeMs / op.served / 60000) : 0,
    }));
    // Sort leaderboard by most served
    staffPerformance.sort((a, b) => b.served - a.served);

    const servicePerformance = Array.from(svcMap.values()).map((s) => ({
      ...s,
      avgMins:
        s.count > 0 && s.totalWaitMs > 0
          ? Math.round(s.totalWaitMs / s.count / 60000)
          : null,
      queues: Array.from(s.queues.values()).map((q) => ({
        ...q,
        avgMins:
          q.count > 0 && q.totalWaitMs > 0
            ? Math.round(q.totalWaitMs / q.count / 60000)
            : null,
      })),
    }));

    const customerReviews = tokens
      .filter((t: any) => t.rating !== null && t.rating !== undefined)
      .map((t: any) => ({
        id: t.id,
        displayId: t.displayId,
        customerName: t.customer?.name || 'Guest',
        serviceName: t.service?.name || 'General Service',
        queueName: t.queue?.name || 'Queue',
        operatorName:
          t.operatorUser?.personalSettings?.name ||
          t.operatorUser?.email?.split('@')[0] ||
          'Unassigned',
        rating: t.rating,
        feedbackText: t.feedbackText,
        date: t.completedAt || t.createdAt,
      }))
      .sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );

    return {
      kpis: {
        totalVisits: totalVisitsCount,
        totalServed,
        totalCompleted,
        totalCancelled,
        totalNoShow,
        averageWaitTimeMins,
        averageServiceTimeMins,
        dropOffRate,
        csatScore,
        slaViolations,
      },
      chartData,
      heatmapData,
      staffPerformance,
      servicePerformance,
      customerReviews,
    };
  }

  async exportAnalyticsCSV(
    tenantId: string,
    timeframe: string,
    tz: string,
    startDate?: string,
    endDate?: string,
    locationId?: string,
  ) {
    const data = await this.getDashboardAnalytics(
      tenantId,
      timeframe,
      tz,
      startDate,
      endDate,
      locationId,
    );

    // CSV generator
    const lines: string[] = [];
    lines.push('Qmova Analytics Export');
    lines.push(`Timeframe: ${timeframe}`);
    if (locationId && locationId !== 'all') {
      lines.push(`Location ID: ${locationId}`);
    }
    lines.push('');

    lines.push('--- Key Performance Indicators ---');
    lines.push('Metric,Value');
    lines.push(`Total Visits,${data.kpis.totalVisits}`);
    lines.push(`Total Served,${data.kpis.totalServed}`);
    lines.push(`Total Completed,${data.kpis.totalCompleted}`);
    lines.push(`Total Cancelled,${data.kpis.totalCancelled}`);
    lines.push(`Total No-Shows,${data.kpis.totalNoShow}`);
    lines.push(`Average Wait Time (mins),${data.kpis.averageWaitTimeMins}`);
    lines.push(
      `Average Service Time (mins),${data.kpis.averageServiceTimeMins}`,
    );
    lines.push(`Drop-off Rate (%),${data.kpis.dropOffRate}`);
    lines.push(`CSAT Score,${data.kpis.csatScore}`);
    lines.push(`SLA Violations,${data.kpis.slaViolations}`);
    lines.push('');

    lines.push('--- Operator Performance ---');
    lines.push('Name,Served,No-Shows,CSAT,Avg Service Time (mins)');
    data.staffPerformance.forEach((op) => {
      lines.push(
        `"${(op.name || 'Unknown').replace(/"/g, '""')}",${op.served},${op.noShows},${op.csat},${op.avgServiceTimeMins}`,
      );
    });
    lines.push('');

    lines.push('--- Service Performance ---');
    lines.push('Service,Visits,Avg Wait Time (mins)');
    data.servicePerformance.forEach((s: any) => {
      lines.push(
        `"${(s.name || 'Service').replace(/"/g, '""')}",${s.count || 0},${s.avgMins ?? 0}`,
      );
    });
    lines.push('');

    if (data.customerReviews && data.customerReviews.length > 0) {
      lines.push('--- Customer Reviews & Feedback ---');
      lines.push('Date,Ticket,Customer,Service,Operator,Rating,Feedback');
      data.customerReviews.forEach((r: any) => {
        lines.push(
          `"${new Date(r.date).toISOString()}","${r.displayId || ''}","${(r.customerName || '').replace(/"/g, '""')}","${(r.serviceName || '').replace(/"/g, '""')}","${(r.operatorName || '').replace(/"/g, '""')}",${r.rating},"${(r.feedbackText || '').replace(/"/g, '""')}"`,
        );
      });
    }

    return lines.join('\n');
  }
}
