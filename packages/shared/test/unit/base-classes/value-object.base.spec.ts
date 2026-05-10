import { ValueObject } from '../../../src/base-classes/value-object.base';

class TestValueA extends ValueObject<{ value: number }> {}
class TestValueB extends ValueObject<{ value: number }> {}

describe('ValueObject', () => {
  describe('equals', () => {
    it('returns true for same subclass and same props', () => {
      const a = new TestValueA({ value: 100 });
      const b = new TestValueA({ value: 100 });
      expect(a.equals(b)).toBe(true);
    });

    it('returns false for different props', () => {
      const a = new TestValueA({ value: 100 });
      const b = new TestValueA({ value: 200 });
      expect(a.equals(b)).toBe(false);
    });

    it('returns false for different subclass with same props', () => {
      const a = new TestValueA({ value: 100 });
      const b = new TestValueB({ value: 100 });
      // equals signature requires same TProps — cast needed for cross-type test
      expect(a.equals(b as unknown as TestValueA)).toBe(false);
    });

    it('returns false when other is null', () => {
      const a = new TestValueA({ value: 100 });
      expect(a.equals(null as any)).toBe(false);
    });

    it('returns false when other is undefined', () => {
      const a = new TestValueA({ value: 100 });
      expect(a.equals(undefined as any)).toBe(false);
    });
  });

  describe('props', () => {
    it('are frozen', () => {
      const a = new TestValueA({ value: 100 });
      const originalValue = (a as any).props.value;
      try {
        (a as any).props.value = 999;
      } catch {
        // strict mode throws on frozen object mutation
      }
      expect((a as any).props.value).toBe(originalValue);
    });
  });
});
