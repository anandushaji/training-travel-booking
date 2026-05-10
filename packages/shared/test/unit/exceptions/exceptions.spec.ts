import { DomainException } from '../../../src/exceptions/domain.exception';
import { ValidationException } from '../../../src/exceptions/validation.exception';
import { NotFoundException } from '../../../src/exceptions/not-found.exception';
import { ConflictException } from '../../../src/exceptions/conflict.exception';
import { InsufficientFundsException } from '../../../src/exceptions/insufficient-funds.exception';
import { CurrencyMismatchException } from '../../../src/exceptions/currency-mismatch.exception';

describe('Exceptions', () => {
  describe('all exceptions are instanceof DomainException', () => {
    it('ValidationException is instanceof DomainException', () => {
      expect(new ValidationException('msg', 'CODE')).toBeInstanceOf(DomainException);
    });
    it('NotFoundException is instanceof DomainException', () => {
      expect(new NotFoundException('msg')).toBeInstanceOf(DomainException);
    });
    it('ConflictException is instanceof DomainException', () => {
      expect(new ConflictException('msg', 'CODE')).toBeInstanceOf(DomainException);
    });
    it('InsufficientFundsException is instanceof DomainException', () => {
      expect(
        new InsufficientFundsException({ amount: 30, currency: 'USD' }, { amount: 50, currency: 'USD' }),
      ).toBeInstanceOf(DomainException);
    });
    it('CurrencyMismatchException is instanceof DomainException', () => {
      expect(new CurrencyMismatchException('USD', 'EUR')).toBeInstanceOf(DomainException);
    });
  });

  describe('ValidationException', () => {
    it('code is set correctly', () => {
      const e = new ValidationException('Currency must be 3 letters', 'INVALID_CURRENCY');
      expect(e.code).toBe('INVALID_CURRENCY');
    });
  });

  describe('DomainException', () => {
    it('message is preserved', () => {
      const e = new ValidationException('Currency must be 3 letters', 'INVALID_CURRENCY');
      expect(e.message).toBe('Currency must be 3 letters');
    });
  });

  describe('InsufficientFundsException', () => {
    it('context includes attempted and available amounts', () => {
      const e = new InsufficientFundsException(
        { amount: 30, currency: 'USD' },
        { amount: 50, currency: 'USD' },
      );
      expect(e.context).toBeDefined();
      expect(e.context?.available).toEqual({ amount: 30, currency: 'USD' });
      expect(e.context?.attempted).toEqual({ amount: 50, currency: 'USD' });
    });
  });

  describe('statusCode', () => {
    it('each subclass carries the correct HTTP status code', () => {
      expect(new ValidationException('msg', 'CODE').statusCode).toBe(422);
      expect(new NotFoundException('msg').statusCode).toBe(404);
      expect(new ConflictException('msg', 'CODE').statusCode).toBe(409);
      expect(
        new InsufficientFundsException({ amount: 10, currency: 'USD' }, { amount: 20, currency: 'USD' }).statusCode,
      ).toBe(422);
      expect(new CurrencyMismatchException('USD', 'EUR').statusCode).toBe(422);
    });
  });
});
