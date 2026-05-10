import { Traveler, TravelerProps } from '../../domain/aggregates/traveler.aggregate';
import { TravelerPreferences } from '../../domain/value-objects/traveler-preferences.value-object';
import { TravelerTypeOrmEntity } from '../../infrastructure/persistence/entities/traveler.typeorm-entity';
import { TravelerCacheDto } from '../../infrastructure/cache/traveler-cache.service';

export class TravelerMapper {
  static toDomain(entity: TravelerTypeOrmEntity): Traveler {
    const props: TravelerProps = {
      id: entity.id,
      employeeId: entity.employeeId,
      name: entity.name,
      email: entity.email,
      department: entity.department,
      role: entity.role as TravelerProps['role'],
      preferences: TravelerPreferences.from(entity.preferences ?? {}),
      deletedAt: entity.deletedAt,
      anonymisedAt: entity.anonymisedAt,
      dbVersion: entity.version,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
    return new Traveler(props);
  }

  static toPersistence(aggregate: Traveler): TravelerTypeOrmEntity {
    const entity = new TravelerTypeOrmEntity();
    entity.id = aggregate.id;
    entity.employeeId = aggregate.employeeId;
    entity.name = aggregate.name;
    entity.email = aggregate.email;
    entity.department = aggregate.department;
    entity.role = aggregate.role;
    entity.preferences = aggregate.preferences.toPlainObject();
    entity.deletedAt = aggregate.deletedAt;
    entity.anonymisedAt = aggregate.anonymisedAt;
    entity.createdAt = aggregate.createdAt;
    entity.updatedAt = aggregate.updatedAt;
    entity.version = aggregate.dbVersion;
    return entity;
  }

  /**
   * Update an already-loaded TypeORM entity with domain aggregate values.
   * Used by the repository to preserve the TypeORM entity identity (for
   * optimistic locking), while applying the domain changes.
   */
  static updateEntity(
    entity: TravelerTypeOrmEntity,
    aggregate: Traveler,
  ): void {
    entity.name = aggregate.name;
    entity.email = aggregate.email;
    entity.department = aggregate.department;
    entity.role = aggregate.role;
    entity.preferences = aggregate.preferences.toPlainObject();
    entity.deletedAt = aggregate.deletedAt;
    entity.anonymisedAt = aggregate.anonymisedAt;
    entity.updatedAt = aggregate.updatedAt;
    // entity.version is intentionally NOT updated here —
    // TypeORM increments it automatically via @VersionColumn on save.
  }

  /** Serialise aggregate to the shape stored in Redis. */
  static toCache(aggregate: Traveler): TravelerCacheDto {
    return {
      id: aggregate.id,
      employeeId: aggregate.employeeId,
      name: aggregate.name,
      email: aggregate.email,
      department: aggregate.department,
      role: aggregate.role,
      preferences: aggregate.preferences.toPlainObject(),
      deletedAt: aggregate.deletedAt?.toISOString() ?? null,
      createdAt: aggregate.createdAt.toISOString(),
      updatedAt: aggregate.updatedAt.toISOString(),
    };
  }
}
