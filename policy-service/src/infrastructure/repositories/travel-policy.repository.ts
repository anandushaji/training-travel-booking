import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { TravelPolicyEntity } from '../entities/travel-policy.entity';
import { TravelPolicy, TravelPolicyProps } from '../../domain/aggregates/travel-policy.aggregate';
import { PolicyRules } from '../../domain/value-objects/policy-rules.value-object';

@Injectable()
export class TravelPolicyRepository {
  constructor(
    @InjectRepository(TravelPolicyEntity)
    private readonly repo: Repository<TravelPolicyEntity>,
  ) {}

  async findById(id: string): Promise<TravelPolicy | null> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) return null;
    return this.toDomain(entity);
  }

  async findByDepartment(department: string, activeOnly = false): Promise<TravelPolicy[]> {
    const where: FindOptionsWhere<TravelPolicyEntity> = { department };
    if (activeOnly) {
      where.active = true;
    }
    const entities = await this.repo.find({ where });
    return entities.map((e) => this.toDomain(e));
  }

  async findAll(filters: { department?: string; active?: boolean } = {}): Promise<TravelPolicy[]> {
    const where: FindOptionsWhere<TravelPolicyEntity> = {};
    if (filters.department !== undefined) where.department = filters.department;
    if (filters.active !== undefined) where.active = filters.active;
    const entities = await this.repo.find({ where });
    return entities.map((e) => this.toDomain(e));
  }

  async save(policy: TravelPolicy): Promise<TravelPolicy> {
    const entity = this.toEntity(policy);
    const saved = await this.repo.save(entity);
    return this.toDomain(saved);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  private toDomain(entity: TravelPolicyEntity): TravelPolicy {
    const props: TravelPolicyProps = {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      department: entity.department,
      rules: PolicyRules.fromPlain(entity.rules),
      active: entity.active,
      createdBy: entity.createdBy,
      version: entity.version,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
    return TravelPolicy.reconstitute(props);
  }

  private toEntity(policy: TravelPolicy): TravelPolicyEntity {
    const entity = new TravelPolicyEntity();
    entity.id = policy.id;
    entity.name = policy.name;
    entity.description = policy.description;
    entity.department = policy.department;
    entity.rules = policy.rules.toPlain();
    entity.active = policy.active;
    entity.createdBy = policy.createdBy;
    entity.version = policy.version;
    entity.createdAt = policy.createdAt;
    entity.updatedAt = policy.updatedAt;
    return entity;
  }
}
