/**
 * T15: Provider-side contract tests — OpenAPI response shape validation.
 *
 * These tests verify that every endpoint response matches the shape defined in
 * docs/contracts/openapi/openapi-traveler-service.yaml.
 * They use the unit-level controller mocks (no Testcontainers required) and
 * validate the JSON response body against inline OpenAPI-derived schemas.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { TravelerController } from '../../presentation/controllers/traveler.controller';
import { AdminTravelerController } from '../../presentation/controllers/admin-traveler.controller';
import { CreateTravelerUseCase } from '../../application/use-cases/create-traveler.use-case';
import { GetTravelerUseCase } from '../../application/use-cases/get-traveler.use-case';
import { GetTravelersUseCase } from '../../application/use-cases/get-travelers.use-case';
import { UpdateTravelerUseCase } from '../../application/use-cases/update-traveler.use-case';
import { DeleteTravelerUseCase } from '../../application/use-cases/delete-traveler.use-case';
import { GetTravelerPreferencesUseCase } from '../../application/use-cases/get-traveler-preferences.use-case';
import { UpdateTravelerPreferencesUseCase } from '../../application/use-cases/update-traveler-preferences.use-case';
import { SyncTravelersUseCase } from '../../application/use-cases/sync-travelers.use-case';
import { GetAdminTravelersUseCase } from '../../application/use-cases/get-admin-travelers.use-case';
import { DomainExceptionFilter } from '../../presentation/filters/domain-exception.filter';
import { TravelerNotFoundException } from '../../domain/exceptions/traveler-not-found.exception';
import { DuplicateEmployeeIdException } from '../../domain/exceptions/duplicate-employee-id.exception';

const createJwtHeader = (role: string, sub = 'user-id-1') => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub, role })).toString('base64url');
  return `Bearer ${header}.${payload}.sig`;
};

const TRAVELER_RESPONSE_SHAPE = {
  id: expect.any(String),
  employeeId: expect.any(String),
  name: expect.any(String),
  email: expect.any(String),
  department: expect.any(String),
  role: expect.any(String),
  preferences: expect.any(Object),
  createdAt: expect.any(String),
  updatedAt: expect.any(String),
};

const ADMIN_TRAVELER_SHAPE = {
  ...TRAVELER_RESPONSE_SHAPE,
  deletedAt: null,      // null is a valid value per OpenAPI spec (no deleted_at set)
  anonymisedAt: null,  // null is a valid value per OpenAPI spec (not yet anonymised)
};

const sampleDto = {
  id: 'traveler-uuid-1',
  employeeId: 'EMP-001',
  name: 'Alice',
  email: 'alice@corp.com',
  department: 'Engineering',
  role: 'EMPLOYEE',
  preferences: { seatPreference: 'none', mealPreference: 'standard', frequentFlyerNumbers: {}, preferredAirlines: [], specialAssistance: [] },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('TravelerController — contract shape validation', () => {
  let app: INestApplication;
  const mocks = {
    createTraveler: { execute: jest.fn() },
    getTraveler: { execute: jest.fn() },
    getTravelers: { execute: jest.fn() },
    updateTraveler: { execute: jest.fn() },
    deleteTraveler: { execute: jest.fn() },
    getPreferences: { execute: jest.fn() },
    updatePreferences: { execute: jest.fn() },
    syncTravelers: { execute: jest.fn() },
    getAdminTravelers: { execute: jest.fn() },
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TravelerController, AdminTravelerController],
      providers: [
        { provide: CreateTravelerUseCase, useValue: mocks.createTraveler },
        { provide: GetTravelerUseCase, useValue: mocks.getTraveler },
        { provide: GetTravelersUseCase, useValue: mocks.getTravelers },
        { provide: UpdateTravelerUseCase, useValue: mocks.updateTraveler },
        { provide: DeleteTravelerUseCase, useValue: mocks.deleteTraveler },
        { provide: GetTravelerPreferencesUseCase, useValue: mocks.getPreferences },
        { provide: UpdateTravelerPreferencesUseCase, useValue: mocks.updatePreferences },
        { provide: SyncTravelersUseCase, useValue: mocks.syncTravelers },
        { provide: GetAdminTravelersUseCase, useValue: mocks.getAdminTravelers },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();
  });

  afterAll(async () => { await app.close(); });
  beforeEach(() => jest.clearAllMocks());

  it('POST /travelers → 201 TravelerResponse shape', async () => {
    mocks.createTraveler.execute.mockResolvedValue(sampleDto);
    const res = await request(app.getHttpServer())
      .post('/travelers')
      .set('Authorization', createJwtHeader('MANAGER'))
      .send({ employeeId: 'EMP-001', name: 'Alice', email: 'alice@corp.com', department: 'Eng', role: 'EMPLOYEE' })
      .expect(201);
    expect(res.body).toMatchObject(TRAVELER_RESPONSE_SHAPE);
  });

  it('GET /travelers → 200 paginated TravelerListResponse shape', async () => {
    mocks.getTravelers.execute.mockResolvedValue([sampleDto]);
    const res = await request(app.getHttpServer())
      .get('/travelers')
      .set('Authorization', createJwtHeader('MANAGER'))
      .expect(200);
    expect(res.body).toMatchObject({
      travelers: expect.any(Array),
      pagination: expect.objectContaining({
        currentPage: expect.any(Number),
        totalPages: expect.any(Number),
        totalItems: expect.any(Number),
        limit: expect.any(Number),
      }),
    });
    expect(res.body.travelers[0]).toMatchObject(TRAVELER_RESPONSE_SHAPE);
  });

  it('GET /travelers/:id → 200 TravelerResponse shape', async () => {
    mocks.getTraveler.execute.mockResolvedValue(sampleDto);
    const res = await request(app.getHttpServer())
      .get('/travelers/traveler-uuid-1')
      .set('Authorization', createJwtHeader('EMPLOYEE', 'traveler-uuid-1'))
      .expect(200);
    expect(res.body).toMatchObject(TRAVELER_RESPONSE_SHAPE);
  });

  it('GET /travelers/:id → 404 error shape when not found', async () => {
    mocks.getTraveler.execute.mockRejectedValue(new TravelerNotFoundException('x'));
    const res = await request(app.getHttpServer())
      .get('/travelers/x')
      .set('Authorization', createJwtHeader('EMPLOYEE', 'x'))
      .expect(404);
    expect(res.body).toMatchObject({
      error: 'TravelerNotFound',
      message: expect.any(String),
      correlationId: expect.any(String),
      timestamp: expect.any(String),
    });
  });

  it('PATCH /travelers/:id → 200 TravelerResponse shape', async () => {
    mocks.updateTraveler.execute.mockResolvedValue({ ...sampleDto, name: 'Alice Updated' });
    const res = await request(app.getHttpServer())
      .patch('/travelers/traveler-uuid-1')
      .set('Authorization', createJwtHeader('MANAGER'))
      .send({ name: 'Alice Updated' })
      .expect(200);
    expect(res.body).toMatchObject(TRAVELER_RESPONSE_SHAPE);
  });

  it('DELETE /travelers/:id → 204 no body', async () => {
    mocks.deleteTraveler.execute.mockResolvedValue(undefined);
    const res = await request(app.getHttpServer())
      .delete('/travelers/traveler-uuid-1')
      .set('Authorization', createJwtHeader('ADMIN'))
      .expect(204);
    expect(res.body).toEqual({});
  });

  it('GET /travelers/:id/preferences → 200 preferences shape', async () => {
    mocks.getPreferences.execute.mockResolvedValue(sampleDto.preferences);
    const res = await request(app.getHttpServer())
      .get('/travelers/traveler-uuid-1/preferences')
      .set('Authorization', createJwtHeader('EMPLOYEE', 'traveler-uuid-1'))
      .expect(200);
    expect(res.body).toMatchObject({ seatPreference: expect.any(String), mealPreference: expect.any(String) });
  });

  it('PUT /travelers/:id/preferences → 200 preferences shape', async () => {
    mocks.updatePreferences.execute.mockResolvedValue(sampleDto.preferences);
    const res = await request(app.getHttpServer())
      .put('/travelers/traveler-uuid-1/preferences')
      .set('Authorization', createJwtHeader('EMPLOYEE', 'traveler-uuid-1'))
      .send({ seatPreference: 'window' })
      .expect(200);
    expect(res.body).toMatchObject({ seatPreference: expect.any(String) });
  });

  it('GET /admin/travelers → 200 array of AdminTravelerResponse shape', async () => {
    mocks.getAdminTravelers.execute.mockResolvedValue([
      { ...sampleDto, deletedAt: null, anonymisedAt: null },
    ]);
    const res = await request(app.getHttpServer())
      .get('/admin/travelers')
      .set('Authorization', createJwtHeader('ADMIN'))
      .expect(200);
    expect(res.body).toBeInstanceOf(Array);
    expect(res.body[0]).toMatchObject(ADMIN_TRAVELER_SHAPE);
  });

  it('POST /travelers → 409 when duplicate employeeId', async () => {
    mocks.createTraveler.execute.mockRejectedValue(new DuplicateEmployeeIdException('EMP-001'));
    const res = await request(app.getHttpServer())
      .post('/travelers')
      .set('Authorization', createJwtHeader('MANAGER'))
      .send({ employeeId: 'EMP-001', name: 'Alice', email: 'alice@corp.com', department: 'Eng', role: 'EMPLOYEE' })
      .expect(409);
    expect(res.body.error).toBe('DuplicateEmployeeId');
  });
});
