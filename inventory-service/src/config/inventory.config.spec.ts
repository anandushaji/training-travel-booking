import * as Joi from 'joi';
import { envValidationSchema } from './env.validation';
import { InventoryConfig } from './inventory.config';
import type { ConfigService } from '@nestjs/config';

describe('envValidationSchema', () => {
  it('should throw ConfigValidationError when DATABASE_URL is missing', () => {
    const result = envValidationSchema.validate({
      REDIS_URL: 'redis://localhost:6379',
      KAFKA_BROKERS: 'localhost:9092',
      AMADEUS_BASE_URL: 'https://test.api.amadeus.com',
      AMADEUS_CLIENT_ID: 'id',
      AMADEUS_CLIENT_SECRET: 'secret',
      PASSPORT_ENCRYPTION_KEY: '0'.repeat(64),
    });
    expect(result.error).toBeDefined();
    expect(result.error?.message).toMatch(/DATABASE_URL/);
  });

  it('should pass when all required env vars are present', () => {
    const result = envValidationSchema.validate({
      DATABASE_URL: 'postgres://localhost/inventory',
      REDIS_URL: 'redis://localhost:6379',
      KAFKA_BROKERS: 'localhost:9092',
      AMADEUS_BASE_URL: 'https://test.api.amadeus.com',
      AMADEUS_CLIENT_ID: 'id',
      AMADEUS_CLIENT_SECRET: 'secret',
      PASSPORT_ENCRYPTION_KEY: '0'.repeat(64),
    });
    expect(result.error).toBeUndefined();
  });

  it('should apply default PORT=3005 when PORT is not provided', () => {
    const result = envValidationSchema.validate({
      DATABASE_URL: 'postgres://localhost/inventory',
      REDIS_URL: 'redis://localhost:6379',
      KAFKA_BROKERS: 'localhost:9092',
      AMADEUS_BASE_URL: 'https://test.api.amadeus.com',
      AMADEUS_CLIENT_ID: 'id',
      AMADEUS_CLIENT_SECRET: 'secret',
      PASSPORT_ENCRYPTION_KEY: '0'.repeat(64),
    });
    expect(result.value['PORT']).toBe(3005);
  });
});

describe('InventoryConfig', () => {
  function makeConfig(overrides: Record<string, unknown> = {}): InventoryConfig {
    const defaults: Record<string, unknown> = {
      PORT: 3005,
      DATABASE_URL: 'postgres://localhost/inventory',
      REDIS_URL: 'redis://localhost:6379',
      KAFKA_BROKERS: 'localhost:9092',
      AMADEUS_BASE_URL: 'https://test.api.amadeus.com',
      AMADEUS_CLIENT_ID: 'client-id',
      AMADEUS_CLIENT_SECRET: 'client-secret',
      RESERVATION_HOLD_MINUTES: 20,
      PASSPORT_ENCRYPTION_KEY: '0'.repeat(64),
      ...overrides,
    };
    const mockConfigService = {
      get: jest.fn((key: string) => defaults[key]),
    } as unknown as ConfigService;
    return new InventoryConfig(mockConfigService);
  }

  it('should return port from config', () => {
    expect(makeConfig().port).toBe(3005);
  });

  it('should return databaseUrl from config', () => {
    expect(makeConfig().databaseUrl).toBe('postgres://localhost/inventory');
  });

  it('should return redisUrl from config', () => {
    expect(makeConfig().redisUrl).toBe('redis://localhost:6379');
  });

  it('should return kafkaBrokers as array from config', () => {
    expect(makeConfig().kafkaBrokers).toEqual(['localhost:9092']);
  });

  it('should return amadeusBaseUrl from config', () => {
    expect(makeConfig().amadeusBaseUrl).toBe('https://test.api.amadeus.com');
  });

  it('should return amadeusClientId from config', () => {
    expect(makeConfig().amadeusClientId).toBe('client-id');
  });

  it('should return amadeusClientSecret from config', () => {
    expect(makeConfig().amadeusClientSecret).toBe('client-secret');
  });

  it('should return reservationHoldMinutes from config', () => {
    expect(makeConfig().reservationHoldMinutes).toBe(20);
  });

  it('should return passportEncryptionKey from config', () => {
    expect(makeConfig().passportEncryptionKey).toBe('0'.repeat(64));
  });

  it('should fall back to defaults when config values are absent', () => {
    const mockConfigService = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;
    const config = new InventoryConfig(mockConfigService);
    expect(config.port).toBe(3005);
    expect(config.redisUrl).toBe('redis://localhost:6379');
    expect(config.kafkaBrokers).toEqual(['localhost:9092']);
    expect(config.amadeusBaseUrl).toBe('https://test.api.amadeus.com');
    expect(config.reservationHoldMinutes).toBe(15);
    expect(config.passportEncryptionKey).toBe('');
    expect(config.databaseUrl).toBe('');
    expect(config.amadeusClientId).toBe('');
    expect(config.amadeusClientSecret).toBe('');
  });
});
