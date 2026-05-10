import { envValidationSchema } from './env.validation';

describe('env.validation', () => {
  it('should pass validation with all required env vars', () => {
    const { error } = envValidationSchema.validate({
      PORT: 3004,
      DB_HOST: 'localhost',
      DB_PORT: 5432,
      DB_NAME: 'payment_service',
      DB_USER: 'payment',
      DB_PASSWORD: 'secret',
      STRIPE_SECRET_KEY: 'sk_test_xxx',
      STRIPE_WEBHOOK_SECRET: 'whsec_xxx',
      KAFKA_BROKERS: 'localhost:9092',
    });
    expect(error).toBeUndefined();
  });

  it('should throw on missing STRIPE_SECRET_KEY', () => {
    const { error } = envValidationSchema.validate({
      DB_HOST: 'localhost',
      DB_NAME: 'payment_service',
      DB_USER: 'payment',
      DB_PASSWORD: 'secret',
      STRIPE_WEBHOOK_SECRET: 'whsec_xxx',
      KAFKA_BROKERS: 'localhost:9092',
    });
    expect(error).toBeDefined();
    expect(error!.message).toContain('STRIPE_SECRET_KEY');
  });

  it('should throw on missing DB_HOST', () => {
    const { error } = envValidationSchema.validate({
      DB_NAME: 'payment_service',
      DB_USER: 'payment',
      DB_PASSWORD: 'secret',
      STRIPE_SECRET_KEY: 'sk_test_xxx',
      STRIPE_WEBHOOK_SECRET: 'whsec_xxx',
      KAFKA_BROKERS: 'localhost:9092',
    });
    expect(error).toBeDefined();
    expect(error!.message).toContain('DB_HOST');
  });

  it('should apply default PORT=3004 when not provided', () => {
    const { value } = envValidationSchema.validate({
      DB_HOST: 'localhost',
      DB_NAME: 'payment_service',
      DB_USER: 'payment',
      DB_PASSWORD: 'secret',
      STRIPE_SECRET_KEY: 'sk_test_xxx',
      STRIPE_WEBHOOK_SECRET: 'whsec_xxx',
      KAFKA_BROKERS: 'localhost:9092',
    });
    expect(value.PORT).toBe(3004);
  });
});
