import { sanitizeLogContext } from './log-sanitizer';

describe('LogSanitizer', () => {
  it('should strip cardNumber, cvv, cvc, and stripeSecretKey from log context objects', () => {
    const input = {
      userId: 'user-001',
      cardNumber: '4242424242424242',
      cvv: '123',
      cvc: '456',
      stripeSecretKey: 'sk_live_xxx',
      stripe_secret_key: 'sk_live_yyy',
      STRIPE_SECRET_KEY: 'sk_live_zzz',
      amount: 350,
    };

    const result = sanitizeLogContext(input);

    expect(result['cardNumber']).toBe('[REDACTED]');
    expect(result['cvv']).toBe('[REDACTED]');
    expect(result['cvc']).toBe('[REDACTED]');
    expect(result['stripeSecretKey']).toBe('[REDACTED]');
    expect(result['stripe_secret_key']).toBe('[REDACTED]');
    expect(result['STRIPE_SECRET_KEY']).toBe('[REDACTED]');
    expect(result['userId']).toBe('user-001');
    expect(result['amount']).toBe(350);
  });

  it('should sanitize nested objects', () => {
    const input = {
      payment: {
        cardNumber: '4242424242424242',
        amount: 350,
      },
    };

    const result = sanitizeLogContext(input);
    expect((result['payment'] as any).cardNumber).toBe('[REDACTED]');
    expect((result['payment'] as any).amount).toBe(350);
  });

  it('should not strip non-sensitive fields', () => {
    const input = { paymentId: 'pay-001', currency: 'USD' };
    const result = sanitizeLogContext(input);
    expect(result).toEqual(input);
  });

  it('should handle pan field', () => {
    const input = { pan: '4111111111111111', amount: 100 };
    const result = sanitizeLogContext(input);
    expect(result['pan']).toBe('[REDACTED]');
    expect(result['amount']).toBe(100);
  });
});
