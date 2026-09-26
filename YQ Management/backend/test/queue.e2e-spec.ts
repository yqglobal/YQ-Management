import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('Queue System Concurrency (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let authToken: string;
  let tenantId: string;
  let locationId: string;
  let serviceId: string;
  let queueId: string;
  const numCustomers = 20; // Try 20 simultaneous joins
  const customerIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    jwtService = app.get<JwtService>(JwtService);

    // Setup Test Environment
    const tenant = await prisma.tenant.create({
      data: { name: 'E2E Queue Tenant', subdomain: `queue-tenant-${Date.now()}` },
    });
    tenantId = tenant.id;

    const user = await prisma.user.create({
      data: { email: `queue-user-${Date.now()}@test.com`, password: 'pwd', tenantId, role: 'ADMIN' },
    });

    authToken = jwtService.sign({ sub: user.id, email: user.email, role: user.role, tenantId: user.tenantId });

    const location = await prisma.location.create({
      data: { name: 'Queue HQ', tenantId },
    });
    locationId = location.id;

    const service = await prisma.service.create({
      data: { name: 'Fast Service', tenantId, locationId },
    });
    serviceId = service.id;

    // The service creation might auto-create a queue, let's fetch it or create one
    let queue = await prisma.queue.findFirst({ where: { tenantId } });
    if (!queue) {
      queue = await prisma.queue.create({
        data: { tenantId, name: 'Main Queue', locationId, status: 'ACTIVE' },
      });
    }
    queueId = queue.id;

    // Link service to queue if not linked
    

    // Create a flow for this service so that walk-ins succeed
    const flow = await prisma.serviceFlow.create({
      data: { tenantId, serviceId, name: 'Default', isActive: true },
    });
    await prisma.flowStepTemplate.create({
      data: { flowId: flow.id, stepOrder: 1, name: 'Service', type: 'SERVICE', trigger: 'MANUAL_STAFF' },
    });

    for (let i = 0; i < numCustomers; i++) {
      const c = await prisma.customer.create({
        data: { name: `Cust ${i}`, tenantId },
      });
      customerIds.push(c.id);
    }
  });

  afterAll(async () => {
    // Cleanup
    await prisma.visitStepEvent.deleteMany({ where: { tenantId } });
    await prisma.visitStep.deleteMany({ where: { tenantId } });
    await prisma.visit.deleteMany({ where: { tenantId } });
        await prisma.queue.deleteMany({ where: { tenantId } });
        await prisma.serviceFlow.deleteMany({ where: { tenantId } });
    await prisma.customer.deleteMany({ where: { tenantId } });
    await prisma.service.deleteMany({ where: { tenantId } });
    await prisma.location.deleteMany({ where: { tenantId } });
    await prisma.user.deleteMany({ where: { tenantId } });
    await prisma.tenant.delete({ where: { id: tenantId } });
    await app.close();
  });

  it('1. Can handle highly concurrent queue joins without duplicating order numbers', async () => {
    // Fire all requests concurrently
    const promises = customerIds.map((cid) =>
      request(app.getHttpServer())
        .post('/visits')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerId: cid,
          locationId,
          serviceId,
          source: 'WALK_IN',
          currentState: 'CHECKED_IN',
        })
    );

    const responses = await Promise.all(promises);
    
    responses.forEach(res => {
      expect(res.status).toBe(201);
    });

    // Check database to ensure strict sequential ordering in the queue
    const visits = await prisma.visit.findMany({
      where: { tenantId, queueId },
      orderBy: { createdAt: 'asc' },
    });

    expect(visits.length).toBe(numCustomers);

    // Positions should be uniquely sequential
    const displayIds = visits.map(v => v.displayId);
    const uniqueIds = new Set(displayIds);
    expect(uniqueIds.size).toBe(numCustomers);
  });
});
