import { DomainException } from '@travel/shared';
import { PaymentMethod } from './payment-method.aggregate';

describe('PaymentMethod aggregate', () => {
  function makeMethod(): PaymentMethod {
    return PaymentMethod.create({
      travelerId: '00000000-0000-4000-8000-000000000001',
      stripePaymentMethodId: 'pm_test_visa4242',
      cardBrand: 'visa',
      last4: '4242',
      expiryMonth: 12,
      expiryYear: 2027,
    });
  }

  it('should create a payment method with isActive=true', () => {
    const method = makeMethod();
    expect(method.isActive).toBe(true);
    expect(method.cardBrand).toBe('visa');
    expect(method.last4).toBe('4242');
  });

  it('should deactivate an active payment method', () => {
    const method = makeMethod();
    method.deactivate();
    expect(method.isActive).toBe(false);
  });

  it('should throw DomainException when deactivating an already-inactive method', () => {
    const method = makeMethod();
    method.deactivate();
    expect(() => method.deactivate()).toThrow(DomainException);
    expect(() => method.deactivate()).toThrow(
      expect.objectContaining({ code: 'PAYMENT_METHOD_ALREADY_INACTIVE' }),
    );
  });
});
