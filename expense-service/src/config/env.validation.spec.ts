import { envValidationSchema } from './env.validation';

describe('env.validation', () => {
  it('validates required env vars — passes with all required fields', () => {
    const { error } = envValidationSchema.validate({
      DATABASE_URL: 'postgres://localhost/expense',
      KAFKA_BROKERS: 'localhost:9092',
      JWT_SECRET: 'secret',
    });
    expect(error).toBeUndefined();
  });

  it('validates required env vars — fails when DATABASE_URL is missing', () => {
    const { error } = envValidationSchema.validate({
      KAFKA_BROKERS: 'localhost:9092',
      JWT_SECRET: 'secret',
    });
    expect(error).toBeDefined();
    expect(error?.message).toContain('DATABASE_URL');
  });

  it('validates required env vars — fails when KAFKA_BROKERS is missing', () => {
    const { error } = envValidationSchema.validate({
      DATABASE_URL: 'postgres://localhost/expense',
      JWT_SECRET: 'secret',
    });
    expect(error).toBeDefined();
    expect(error?.message).toContain('KAFKA_BROKERS');
  });

  it('validates required env vars — fails when JWT_SECRET is missing', () => {
    const { error } = envValidationSchema.validate({
      DATABASE_URL: 'postgres://localhost/expense',
      KAFKA_BROKERS: 'localhost:9092',
    });
    expect(error).toBeDefined();
    expect(error?.message).toContain('JWT_SECRET');
  });

  it('applies default PORT of 3006', () => {
    const { value } = envValidationSchema.validate({
      DATABASE_URL: 'postgres://localhost/expense',
      KAFKA_BROKERS: 'localhost:9092',
      JWT_SECRET: 'secret',
    });
    expect(value.PORT).toBe(3006);
  });
});
