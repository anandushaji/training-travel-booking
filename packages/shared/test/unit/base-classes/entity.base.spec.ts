import { Entity } from '../../../src/base-classes/entity.base';

class TestEntity extends Entity<{ id: string; name: string }> {}
class OtherEntity extends Entity<{ id: string; name: string }> {}

describe('Entity', () => {
  describe('equals', () => {
    it('returns true when same concrete class and same id', () => {
      const a = new TestEntity({ id: 'abc-123', name: 'foo' });
      const b = new TestEntity({ id: 'abc-123', name: 'bar' });
      expect(a.equals(b)).toBe(true);
    });

    it('returns false when ids differ', () => {
      const a = new TestEntity({ id: 'abc-123', name: 'foo' });
      const b = new TestEntity({ id: 'xyz-456', name: 'foo' });
      expect(a.equals(b)).toBe(false);
    });

    it('returns false for different concrete class with same id', () => {
      const a = new TestEntity({ id: 'abc-123', name: 'foo' });
      const b = new OtherEntity({ id: 'abc-123', name: 'foo' });
      expect(a.equals(b as unknown as TestEntity)).toBe(false);
    });

    it('returns false when other is null', () => {
      const a = new TestEntity({ id: 'abc-123', name: 'foo' });
      expect(a.equals(null as any)).toBe(false);
    });

    it('returns false when other is undefined', () => {
      const a = new TestEntity({ id: 'abc-123', name: 'foo' });
      expect(a.equals(undefined as any)).toBe(false);
    });
  });

  describe('id', () => {
    it('returns props.id value', () => {
      const e = new TestEntity({ id: 'abc-123', name: 'foo' });
      expect(e.id).toBe('abc-123');
    });
  });
});
