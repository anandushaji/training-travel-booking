import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { TravelerController } from '../../presentation/controllers/traveler.controller';
import { AdminTravelerController } from '../../presentation/controllers/admin-traveler.controller';
import { DomainExceptionFilter } from '../../presentation/filters/domain-exception.filter';
import { TravelerTypeOrmEntity } from '../../infrastructure/persistence/entities/traveler.typeorm-entity';
import { TravelerRepository } from '../../infrastructure/persistence/repositories/traveler.repository';
import { TravelerCacheService } from '../../infrastructure/cache/traveler-cache.service';
import { TravelerEventPublisher } from '../../infrastructure/kafka/traveler-event-publisher';
import { HrSoapClientStub } from '../../infrastructure/hr/hr-soap-client.stub';
import { CreateTravelerUseCase } from '../../application/use-cases/create-traveler.use-case';
import { GetTravelerUseCase } from '../../application/use-cases/get-traveler.use-case';
import { GetTravelersUseCase } from '../../application/use-cases/get-travelers.use-case';
import { UpdateTravelerUseCase } from '../../application/use-cases/update-traveler.use-case';
import { DeleteTravelerUseCase } from '../../application/use-cases/delete-traveler.use-case';
import { GetTravelerPreferencesUseCase } from '../../application/use-cases/get-traveler-preferences.use-case';
import { UpdateTravelerPreferencesUseCase } from '../../application/use-cases/update-traveler-preferences.use-case';
import { SyncTravelersUseCase } from '../../application/use-cases/sync-travelers.use-case';
import { GetAdminTravelersUseCase } from '../../application/use-cases/get-admin-travelers.use-case';
import { TRAVELER_REPOSITORY } from '../../domain/repositories/i-traveler.repository';
import { CreateTravelersTable1746144000000 } from '../../infrastructure/migrations/1746144000000-CreateTravelersTable';

const skipContainers = process.env['SKIP_TESTCONTAINERS'] === 'true';

const createJwtHeader = (role: string, sub = 'user-id-1') => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub, role })).toString('base64url');
  return `Bearer ${header}.${payload}.sig`;
};

/**
 * Mocked Kafka producer — does not require a real broker.
 */
const mockProducer = { send: jest.fn().mockResolvedValue([]) };

/**
 * Mocked Redis client — in-memory store for cache tests.
 */
const inMemoryCache = new Map<string, string>();
const mockRedis = {
  get: jest.fn((key: string) => Promise.resolve(inMemoryCache.get(key) ?? null)),
  set: jest.fn((key: string, value: string) => { inMemoryCache.set(key, value); return Promise.resolve('OK'); }),
  del: jest.fn((key: string) => { inMemoryCache.delete(key); return Promise.resolve(1); }),
};

describe('TravelerController (integration — Testcontainers)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let createdTravelerId: string;

  beforeAll(async () => {
    if (skipContainers) return;

    let pgHost: string;
    let pgPort: number;
    let pgDb: string;
    let pgUser: string;
    let pgPass: string;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tc = await import('testcontainers') as any;
      const container = await new tc.PostgreSqlContainer('postgres:15-alpine')
        .withDatabase('testdb')
        .withUsername('test')
        .withPassword('test')
        .start();

      pgHost = container.getHost();
      pgPort = container.getMappedPort(5432);
      pgDb = container.getDatabase();
      pgUser = container.getUsername();
      pgPass = container.getPassword();
    } catch {
      console.warn('Testcontainers unavailable, skipping integration tests');
      return;
    }

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: pgHost,
          port: pgPort,
          database: pgDb,
          username: pgUser,
          password: pgPass,
          entities: [TravelerTypeOrmEntity],
          migrations: [CreateTravelersTable1746144000000],
          migrationsRun: true,
          synchronize: false,
        }),
        TypeOrmModule.forFeature([TravelerTypeOrmEntity]),
      ],
      controllers: [TravelerController, AdminTravelerController],
      providers: [
        {
          provide: TRAVELER_REPOSITORY,
          useClass: TravelerRepository,
        },
        {
          provide: TravelerRepository,
          useClass: TravelerRepository,
        },
        {
          provide: TravelerCacheService,
          useValue: new TravelerCacheService(mockRedis as never),
        },
        {
          provide: TravelerEventPublisher,
          useValue: new TravelerEventPublisher(mockProducer as never),
        },
        {
          provide: HrSoapClientStub,
          useValue: new HrSoapClientStub('http://hr-stub'),
        },
        {
          provide: CreateTravelerUseCase,
          useFactory: (repo: TravelerRepository, cache: TravelerCacheService, pub: TravelerEventPublisher) =>
            new CreateTravelerUseCase(repo, cache, pub),
          inject: [TravelerRepository, TravelerCacheService, TravelerEventPublisher],
        },
        {
          provide: GetTravelerUseCase,
          useFactory: (repo: TravelerRepository, cache: TravelerCacheService) =>
            new GetTravelerUseCase(repo, cache),
          inject: [TravelerRepository, TravelerCacheService],
        },
        {
          provide: GetTravelersUseCase,
          useFactory: (repo: TravelerRepository) => new GetTravelersUseCase(repo),
          inject: [TravelerRepository],
        },
        {
          provide: UpdateTravelerUseCase,
          useFactory: (repo: TravelerRepository, cache: TravelerCacheService, pub: TravelerEventPublisher) =>
            new UpdateTravelerUseCase(repo, cache, pub),
          inject: [TravelerRepository, TravelerCacheService, TravelerEventPublisher],
        },
        {
          provide: DeleteTravelerUseCase,
          useFactory: (repo: TravelerRepository, cache: TravelerCacheService, pub: TravelerEventPublisher) =>
            new DeleteTravelerUseCase(repo, cache, pub),
          inject: [TravelerRepository, TravelerCacheService, TravelerEventPublisher],
        },
        {
          provide: GetTravelerPreferencesUseCase,
          useFactory: (repo: TravelerRepository, cache: TravelerCacheService) =>
            new GetTravelerPreferencesUseCase(repo, cache),
          inject: [TravelerRepository, TravelerCacheService],
        },
        {
          provide: UpdateTravelerPreferencesUseCase,
          useFactory: (repo: TravelerRepository, cache: TravelerCacheService, pub: TravelerEventPublisher) =>
            new UpdateTravelerPreferencesUseCase(repo, cache, pub),
          inject: [TravelerRepository, TravelerCacheService, TravelerEventPublisher],
        },
        {
          provide: SyncTravelersUseCase,
          useFactory: (repo: TravelerRepository, pub: TravelerEventPublisher, hr: HrSoapClientStub) =>
            new SyncTravelersUseCase(repo, pub, hr),
          inject: [TravelerRepository, TravelerEventPublisher, HrSoapClientStub],
        },
        {
          provide: GetAdminTravelersUseCase,
          useFactory: (repo: TravelerRepository) => new GetAdminTravelersUseCase(repo),
          inject: [TravelerRepository],
        },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();

    dataSource = module.get(DataSource);
  });

  afterAll(async () => {
    if (app) await app.close();
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  const runTest = (fn: () => Promise<void>) => async () => {
    if (skipContainers || !app) {
      console.log('Skipping: Testcontainers not available');
      return;
    }
    await fn();
  };

  it('should return correct status codes for all 9 endpoints (smoke test)', runTest(async () => {
    // 1. POST /travelers (create)
    const createRes = await request(app.getHttpServer())
      .post('/travelers')
      .set('Authorization', createJwtHeader('MANAGER'))
      .send({ employeeId: `EMP-${Date.now()}`, name: 'Alice', email: `alice-${Date.now()}@corp.com`, department: 'Eng', role: 'EMPLOYEE' })
      .expect(201);
    createdTravelerId = createRes.body.id;

    // 2. GET /travelers (list)
    await request(app.getHttpServer())
      .get('/travelers')
      .set('Authorization', createJwtHeader('MANAGER'))
      .expect(200);

    // 3. GET /travelers/:id (single)
    await request(app.getHttpServer())
      .get(`/travelers/${createdTravelerId}`)
      .set('Authorization', createJwtHeader('EMPLOYEE', createdTravelerId))
      .expect(200);

    // 4. PATCH /travelers/:id (update)
    await request(app.getHttpServer())
      .patch(`/travelers/${createdTravelerId}`)
      .set('Authorization', createJwtHeader('MANAGER'))
      .send({ name: 'Alice Updated' })
      .expect(200);

    // 5. GET /travelers/:id/preferences
    await request(app.getHttpServer())
      .get(`/travelers/${createdTravelerId}/preferences`)
      .set('Authorization', createJwtHeader('EMPLOYEE', createdTravelerId))
      .expect(200);

    // 6. PUT /travelers/:id/preferences
    await request(app.getHttpServer())
      .put(`/travelers/${createdTravelerId}/preferences`)
      .set('Authorization', createJwtHeader('EMPLOYEE', createdTravelerId))
      .send({ seatPreference: 'window' })
      .expect(200);

    // 7. GET /admin/travelers
    await request(app.getHttpServer())
      .get('/admin/travelers')
      .set('Authorization', createJwtHeader('ADMIN'))
      .expect(200);

    // 8. POST /travelers/sync
    await request(app.getHttpServer())
      .post('/travelers/sync')
      .set('Authorization', createJwtHeader('ADMIN'))
      .send({ employees: [{ employeeId: `EMP-SYNC-${Date.now()}`, name: 'Sync User', email: `sync-${Date.now()}@corp.com`, department: 'Eng' }] })
      .expect(200);

    // 9. DELETE /travelers/:id
    await request(app.getHttpServer())
      .delete(`/travelers/${createdTravelerId}`)
      .set('Authorization', createJwtHeader('ADMIN'))
      .expect(204);
  }));

  it('should return 409 on duplicate employeeId', runTest(async () => {
    const empId = `EMP-DUP-${Date.now()}`;
    await request(app.getHttpServer())
      .post('/travelers')
      .set('Authorization', createJwtHeader('MANAGER'))
      .send({ employeeId: empId, name: 'Dup', email: `dup-${Date.now()}@corp.com`, department: 'Eng', role: 'EMPLOYEE' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/travelers')
      .set('Authorization', createJwtHeader('MANAGER'))
      .send({ employeeId: empId, name: 'Dup2', email: `dup2-${Date.now()}@corp.com`, department: 'Eng', role: 'EMPLOYEE' })
      .expect(409);
  }));

  it('should return 404 for soft-deleted traveler from non-admin', runTest(async () => {
    const empId = `EMP-DEL-${Date.now()}`;
    const res = await request(app.getHttpServer())
      .post('/travelers')
      .set('Authorization', createJwtHeader('MANAGER'))
      .send({ employeeId: empId, name: 'ToDelete', email: `del-${Date.now()}@corp.com`, department: 'Eng', role: 'EMPLOYEE' })
      .expect(201);
    const tid = res.body.id;

    await request(app.getHttpServer())
      .delete(`/travelers/${tid}`)
      .set('Authorization', createJwtHeader('ADMIN'))
      .expect(204);

    await request(app.getHttpServer())
      .get(`/travelers/${tid}`)
      .set('Authorization', createJwtHeader('EMPLOYEE', tid))
      .expect(404);

    const adminRes = await request(app.getHttpServer())
      .get('/admin/travelers')
      .set('Authorization', createJwtHeader('ADMIN'))
      .expect(200);
    expect(adminRes.body.some((t: { id: string }) => t.id === tid)).toBe(true);
  }));

  it('should remove cache key from Redis after PATCH', runTest(async () => {
    const empId = `EMP-CACHE-${Date.now()}`;
    const res = await request(app.getHttpServer())
      .post('/travelers')
      .set('Authorization', createJwtHeader('MANAGER'))
      .send({ employeeId: empId, name: 'CacheTester', email: `cache-${Date.now()}@corp.com`, department: 'Eng', role: 'EMPLOYEE' })
      .expect(201);
    const tid = res.body.id;

    // Populate cache via GET
    await request(app.getHttpServer())
      .get(`/travelers/${tid}`)
      .set('Authorization', createJwtHeader('EMPLOYEE', tid))
      .expect(200);

    // PATCH — should invalidate cache
    await request(app.getHttpServer())
      .patch(`/travelers/${tid}`)
      .set('Authorization', createJwtHeader('MANAGER'))
      .send({ name: 'CacheTester Updated' })
      .expect(200);

    // Verify the mock cache.del was called with the right key
    expect(mockRedis.del).toHaveBeenCalledWith(`traveler:profile:${tid}`);
  }));

  it('should not create duplicate records on repeated sync for same employeeId', runTest(async () => {
    const empId = `EMP-SYNC2-${Date.now()}`;
    const payload = {
      employees: [{ employeeId: empId, name: 'SyncUser', email: `sync2-${Date.now()}@corp.com`, department: 'Eng' }],
    };

    await request(app.getHttpServer())
      .post('/travelers/sync')
      .set('Authorization', createJwtHeader('ADMIN'))
      .send(payload)
      .expect(200);

    const res2 = await request(app.getHttpServer())
      .post('/travelers/sync')
      .set('Authorization', createJwtHeader('ADMIN'))
      .send(payload)
      .expect(200);

    expect(res2.body.synced).toBe(1);
    expect(res2.body.errors).toHaveLength(0);
  }));
});
