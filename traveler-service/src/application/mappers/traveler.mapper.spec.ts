import { TravelerMapper } from './traveler.mapper';
import { Traveler } from '../../domain/aggregates/traveler.aggregate';
import { TravelerTypeOrmEntity } from '../../infrastructure/persistence/entities/traveler.typeorm-entity';
import { TravelerPreferences } from '../../domain/value-objects/traveler-preferences.value-object';

const makeEntity = (overrides: Partial<TravelerTypeOrmEntity> = {}): TravelerTypeOrmEntity => {
  const e = new TravelerTypeOrmEntity();
  e.id = 'uuid-1';
  e.employeeId = 'EMP-001';
  e.name = 'Alice';
  e.email = 'alice@corp.com';
  e.department = 'Engineering';
  e.role = 'EMPLOYEE';
  e.preferences = TravelerPreferences.default().toPlainObject();
  e.deletedAt = null;
  e.anonymisedAt = null;
  e.version = 1;
  e.createdAt = new Date('2026-01-01T00:00:00Z');
  e.updatedAt = new Date('2026-01-01T00:00:00Z');
  return Object.assign(e, overrides);
};

const makeAggregate = (): Traveler => {
  const prefs = TravelerPreferences.default();
  return new Traveler({
    id: 'uuid-1',
    employeeId: 'EMP-001',
    name: 'Alice',
    email: 'alice@corp.com',
    department: 'Engineering',
    role: 'EMPLOYEE',
    preferences: prefs,
    deletedAt: null,
    anonymisedAt: null,
    dbVersion: 1,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  });
};

describe('TravelerMapper', () => {
  describe('toDomain', () => {
    it('should map entity to aggregate', () => {
      const entity = makeEntity();
      const aggregate = TravelerMapper.toDomain(entity);
      expect(aggregate.id).toBe('uuid-1');
      expect(aggregate.employeeId).toBe('EMP-001');
      expect(aggregate.dbVersion).toBe(1);
    });
  });

  describe('toPersistence', () => {
    it('should map aggregate to entity', () => {
      const aggregate = makeAggregate();
      const entity = TravelerMapper.toPersistence(aggregate);
      expect(entity.id).toBe('uuid-1');
      expect(entity.employeeId).toBe('EMP-001');
      expect(entity.version).toBe(1);
      expect(entity.deletedAt).toBeNull();
    });
  });

  describe('updateEntity', () => {
    it('should update entity fields from aggregate without touching version', () => {
      const entity = makeEntity();
      const aggregate = new Traveler({
        id: 'uuid-1',
        employeeId: 'EMP-001',
        name: 'Alice Updated',
        email: 'alice@corp.com',
        department: 'Finance',
        role: 'MANAGER',
        preferences: TravelerPreferences.default(),
        deletedAt: null,
        anonymisedAt: null,
        dbVersion: 2,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-06-01T00:00:00Z'),
      });
      TravelerMapper.updateEntity(entity, aggregate);
      expect(entity.name).toBe('Alice Updated');
      expect(entity.department).toBe('Finance');
      expect(entity.role).toBe('MANAGER');
      expect(entity.version).toBe(1); // not touched
    });
  });

  describe('toCache', () => {
    it('should serialise aggregate to cache DTO', () => {
      const aggregate = makeAggregate();
      const dto = TravelerMapper.toCache(aggregate);
      expect(dto.id).toBe('uuid-1');
      expect(dto.deletedAt).toBeNull();
      expect(typeof dto.createdAt).toBe('string');
    });

    it('should include ISO string for non-null deletedAt', () => {
      const aggregate = new Traveler({
        id: 'uuid-1',
        employeeId: 'EMP-001',
        name: 'Alice',
        email: 'alice@corp.com',
        department: 'Engineering',
        role: 'EMPLOYEE',
        preferences: TravelerPreferences.default(),
        deletedAt: new Date('2026-03-01T00:00:00Z'),
        anonymisedAt: null,
        dbVersion: 1,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      });
      const dto = TravelerMapper.toCache(aggregate);
      expect(dto.deletedAt).toBe('2026-03-01T00:00:00.000Z');
    });
  });
});
