// @ts-nocheck
import * as Joi from 'joi';
import { envValidationSchema } from './env.validation';

describe('envValidationSchema', () => {
  it('validates required env vars', () => {
    const result = envValidationSchema.validate(
      {
        DATABASE_URL: 'postgresql://localhost/booking',
        KAFKA_BROKERS: 'localhost:9092',
        POLICY_SERVICE_URL: 'http://localhost:3002',
        INVENTORY_SERVICE_URL: 'http://localhost:3005',
        PAYMENT_SERVICE_URL: 'http://localhost:3004',
      },
      { abortEarly: false },
    );
    expect(result.error).toBeUndefined();
  });

  it('fails when DATABASE_URL is missing', () => {
    const result = envValidationSchema.validate(
      {
        KAFKA_BROKERS: 'localhost:9092',
        POLICY_SERVICE_URL: 'http://localhost:3002',
        INVENTORY_SERVICE_URL: 'http://localhost:3005',
        PAYMENT_SERVICE_URL: 'http://localhost:3004',
      },
      { abortEarly: false },
    );
    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain('DATABASE_URL');
  });

  it('applies default PORT of 3001', () => {
    const result = envValidationSchema.validate(
      {
        DATABASE_URL: 'postgresql://localhost/booking',
        KAFKA_BROKERS: 'localhost:9092',
        POLICY_SERVICE_URL: 'http://localhost:3002',
        INVENTORY_SERVICE_URL: 'http://localhost:3005',
        PAYMENT_SERVICE_URL: 'http://localhost:3004',
      },
      { abortEarly: false },
    );
    expect(result.value?.PORT).toBe(3001);
  });
});
