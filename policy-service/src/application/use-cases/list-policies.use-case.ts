import { Injectable } from '@nestjs/common';
import { TravelPolicyRepository } from '../../infrastructure/repositories/travel-policy.repository';
import { PolicyResponseDto } from '../dtos/policy-response.dto';
import { PolicyMapper } from '../mappers/policy.mapper';

export interface ListPoliciesFilters {
  department?: string;
  active?: boolean;
}

@Injectable()
export class ListPoliciesUseCase {
  constructor(private readonly policyRepository: TravelPolicyRepository) {}

  async execute(filters: ListPoliciesFilters = {}): Promise<PolicyResponseDto[]> {
    const policies = await this.policyRepository.findAll(filters);
    return policies.map((p) => PolicyMapper.toDto(p));
  }
}
