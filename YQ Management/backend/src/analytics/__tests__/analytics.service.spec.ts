import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from '../analytics.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      tenant: {
        findUnique: jest.fn().mockResolvedValue({
          createdAt: new Date('2026-10-01T00:00:00Z'),
        }),
      },
      visit: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      service: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      $queryRaw: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should handle BigInt raw values without throwing "Cannot mix BigInt and other types"', async () => {
    // Simulate PrismaPg returning BigInt for PostgreSQL integer aggregates
    mockPrisma.$queryRaw.mockResolvedValue([
      {
        total_visits: 12n,
        total_completed: 7n,
        total_missed: 5n,
        total_cancelled: 1n,
        total_no_show: 4n,
        total_wait_time_secs: 30431.444,
        wait_time_count: 6n,
        sla_violations: 6n,
        total_service_time_secs: 28165.678,
        service_time_count: 7n,
        total_rating: 5n,
        rating_count: 1n,
      },
    ]);

    const result = await service.getDashboardAnalytics(
      'tenant-123',
      '7d',
      'Asia/Calcutta',
    );

    expect(result).toBeDefined();
    expect(result.kpis).toEqual({
      totalVisits: 12,
      totalServed: 6,
      totalCompleted: 7,
      totalCancelled: 1,
      totalNoShow: 4,
      averageWaitTimeMins: 84,
      averageServiceTimeMins: 67,
      dropOffRate: 42,
      csatScore: 5,
      slaViolations: 6,
    });
  });

  it('should safely handle empty query results', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([]);

    const result = await service.getDashboardAnalytics(
      'tenant-123',
      'today',
      'UTC',
    );

    expect(result).toBeDefined();
    expect(result.kpis).toEqual({
      totalVisits: 0,
      totalServed: 0,
      totalCompleted: 0,
      totalCancelled: 0,
      totalNoShow: 0,
      averageWaitTimeMins: 0,
      averageServiceTimeMins: 0,
      dropOffRate: 0,
      csatScore: 0,
      slaViolations: 0,
    });
  });

  it('should correctly format CSV export', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([
      {
        total_visits: 10,
        total_completed: 8,
        total_missed: 2,
        total_cancelled: 1,
        total_no_show: 1,
        total_wait_time_secs: 600,
        wait_time_count: 8,
        sla_violations: 0,
        total_service_time_secs: 1200,
        service_time_count: 8,
        total_rating: 40,
        rating_count: 8,
      },
    ]);

    const csv = await service.exportAnalyticsCSV('tenant-123', 'today', 'UTC');
    expect(csv).toContain('Qmova Analytics Export');
    expect(csv).toContain('Total Visits,10');
    expect(csv).toContain('Total Completed,8');
  });

  it('should handle custom date range and single-day custom queries', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([]);

    // Single-day custom query
    const singleDay = await service.getDashboardAnalytics(
      'tenant-123',
      'custom',
      'Asia/Calcutta',
      '2026-10-24T00:00:00.000Z',
      '2026-10-24T00:00:00.000Z',
    );
    expect(singleDay).toBeDefined();
    // Hourly breakdown for single day (8 to 20 = 13 hours)
    expect(singleDay.chartData.length).toBe(13);
    expect(singleDay.chartData[0].timeLabel).toBe('8:00');

    // Multi-day custom query (5 days: Oct 20 to Oct 24)
    const multiDay = await service.getDashboardAnalytics(
      'tenant-123',
      'custom',
      'Asia/Calcutta',
      '2026-10-20T00:00:00.000Z',
      '2026-10-24T00:00:00.000Z',
    );
    expect(multiDay).toBeDefined();
    expect(multiDay.chartData.length).toBe(5);
    expect(multiDay.chartData[0].timeLabel).toBe('Oct 20');
    expect(multiDay.chartData[4].timeLabel).toBe('Oct 24');
  });

  it('should support "year" timeframe aggregating into 12 monthly data points', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([]);

    const yearResult = await service.getDashboardAnalytics(
      'tenant-123',
      'year',
      'UTC',
    );

    expect(yearResult).toBeDefined();
    expect(yearResult.chartData.length).toBe(12);
    // Ensure monthly label format like "MMM yyyy"
    expect(yearResult.chartData[0].timeLabel).toMatch(/^[A-Z][a-z]{2} \d{4}$/);
    expect(yearResult.chartData[11].timeLabel).toMatch(/^[A-Z][a-z]{2} \d{4}$/);
  });

  it('should base "all" timeframe range on user account creation date instead of year 2020', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([]);
    // Account created 4 days ago
    const fourDaysAgo = new Date();
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 3);

    mockPrisma.tenant.findUnique.mockResolvedValue({
      createdAt: fourDaysAgo,
    });

    const result = await service.getDashboardAnalytics(
      'tenant-123',
      'all',
      'UTC',
    );

    expect(result).toBeDefined();
    // 4 days total from 3 days ago up to today
    expect(result.chartData.length).toBe(4);
    expect(mockPrisma.tenant.findUnique).toHaveBeenCalledWith({
      where: { id: 'tenant-123' },
      select: { createdAt: true },
    });
  });

  it('should extract and sort customer reviews when visits have ratings', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([]);
    mockPrisma.visit.findMany.mockResolvedValue([
      {
        id: 'visit-1',
        displayId: 'Q001',
        currentState: 'COMPLETED',
        createdAt: new Date('2026-10-20T10:00:00Z'),
        rating: 5,
        feedbackText: 'Loved the service!',
        customer: { name: 'Alice' },
        service: { name: 'VIP Consultation' },
        queue: { name: 'VIP' },
        operatorUser: { email: 'staff@example.com', personalSettings: { name: 'Sarah' } },
      },
      {
        id: 'visit-2',
        displayId: 'Q002',
        currentState: 'COMPLETED',
        createdAt: new Date('2026-10-21T10:00:00Z'),
        rating: 4,
        feedbackText: null,
        customer: { name: 'Bob' },
        service: { name: 'General Service' },
        queue: { name: 'Standard' },
        operatorUser: null,
      },
    ]);

    const result = await service.getDashboardAnalytics('tenant-123', 'all', 'UTC');
    expect(result.customerReviews).toBeDefined();
    expect(result.customerReviews.length).toBe(2);
    // Most recent first (visit-2 on Oct 21 before visit-1 on Oct 20)
    expect(result.customerReviews[0].id).toBe('visit-2');
    expect(result.customerReviews[0].rating).toBe(4);
    expect(result.customerReviews[1].id).toBe('visit-1');
    expect(result.customerReviews[1].feedbackText).toBe('Loved the service!');
    expect(result.customerReviews[1].operatorName).toBe('Sarah');
  });
});
