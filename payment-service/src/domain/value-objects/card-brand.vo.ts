import { DomainException } from '@travel/shared';

export type CardBrandValue = 'visa' | 'mastercard' | 'amex' | 'discover' | 'unknown';
const VALID_BRANDS: ReadonlySet<string> = new Set(['visa', 'mastercard', 'amex', 'discover', 'unknown']);

export class CardBrand {
  constructor(readonly value: CardBrandValue) {
    if (!VALID_BRANDS.has(value)) {
      throw new DomainException(
        `Invalid card brand: "${value}".`,
        'INVALID_CARD_BRAND',
        422,
        { value },
      );
    }
  }
}
