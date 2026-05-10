import { Injectable } from '@nestjs/common';
import { NotFoundException } from '@travel/shared';
import { TravelPolicyRepository } from '../../infrastructure/repositories/travel-policy.repository';
import { PolicyCacheService } from '../../infrastructure/cache/policy-cache.service';
import { UpdatePolicyDto } from '../dtos/update-policy.dto';
import { PolicyResponseDto } from '../dtos/policy-response.dto';
import { PolicyMapper } from '../mappers/policy.mapper';

@Injectable()
export class UpdatePolicyUseCase {
  constructor(
    private readonly policyRepository: TravelPolicyRepository,
    private readonly cacheService: PolicyCacheService,
  ) {}

  async execute(id: string, dto: UpdatePolicyDto): Promise<PolicyResponseDto> {
    const policy = await this.policyRepository.findById(id);
    if (!policy) {
      throw new NotFoundException(`Policy with id "${id}" not found`);
    }

    policy.update({
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.active !== undefined && { active: dto.active }),
      ...(dto.rules !== undefined && { rules: dto.rules as any }),
    });

    const saved = await this.policyRepository.save(policy);
    await this.cacheService.invalidateDepartmentPolicies(policy.department);

    return PolicyMapper.toDto(saved);
  }
}
