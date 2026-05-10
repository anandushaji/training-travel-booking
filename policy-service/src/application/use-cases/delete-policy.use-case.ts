import { Injectable } from '@nestjs/common';
import { NotFoundException } from '@travel/shared';
import { TravelPolicyRepository } from '../../infrastructure/repositories/travel-policy.repository';
import { PolicyCacheService } from '../../infrastructure/cache/policy-cache.service';

@Injectable()
export class DeletePolicyUseCase {
  constructor(
    private readonly policyRepository: TravelPolicyRepository,
    private readonly cacheService: PolicyCacheService,
  ) {}

  async execute(id: string): Promise<void> {
    const policy = await this.policyRepository.findById(id);
    if (!policy) {
      throw new NotFoundException(`Policy with id "${id}" not found`);
    }

    await this.policyRepository.delete(id);
    await this.cacheService.invalidateDepartmentPolicies(policy.department);
  }
}
