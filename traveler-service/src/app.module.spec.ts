import { envValidationSchema } from './infrastructure/config/env.validation';

describe('AppModule', () => {
  const validEnv = {
    DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
    REDIS_URL: 'redis://localhost:6379',
    KAFKA_BROKERS: 'localhost:9092',
    HR_SYSTEM_URL: 'http://hr.example.com/soap',
    HR_SYSTEM_USERNAME: 'user',
    HR_SYSTEM_PASSWORD: 'pass',
  };

  it('should bootstrap application without errors when env is valid', () => {
    const { error } = envValidationSchema.validate(validEnv);
    expect(error).toBeUndefined();
  });
});
