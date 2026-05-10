import { Injectable } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { ConflictException } from '@travel/shared';
import { TravelPolicy } from '../../domain/aggregates/travel-policy.aggregate';
import { TravelPolicyRepository } from '../../infrastructure/repositories/travel-policy.repository';
import { PolicyCacheService } from '../../infrastructure/cache/policy-cache.service';
import { CreatePolicyDto } from '../dtos/create-policy.dto';
import { PolicyResponseDto } from '../dtos/policy-response.dto';
import { PolicyMapper } from '../mappers/policy.mapper';

@Injectable()
export class CreatePolicyUseCase {
  constructor(
    private readonly policyRepository: TravelPolicyRepository,
    private readonly cacheService: PolicyCacheService,
  ) {}

  async execute(dto: CreatePolicyDto, createdBy: string): Promise<PolicyResponseDto> {
    const policy = TravelPolicy.create(
      {
        name: dto.name,
        ...(dto.description !== undefined && { description: dto.description }),
        department: dto.department,
        rules: dto.rules,
      },
      createdBy,
    );

    let saved: TravelPolicy;
    try {
      saved = await this.policyRepository.save(policy);
    } catch (err) {
      if (
        err instanceof QueryFailedError &&
        (err as any).code === '23505'
      ) {
        throw new ConflictException(
          'Policy already exists for this name and department',
          'POLICY_ALREADY_EXISTS',
        );
      }
      throw err;
    }

    await this.cacheService.invalidateDepartmentPolicies(policy.department);

    return PolicyMapper.toDto(saved);
  }
}
