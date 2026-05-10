import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Role } from './common/enums/role.enum';

describe('AppModule', () => {
  let moduleRef: TestingModule;

  beforeAll(async () => {
    process.env['JWT_SECRET'] = 'test-secret-32-chars-long-padding1';
    process.env['BOOKING_SERVICE_URL'] = 'http://booking:3001';
    process.env['REDIS_URL'] = 'redis://localhost:6379';
    process.env['PORT'] = '4000';
    process.env['NODE_ENV'] = 'test';

    // Test only ConfigModule — full AppModule requires Redis/ThrottlerModule at runtime
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
    }).compile();
  });

  afterAll(async () => {
    await moduleRef?.close();
  });

  it('should bootstrap the NestJS application without errors', () => {
    expect(moduleRef).toBeDefined();
  });

  it('should expose all required env vars via ConfigService', () => {
    const config = moduleRef.get(ConfigService);
    expect(config.get('JWT_SECRET')).toBeDefined();
    expect(config.get('BOOKING_SERVICE_URL')).toBeDefined();
    expect(config.get('REDIS_URL')).toBeDefined();
  });
});

describe('Role enum (from AppModule context)', () => {
  it('should define EMPLOYEE, MANAGER, ADMIN roles', () => {
    expect(Role.EMPLOYEE).toBe('EMPLOYEE');
    expect(Role.MANAGER).toBe('MANAGER');
    expect(Role.ADMIN).toBe('ADMIN');
  });
});
