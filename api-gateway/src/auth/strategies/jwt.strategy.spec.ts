import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { Role } from '../../common/enums/role.enum';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let jwtService: JwtService;

  beforeAll(async () => {
    process.env['JWT_SECRET'] = 'test-secret-32-chars-long-padding1';

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        JwtModule.register({
          secret: 'test-secret-32-chars-long-padding1',
          signOptions: { algorithm: 'HS256', expiresIn: 3600 },
        }),
      ],
      providers: [JwtStrategy],
    }).compile();

    strategy = module.get(JwtStrategy);
    jwtService = module.get(JwtService);
  });

  it('should validate a valid JWT and return JwtPayload', () => {
    const payload = { sub: 'user-1', email: 'alice@corp.com', role: Role.EMPLOYEE };
    const result = strategy.validate(payload);
    expect(result.sub).toBe('user-1');
    expect(result.email).toBe('alice@corp.com');
    expect(result.role).toBe(Role.EMPLOYEE);
  });

  it('should sign and return a JWT that strategy can validate', () => {
    const payload = { sub: 'user-2', email: 'bob@corp.com', role: Role.MANAGER };
    const token = jwtService.sign(payload);
    expect(token).toBeDefined();
    const decoded = jwtService.verify<typeof payload>(token);
    expect(decoded.sub).toBe('user-2');
  });
});
