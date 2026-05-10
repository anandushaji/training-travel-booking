import { databaseConfig } from './database.config';
import { ConfigService } from '@nestjs/config';

describe('databaseConfig', () => {
  it('should set pool max to 20', () => {
    const mockConfigService = {
      get: jest.fn().mockReturnValue('postgres://localhost:5432/test'),
    } as unknown as ConfigService;

    const config = databaseConfig(mockConfigService);

    expect((config.extra as { max: number }).max).toBe(20);
  });

  it('should use DATABASE_URL from config service', () => {
    const url = 'postgres://user:pass@localhost:5432/testdb';
    const mockConfigService = {
      get: jest.fn().mockReturnValue(url),
    } as unknown as ConfigService;

    const config = databaseConfig(mockConfigService);

    expect((config as { url: string }).url).toBe(url);
  });
});
