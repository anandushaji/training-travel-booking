import { envValidationSchema } from './env.validation';

describe('envValidationSchema', () => {
  const validEnv = {
    DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
    REDIS_URL: 'redis://localhost:6379',
    KAFKA_BROKERS: 'localhost:9092',
    HR_SYSTEM_URL: 'http://hr.example.com/soap',
    HR_SYSTEM_USERNAME: 'user',
    HR_SYSTEM_PASSWORD: 'pass',
  };

  it('should throw on missing DATABASE_URL', () => {
    const { DATABASE_URL: _removed, ...withoutDb } = validEnv;
    const { error } = envValidationSchema.validate(withoutDb);
    expect(error).toBeDefined();
    expect(error?.message).toContain('DATABASE_URL');
  });

  it('should throw on missing REDIS_URL', () => {
    const { REDIS_URL: _removed, ...withoutRedis } = validEnv;
    const { error } = envValidationSchema.validate(withoutRedis);
    expect(error).toBeDefined();
    expect(error?.message).toContain('REDIS_URL');
  });

  it('should throw on missing KAFKA_BROKERS', () => {
    const { KAFKA_BROKERS: _removed, ...env } = validEnv;
    const { error } = envValidationSchema.validate(env);
    expect(error).toBeDefined();
    expect(error?.message).toContain('KAFKA_BROKERS');
  });

  it('should throw on missing HR_SYSTEM_URL', () => {
    const { HR_SYSTEM_URL: _removed, ...env } = validEnv;
    const { error } = envValidationSchema.validate(env);
    expect(error).toBeDefined();
    expect(error?.message).toContain('HR_SYSTEM_URL');
  });

  it('should throw on missing HR_SYSTEM_USERNAME', () => {
    const { HR_SYSTEM_USERNAME: _removed, ...env } = validEnv;
    const { error } = envValidationSchema.validate(env);
    expect(error).toBeDefined();
    expect(error?.message).toContain('HR_SYSTEM_USERNAME');
  });

  it('should throw on missing HR_SYSTEM_PASSWORD', () => {
    const { HR_SYSTEM_PASSWORD: _removed, ...env } = validEnv;
    const { error } = envValidationSchema.validate(env);
    expect(error).toBeDefined();
    expect(error?.message).toContain('HR_SYSTEM_PASSWORD');
  });

  it('should default PORT to 3003 when not set', () => {
    const { value } = envValidationSchema.validate(validEnv);
    expect((value as { PORT: number }).PORT).toBe(3003);
  });

  it('should pass with all required env vars set', () => {
    const { error } = envValidationSchema.validate(validEnv);
    expect(error).toBeUndefined();
  });
});
