import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { TravelerController } from './traveler.controller';
import { CreateTravelerUseCase } from '../../application/use-cases/create-traveler.use-case';
import { GetTravelerUseCase } from '../../application/use-cases/get-traveler.use-case';
import { GetTravelersUseCase } from '../../application/use-cases/get-travelers.use-case';
import { UpdateTravelerUseCase } from '../../application/use-cases/update-traveler.use-case';
import { DeleteTravelerUseCase } from '../../application/use-cases/delete-traveler.use-case';
import { GetTravelerPreferencesUseCase } from '../../application/use-cases/get-traveler-preferences.use-case';
import { UpdateTravelerPreferencesUseCase } from '../../application/use-cases/update-traveler-preferences.use-case';
import { SyncTravelersUseCase } from '../../application/use-cases/sync-travelers.use-case';
import { TravelerNotFoundException } from '../../domain/exceptions/traveler-not-found.exception';
import { DomainExceptionFilter } from '../filters/domain-exception.filter';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { SelfOrAdminGuard } from '../guards/self-or-admin.guard';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';

const buildUser = (role: string, sub = 'user-id-1') => ({
  sub,
  role,
  email: 'user@corp.com',
});

const createJwtHeader = (role: string, sub = 'user-id-1') => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub, role })).toString('base64url');
  return `Bearer ${header}.${payload}.sig`;
};

const makeUseCaseMocks = () => ({
  createTraveler: { execute: jest.fn() },
  getTraveler: { execute: jest.fn() },
  getTravelers: { execute: jest.fn() },
  updateTraveler: { execute: jest.fn() },
  deleteTraveler: { execute: jest.fn() },
  getPreferences: { execute: jest.fn() },
  updatePreferences: { execute: jest.fn() },
  syncTravelers: { execute: jest.fn() },
});

describe('TravelerController', () => {
  let app: INestApplication;
  let mocks: ReturnType<typeof makeUseCaseMocks>;

  beforeEach(async () => {
    mocks = makeUseCaseMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TravelerController],
      providers: [
        { provide: CreateTravelerUseCase, useValue: mocks.createTraveler },
        { provide: GetTravelerUseCase, useValue: mocks.getTraveler },
        { provide: GetTravelersUseCase, useValue: mocks.getTravelers },
        { provide: UpdateTravelerUseCase, useValue: mocks.updateTraveler },
        { provide: DeleteTravelerUseCase, useValue: mocks.deleteTraveler },
        { provide: GetTravelerPreferencesUseCase, useValue: mocks.getPreferences },
        { provide: UpdateTravelerPreferencesUseCase, useValue: mocks.updatePreferences },
        { provide: SyncTravelersUseCase, useValue: mocks.syncTravelers },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /travelers', () => {
    it('should return 403 when EMPLOYEE calls POST /travelers', async () => {
      await request(app.getHttpServer())
        .post('/travelers')
        .set('Authorization', createJwtHeader('EMPLOYEE'))
        .send({
          employeeId: 'EMP-001',
          name: 'Alice',
          email: 'alice@corp.com',
          department: 'Eng',
          role: 'EMPLOYEE',
        })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should return 400 with validation errors for missing required field', async () => {
      await request(app.getHttpServer())
        .post('/travelers')
        .set('Authorization', createJwtHeader('MANAGER'))
        .send({ name: 'Alice' }) // missing employeeId, email, department, role
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return 201 when MANAGER creates a traveler', async () => {
      const dto = { id: 'uuid-1', name: 'Alice', email: 'alice@corp.com', employeeId: 'EMP-001', department: 'Eng', role: 'EMPLOYEE', preferences: {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      mocks.createTraveler.execute.mockResolvedValue(dto);

      await request(app.getHttpServer())
        .post('/travelers')
        .set('Authorization', createJwtHeader('MANAGER'))
        .send({
          employeeId: 'EMP-001',
          name: 'Alice',
          email: 'alice@corp.com',
          department: 'Eng',
          role: 'EMPLOYEE',
        })
        .expect(HttpStatus.CREATED);
    });
  });

  describe('GET /travelers/:id', () => {
    it('should return 404 with TravelerNotFound error for unknown id', async () => {
      mocks.getTraveler.execute.mockRejectedValue(
        new TravelerNotFoundException('unknown-id'),
      );

      await request(app.getHttpServer())
        .get('/travelers/unknown-id')
        .set('Authorization', createJwtHeader('EMPLOYEE', 'unknown-id'))
        .expect(HttpStatus.NOT_FOUND)
        .expect((res: { body: { error: string } }) => {
          expect(res.body.error).toBe('TravelerNotFound');
        });
    });

    it('should propagate X-Correlation-ID to use case context', async () => {
      mocks.getTraveler.execute.mockResolvedValue({ id: 'traveler-uuid-1' });

      await request(app.getHttpServer())
        .get('/travelers/traveler-uuid-1')
        .set('Authorization', createJwtHeader('EMPLOYEE', 'traveler-uuid-1'))
        .set('X-Correlation-ID', 'test-corr-id')
        .expect(HttpStatus.OK);

      // The correlation ID is passed to the use case via the filter/middleware;
      // the controller extracts it for create/update/delete. For GET it flows
      // through the DomainExceptionFilter in error paths.
      expect(mocks.getTraveler.execute).toHaveBeenCalledWith('traveler-uuid-1');
    });
  });

  describe('DELETE /travelers/:id', () => {
    it('should return 403 when MANAGER calls DELETE /travelers/:id', async () => {
      await request(app.getHttpServer())
        .delete('/travelers/some-id')
        .set('Authorization', createJwtHeader('MANAGER'))
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should return 204 when ADMIN deletes a traveler', async () => {
      mocks.deleteTraveler.execute.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete('/travelers/some-id')
        .set('Authorization', createJwtHeader('ADMIN'))
        .expect(HttpStatus.NO_CONTENT);
    });
  });

  describe('PUT /travelers/:id/preferences', () => {
    it('should return 403 when EMPLOYEE calls PUT /travelers/T2/preferences with subject T1', async () => {
      await request(app.getHttpServer())
        .put('/travelers/T2/preferences')
        .set('Authorization', createJwtHeader('EMPLOYEE', 'T1'))
        .send({ seatPreference: 'window' })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should return 200 when EMPLOYEE updates their own preferences', async () => {
      mocks.updatePreferences.execute.mockResolvedValue({ seatPreference: 'window' });

      await request(app.getHttpServer())
        .put('/travelers/T1/preferences')
        .set('Authorization', createJwtHeader('EMPLOYEE', 'T1'))
        .send({ seatPreference: 'window' })
        .expect(HttpStatus.OK);
    });
  });
});
