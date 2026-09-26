import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('Service Flow Engine (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let authToken: string;
  let tenantId: string;
  let customerId: string;
  let locationId: string;
  let serviceId: string;
  let flowId: string;
  let firstStepTemplateId: string;
  let secondStepTemplateId: string;
  let visitId: string;
  let visitSteps: any[];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    jwtService = app.get<JwtService>(JwtService);

    // 1. Setup Test Tenant and User
    const tenant = await prisma.tenant.create({
      data: {
        name: 'E2E Flow Tenant',
        subdomain: `flow-tenant-${Date.now()}`,
      },
    });
    tenantId = tenant.id;

    const user = await prisma.user.create({
      data: {
        email: `flow-user-${Date.now()}@test.com`,
        password: 'hashed',
        role: 'ADMIN',
        tenantId,
      },
    });

    authToken = jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    });

    const location = await prisma.location.create({
      data: { name: 'HQ', tenantId },
    });
    locationId = location.id;

    const service = await prisma.service.create({
      data: { name: 'Complex Flow Service', tenantId, locationId },
    });
    serviceId = service.id;

    const customer = await prisma.customer.create({
      data: { name: 'Jane Doe', tenantId },
    });
    customerId = customer.id;

    // 2. Setup Service Flow and Steps directly in DB
    const flow = await prisma.serviceFlow.create({
      data: {
        serviceId,
        name: 'Check In and Serve',
        isActive: true,
        tenantId,
      },
    });
    flowId = flow.id;

    const step1 = await prisma.flowStepTemplate.create({
      data: {
        flowId,
        stepOrder: 1,
        name: 'Arrival Checkpoint',
        type: 'CHECKPOINT',
        trigger: 'MANUAL_STAFF',
      },
    });
    firstStepTemplateId = step1.id;

    const step2 = await prisma.flowStepTemplate.create({
      data: {
        flowId,
        stepOrder: 2,
        name: 'Consultation',
        type: 'SERVICE',
        trigger: 'MANUAL_STAFF',
      },
    });
    secondStepTemplateId = step2.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.visitStepEvent.deleteMany({ where: { tenantId } });
    await prisma.visitStep.deleteMany({ where: { tenantId } });
    await prisma.visit.deleteMany({ where: { tenantId } });
        await prisma.serviceFlow.deleteMany({ where: { tenantId } });
    await prisma.customer.deleteMany({ where: { tenantId } });
    await prisma.service.deleteMany({ where: { tenantId } });
    await prisma.location.deleteMany({ where: { tenantId } });
    await prisma.user.deleteMany({ where: { tenantId } });
    await prisma.tenant.delete({ where: { id: tenantId } });
    await app.close();
  });

  it('1. Create Visit triggers instantiation of VisitSteps', async () => {
    const res = await request(app.getHttpServer())
      .post('/visits')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customerId,
        locationId,
        serviceId,
        source: 'WALK_IN',
        currentState: 'CHECKED_IN',
      })
      .expect(201);

    visitId = res.body.id;
    expect(visitId).toBeDefined();

    // Verify Steps were created via DB directly, or API if exists. Let's use DB to verify.
    visitSteps = await prisma.visitStep.findMany({
      where: { visitId },
      orderBy: { stepOrder: 'asc' },
    });

    expect(visitSteps.length).toBe(2);
    expect(visitSteps[0].status).toBe('PENDING'); // Step 1 is unlocked
    expect(visitSteps[1].status).toBe('LOCKED');  // Step 2 is waiting on step 1
  });

  it('2. Activate and Advance Step 1 unlocks Step 2', async () => {
    // First, activate Step 1
    await request(app.getHttpServer())
      .post(`/visit-steps/${visitSteps[0].id}/activate`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(201);

    // Verify status is ACTIVE
    let step1 = await prisma.visitStep.findUnique({ where: { id: visitSteps[0].id } });
    expect(step1?.status).toBe('ACTIVE');

    // Advance Step 1
    await request(app.getHttpServer())
      .post(`/visit-steps/${visitSteps[0].id}/advance`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'DONE' })
      .expect(201);

    // Verify Step 1 is DONE and Step 2 is PENDING
    step1 = await prisma.visitStep.findUnique({ where: { id: visitSteps[0].id } });
    const step2 = await prisma.visitStep.findUnique({ where: { id: visitSteps[1].id } });
    
    expect(step1?.status).toBe('DONE');
    expect(step2?.status).toBe('PENDING');
  });
});
