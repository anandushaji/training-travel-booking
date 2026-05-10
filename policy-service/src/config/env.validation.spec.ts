import { envValidationSchema } from './env.validation';

describe('env.validation', () => {
  it('validates required env vars', () => {
    const result = envValidationSchema.validate({}, { abortEarly: false });
    expect(result.error).toBeDefined();
    const keys = result.error!.details.map((d) => d.context?.['key']);
    expect(keys).toContain('DATABASE_URL');
    expect(keys).toContain('REDIS_URL');
    expect(keys).toContain('KAFKA_BROKERS');
    expect(keys).toContain('TRAVELER_SERVICE_URL');
  });

  it('passes with all required env vars', () => {
    const result = envValidationSchema.validate({
      DATABASE_URL: 'postgres://user:pass@localhost:5432/policy_service',
      REDIS_URL: 'redis://localhost:6379',
      KAFKA_BROKERS: 'localhost:9092',
      TRAVELER_SERVICE_URL: 'http://traveler-service:3001',
    });
    expect(result.error).toBeUndefined();
  });

  it('applies default PORT 3002', () => {
    const result = envValidationSchema.validate({
      DATABASE_URL: 'postgres://user:pass@localhost:5432/policy_service',
      REDIS_URL: 'redis://localhost:6379',
      KAFKA_BROKERS: 'localhost:9092',
      TRAVELER_SERVICE_URL: 'http://traveler-service:3001',
    });
    expect(result.value['PORT']).toBe(3002);
  });
});
