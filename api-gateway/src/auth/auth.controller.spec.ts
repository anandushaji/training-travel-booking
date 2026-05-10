import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn(),
            refresh: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(AuthController);
    authService = module.get(AuthService) as jest.Mocked<AuthService>;
  });

  it('should return 200 with accessToken and refreshToken for valid credentials', async () => {
    const mockResult = { accessToken: 'access.jwt', refreshToken: 'refresh.jwt', expiresIn: 28800, user: { id: 'u-1', email: 'alice@corp.com', role: 'EMPLOYEE' as const, iat: 0, exp: 0 } };
    authService.login.mockResolvedValue(mockResult);

    const result = await controller.login(
      { email: 'alice@corp.com', password: 'password123' },
      { correlationId: 'corr-1', idempotencyKey: 'idem-1' },
    );

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.expiresIn).toBe(28800);
  });

  it('should return 401 for invalid credentials', async () => {
    authService.login.mockRejectedValue(new UnauthorizedException());

    await expect(
      controller.login(
        { email: 'alice@corp.com', password: 'wrongpassword' },
        {},
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should return 200 with new accessToken and new refreshToken for valid refresh token', async () => {
    const mockResult = { accessToken: 'new.access.jwt', refreshToken: 'new.refresh.jwt', expiresIn: 28800, user: { id: 'u-1', email: 'alice@corp.com', role: 'EMPLOYEE' as const, iat: 0, exp: 0 } };
    authService.refresh.mockResolvedValue(mockResult);

    const result = await controller.refresh({ refreshToken: 'valid.refresh.jwt' });

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
  });

  it('should return 401 for expired or invalid refresh token', async () => {
    authService.refresh.mockRejectedValue(new UnauthorizedException());

    await expect(
      controller.refresh({ refreshToken: 'expired.token' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
