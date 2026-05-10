import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import { CorrelationIdInterceptor } from '../src/common/interceptors/correlation-id.interceptor';
import { HealthController } from '../src/health/health.controller';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { Role } from '../src/common/enums/role.enum';

const TEST_SECRET = 'test-secret-32-chars-long-padding1';

describe('AppModule (smoke tests)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let authServiceMock: Partial<AuthService>;

  beforeAll(async () => {
    process.env['JWT_SECRET'] = TEST_SECRET;
    process.env['BOOKING_SERVICE_URL'] = 'http://booking:3001';
    process.env['REDIS_URL'] = 'redis://localhost:6379';
    process.env['PORT'] = '4001';
    process.env['NODE_ENV'] = 'test';

    authServiceMock = {
      login: jest.fn().mockResolvedValue({
        accessToken: 'mock.access.token',
        refreshToken: 'mock.refresh.token',
        expiresIn: 28800,
      }),
      refresh: jest.fn().mockResolvedValue({
        accessToken: 'new.access.token',
        refreshToken: 'new.refresh.token',
        expiresIn: 28800,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: TEST_SECRET,
          signOptions: { algorithm: 'HS256', expiresIn: 28800 },
        }),
      ],
      controllers: [AuthController, HealthController],
      providers: [
        JwtStrategy,
        { provide: AuthService, useValue: authServiceMock },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
        { provide: APP_INTERCEPTOR, useClass: CorrelationIdInterceptor },
      ],
    }).compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1', { exclude: ['/health', '/metrics'] });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    jwtService = module.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return 200 on GET /health without authentication', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('should return 401 for unauthenticated request to protected route', async () => {
    // There's no route for /api/v1/bookings in smoke test (no proxy) but guard fires first
    const res = await request(app.getHttpServer()).get('/api/v1/travelers/me');
    expect(res.status).toBe(401);
  });

  it('should return accessToken on successful login', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'alice@corp.com', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });

  it('should return 200 with standard error schema with correlationId on 401 response', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/travelers/me');
    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
    expect(res.body.message).toBeDefined();
    expect(res.body.correlationId).toBeDefined();
    expect(res.body.timestamp).toBeDefined();
  });

  it('should return 200 with text/plain Prometheus metrics format on GET /metrics', async () => {
    const res = await request(app.getHttpServer()).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
  });
});
