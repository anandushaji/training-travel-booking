import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Traveler } from '../../../domain/aggregates/traveler.aggregate';
import { ITravelerRepository } from '../../../domain/repositories/i-traveler.repository';
import { TravelerTypeOrmEntity } from '../entities/traveler.typeorm-entity';
import { TravelerMapper } from '../../../application/mappers/traveler.mapper';

@Injectable()
export class TravelerRepository implements ITravelerRepository {
  /**
   * WeakMap to track the original TypeORM entity per domain aggregate.
   * This enables TypeORM's @VersionColumn optimistic locking on save()
   * by reusing the loaded entity (which TypeORM tracks internally) rather
   * than creating a fresh entity object.
   */
  private readonly entityMap = new WeakMap<
    Traveler,
    TravelerTypeOrmEntity
  >();

  constructor(
    @InjectRepository(TravelerTypeOrmEntity)
    private readonly typeormRepo: Repository<TravelerTypeOrmEntity>,
  ) {}

  async findById(
    id: string,
    includeDeleted = false,
  ): Promise<Traveler | null> {
    const entity = await this.typeormRepo.findOne({
      where: includeDeleted ? { id } : { id, deletedAt: IsNull() },
    });
    if (!entity) return null;

    const aggregate = TravelerMapper.toDomain(entity);
    this.entityMap.set(aggregate, entity);
    return aggregate;
  }

  async findByEmail(email: string): Promise<Traveler | null> {
    const entity = await this.typeormRepo.findOne({
      where: { email, deletedAt: IsNull() },
    });
    if (!entity) return null;

    const aggregate = TravelerMapper.toDomain(entity);
    this.entityMap.set(aggregate, entity);
    return aggregate;
  }

  /** Returns minimal auth data including password_hash — infrastructure-only, not exposed via domain interface. */
  async findAuthDataByEmail(
    email: string,
  ): Promise<{ userId: string; email: string; role: string; passwordHash: string | null } | null> {
    const entity = await this.typeormRepo.findOne({
      where: { email, deletedAt: IsNull() },
    });
    if (!entity) return null;
    return {
      userId: entity.id,
      email: entity.email,
      role: entity.role,
      passwordHash: entity.passwordHash,
    };
  }

  async findByEmployeeId(employeeId: string): Promise<Traveler | null> {
    const entity = await this.typeormRepo.findOne({
      where: { employeeId, deletedAt: IsNull() },
    });
    if (!entity) return null;

    const aggregate = TravelerMapper.toDomain(entity);
    this.entityMap.set(aggregate, entity);
    return aggregate;
  }

  async findAll(includeDeleted: boolean): Promise<Traveler[]> {
    const entities = includeDeleted
      ? await this.typeormRepo.find()
      : await this.typeormRepo.find({ where: { deletedAt: IsNull() } });

    return entities.map((entity) => {
      const aggregate = TravelerMapper.toDomain(entity);
      this.entityMap.set(aggregate, entity);
      return aggregate;
    });
  }

  async save(aggregate: Traveler): Promise<void> {
    const cachedEntity = this.entityMap.get(aggregate);

    if (cachedEntity) {
      // Update the cached TypeORM entity (TypeORM knows it's an existing row)
      // @VersionColumn check: TypeORM will add WHERE version = N to the UPDATE
      TravelerMapper.updateEntity(cachedEntity, aggregate);
      await this.typeormRepo.save(cachedEntity);
    } else {
      // New aggregate — INSERT path; TypeORM will set version to 1
      const entity = TravelerMapper.toPersistence(aggregate);
      const saved = await this.typeormRepo.save(entity);
      this.entityMap.set(aggregate, saved);
    }
  }

  async delete(id: string): Promise<void> {
    const entity = await this.typeormRepo.findOne({ where: { id } });
    if (!entity) return;
    entity.deletedAt = new Date();
    await this.typeormRepo.save(entity);
  }
}
