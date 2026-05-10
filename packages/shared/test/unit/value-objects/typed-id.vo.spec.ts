import {
  BookingId,
  TravelerId,
} from '../../../src/value-objects/typed-id.vo';
import { ValidationException } from '../../../src/exceptions/validation.exception';
import { isValidUuid } from '../../../src/utils/uuid.util';

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-000000000000';

describe('TypedId', () => {
  describe('generate', () => {
    it('produces a valid UUID', () => {
      const id = BookingId.generate();
      expect(isValidUuid(id.value)).toBe(true);
    });

    it('each call produces a unique UUID', () => {
      expect(BookingId.generate().value).not.toBe(BookingId.generate().value);
    });
  });

  describe('from', () => {
    it('wraps a valid UUID', () => {
      expect(BookingId.from(VALID_UUID).value).toBe(VALID_UUID);
    });

    it('throws INVALID_UUID for non-UUID input', () => {
      expect(() => BookingId.from('not-a-uuid')).toThrow(ValidationException);
      try {
        BookingId.from('not-a-uuid');
      } catch (e) {
        expect((e as ValidationException).code).toBe('INVALID_UUID');
      }
    });
  });

  describe('equals', () => {
    it('true for same concrete class and same UUID', () => {
      const a = BookingId.from(VALID_UUID);
      const b = BookingId.from(VALID_UUID);
      expect(a.equals(b)).toBe(true);
    });

    it('false for different concrete classes with same UUID', () => {
      const booking = BookingId.from(VALID_UUID);
      const traveler = TravelerId.from(VALID_UUID);
      expect(booking.equals(traveler as unknown as BookingId)).toBe(false);
    });
  });

  describe('toString', () => {
    it('returns same as .value', () => {
      const id = BookingId.from(VALID_UUID);
      expect(id.toString()).toBe(id.value);
    });
  });
});
