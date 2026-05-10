import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PolicyViolationEntity } from '../entities/policy-violation.entity';
import { PolicyViolation } from '../../domain/value-objects/policy-rules.value-object';

export interface PolicyViolationRecord {
  policyId: string | null;
  travelerId: string;
  bookingRef?: string;
  violations: PolicyViolation[];
  requiresApproval: boolean;
}

@Injectable()
export class PolicyViolationRepository {
  constructor(
    @InjectRepository(PolicyViolationEntity)
    private readonly repo: Repository<PolicyViolationEntity>,
  ) {}

  async save(record: PolicyViolationRecord): Promise<PolicyViolationEntity> {
    const entity = new PolicyViolationEntity();
    entity.policyId = record.policyId;
    entity.travelerId = record.travelerId;
    entity.bookingRef = record.bookingRef ?? null;
    entity.violations = record.violations;
    entity.requiresApproval = record.requiresApproval;
    return this.repo.save(entity);
  }
}
