import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from '../../src/auth/auth.controller';
import { AuthService } from '../../src/auth/auth.service';
import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard';
import { JwtStrategy } from '../../src/auth/strategies/jwt.strategy';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { Role } from '../../src/common/enums/role.enum';
import { UnauthorizedException } from '@nestjs/common';

const TEST_SECRET = 'contract-test-secret-32-chars-pad';

describe('Auth Contract Tests', () => {
  let app: INestApplication;
  let authServiceMock: jest.Mocked<Pick<AuthService, 'login' | 'refresh'>>;

  beforeAll(async () => {
    process.env['JWT_SECRET'] = TEST_SECRET;
    process.env['NODE_ENV'] = 'test';

    authServiceMock = {
      login: jest.fn(),
      refresh: jest.fn(),
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
      controllers: [AuthController],
      providers: [
        JwtStrategy,
        { provide: AuthService, useValue: authServiceMock },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
      ],
    }).compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1', { exclude: ['/health', '/metrics'] });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ── POST /api/v1/auth/login ───────────────────────────────────────────────

  it('POST /api/v1/auth/login should return accessToken, refreshToken, and expiresIn matching contract schema', async () => {
    const jwtRegex = /^[\w-]+\.[\w-]+\.[\w-]+$/;
    authServiceMock.login.mockResolvedValueOnce({
      accessToken: 'eyJhbGciOiJIUzI1NiJ9.payload.sig',
      refreshToken: 'eyJhbGciOiJIUzI1NiJ9.refresh.sig',
      expiresIn: 28800,
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'alice@corp.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(typeof res.body.accessToken).toBe('string');
    expect(typeof res.body.refreshToken).toBe('string');
    expect(res.body.expiresIn).toBe(28800);
  });

  it('POST /api/v1/auth/login with missing email should return 400 with standard error schema', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ password: 'password123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(res.body.message).toBeDefined();
    expect(res.body.correlationId).toBeDefined();
    expect(res.body.timestamp).toBeDefined();
  });

  it('POST /api/v1/auth/login with missing password should return 400 with standard error schema', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'alice@corp.com' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(res.body.message).toBeDefined();
  });

  it('POST /api/v1/auth/login with invalid credentials should return 401', async () => {
    authServiceMock.login.mockRejectedValueOnce(new UnauthorizedException('Invalid credentials'));

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'alice@corp.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
  });

  // ── POST /api/v1/auth/refresh ─────────────────────────────────────────────

  it('POST /api/v1/auth/refresh should return new accessToken and refreshToken matching contract schema', async () => {
    const inputRefreshToken = 'eyJhbGciOiJIUzI1NiJ9.old.refresh';
    authServiceMock.refresh.mockResolvedValueOnce({
      accessToken: 'eyJhbGciOiJIUzI1NiJ9.new.access',
      refreshToken: 'eyJhbGciOiJIUzI1NiJ9.new.refresh',
      expiresIn: 28800,
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: inputRefreshToken });

    expect(res.status).toBe(200);
    expect(typeof res.body.accessToken).toBe('string');
    expect(typeof res.body.refreshToken).toBe('string');
    // Must be a NEW refresh token (not the same as the input)
    expect(res.body.refreshToken).not.toBe(inputRefreshToken);
    expect(res.body.expiresIn).toBe(28800);
  });

  it('POST /api/v1/auth/refresh with missing refreshToken should return 400 with standard error schema', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(res.body.message).toBeDefined();
  });

  it('POST /api/v1/auth/refresh with expired/invalid token should return 401', async () => {
    authServiceMock.refresh.mockRejectedValueOnce(
      new UnauthorizedException('Invalid or expired refresh token'),
    );

    // A well-formed JWT (passes @IsJWT validation) but invalid for refresh
    const invalidToken = 'eyJhbGciOiJIUzI1NiJ9.expired.token';
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: invalidToken });

    expect(res.status).toBe(401);
  });
});
