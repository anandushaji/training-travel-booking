import { CardBrand } from './card-brand.vo';
import { DomainException } from '@travel/shared';

describe('CardBrand', () => {
  it.each(['visa', 'mastercard', 'amex', 'discover', 'unknown'])(
    'should create a valid CardBrand for "%s"',
    (brand) => {
      const cb = new CardBrand(brand as any);
      expect(cb.value).toBe(brand);
    },
  );

  it('should throw DomainException for an unrecognised brand', () => {
    expect(() => new CardBrand('unionpay' as any)).toThrow(DomainException);
  });

  it('should include the invalid value in the DomainException context', () => {
    let caught: DomainException | undefined;
    try {
      new CardBrand('jcb' as any);
    } catch (e) {
      if (e instanceof DomainException) caught = e;
    }
    expect(caught).toBeDefined();
    expect(caught!.code).toBe('INVALID_CARD_BRAND');
  });
});
