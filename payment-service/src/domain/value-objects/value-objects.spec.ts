import { PaymentId } from './payment-id.vo';
import { PaymentMethodId } from './payment-method-id.vo';
import { StripePaymentMethodId } from './stripe-payment-method-id.vo';
import { DomainException } from '@travel/shared';

const VALID_UUID = '00000000-0000-4000-8000-000000000001';

describe('PaymentId', () => {
  it('should create with a valid UUID', () => {
    const id = new PaymentId(VALID_UUID);
    expect(id.value).toBe(VALID_UUID);
  });
});

describe('PaymentMethodId', () => {
  it('should create with a valid UUID', () => {
    const id = new PaymentMethodId(VALID_UUID);
    expect(id.value).toBe(VALID_UUID);
  });
});

describe('StripePaymentMethodId', () => {
  it('should accept a valid pm_ prefixed id', () => {
    const id = new StripePaymentMethodId('pm_1abc2DEF');
    expect(id.value).toBe('pm_1abc2DEF');
  });

  it('should accept pm_ with underscores', () => {
    const id = new StripePaymentMethodId('pm_test_card_123');
    expect(id.value).toBe('pm_test_card_123');
  });

  it('should throw DomainException for missing pm_ prefix', () => {
    expect(() => new StripePaymentMethodId('card_abc123')).toThrow(DomainException);
  });

  it('should throw DomainException for an empty string', () => {
    expect(() => new StripePaymentMethodId('')).toThrow(DomainException);
  });

  it('should throw DomainException for special characters after pm_', () => {
    expect(() => new StripePaymentMethodId('pm_abc!@#')).toThrow(DomainException);
  });
});
