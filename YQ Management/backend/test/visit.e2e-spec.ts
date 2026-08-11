import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('VisitController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let authToken: string;
  let tenantId: string;
  let customerId: string;
  let locationId: string;
  let serviceId: string;
  let createdVisitId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    jwtService = app.get<JwtService>(JwtService);

    // Create a mock tenant and user for e2e tests
    const tenant = await prisma.tenant.create({
      data: {
        name: 'E2E Test Tenant',
        subdomain: `e2e-visit-${Date.now()}`,
      },
    });
    tenantId = tenant.id;

    const user = await prisma.user.create({
      data: {
        email: `test-visit-${Date.now()}@test.com`,
        password: 'hashed-pass',
        tenantId,
        role: 'ADMIN',
      },
    });

    const location = await prisma.location.create({
      data: {
        name: 'E2E Location',
        address: '123 E2E St',
        tenantId,
      },
    });
    locationId = location.id;

    const service = await prisma.service.create({
      data: {
        name: 'E2E Service',
        expectedDuration: 30,
        tenantId,
      },
    });
    serviceId = service.id;

    const customer = await prisma.customer.create({
      data: {
        name: 'John Doe',
        phone: '1234567890',
        tenantId,
      },
    });
    customerId = customer.id;

    authToken = jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.visit.deleteMany({ where: { tenantId } });
    await prisma.customer.deleteMany({ where: { tenantId } });
    await prisma.service.deleteMany({ where: { tenantId } });
    await prisma.location.deleteMany({ where: { tenantId } });
    await prisma.user.deleteMany({ where: { tenantId } });
    await prisma.tenant.delete({ where: { id: tenantId } });
    await app.close();
  });

  it('/visits (POST) - Create a Walk-In', () => {
    return request(app.getHttpServer())
      .post('/visits')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customerId,
        locationId,
        serviceId,
        source: 'WALK_IN',
        currentState: 'CHECKED_IN',
      })
      .expect(201)
      .then((response) => {
        expect(response.body.id).toBeDefined();
        expect(response.body.tenantId).toBe(tenantId);
        expect(response.body.customerId).toBe(customerId);
        createdVisitId = response.body.id;
      });
  });

  it('/visits (GET) - Retrieve Visits', () => {
    return request(app.getHttpServer())
      .get('/visits')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)
      .then((response) => {
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
        expect(response.body[0].id).toBe(createdVisitId);
      });
  });

  it('/visits/:id/start (POST) - Transition to IN_SERVICE', () => {
    return request(app.getHttpServer())
      .post(`/visits/${createdVisitId}/start`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(201)
      .then((response) => {
        expect(response.body.currentState).toBe('IN_SERVICE');
        expect(response.body.serviceStart).toBeDefined();
      });
  });

  it('/visits/:id/start (POST) - Conflict on double start', () => {
    return request(app.getHttpServer())
      .post(`/visits/${createdVisitId}/start`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(409); // ConflictException
  });
});
