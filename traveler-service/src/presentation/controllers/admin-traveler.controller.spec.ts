import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { AdminTravelerController } from './admin-traveler.controller';
import { GetAdminTravelersUseCase } from '../../application/use-cases/get-admin-travelers.use-case';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';

const createJwtHeader = (role: string, sub = 'user-id-1') => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub, role })).toString('base64url');
  return `Bearer ${header}.${payload}.sig`;
};

describe('AdminTravelerController', () => {
  let app: INestApplication;
  let getAdminTravelers: { execute: jest.Mock };

  beforeEach(async () => {
    getAdminTravelers = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminTravelerController],
      providers: [
        { provide: GetAdminTravelersUseCase, useValue: getAdminTravelers },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should return 200 for GET /admin/travelers with ADMIN role', async () => {
    getAdminTravelers.execute.mockResolvedValue([
      { id: 'id-1', name: 'Alice', deletedAt: null },
      { id: 'id-2', name: 'Bob', deletedAt: '2026-01-01T00:00:00.000Z' },
    ]);

    await request(app.getHttpServer())
      .get('/admin/travelers')
      .set('Authorization', createJwtHeader('ADMIN'))
      .expect(HttpStatus.OK)
      .expect((res: { body: unknown[] }) => {
        expect(res.body).toHaveLength(2);
      });
  });

  it('should return 403 for GET /admin/travelers with MANAGER role', async () => {
    await request(app.getHttpServer())
      .get('/admin/travelers')
      .set('Authorization', createJwtHeader('MANAGER'))
      .expect(HttpStatus.FORBIDDEN);
  });

  it('should return 403 for GET /admin/travelers with EMPLOYEE role', async () => {
    await request(app.getHttpServer())
      .get('/admin/travelers')
      .set('Authorization', createJwtHeader('EMPLOYEE'))
      .expect(HttpStatus.FORBIDDEN);
  });
});
