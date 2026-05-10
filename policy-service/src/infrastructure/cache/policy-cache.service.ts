import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { TravelPolicy } from '../../domain/aggregates/travel-policy.aggregate';
import { PolicyRules } from '../../domain/value-objects/policy-rules.value-object';
import { TravelPolicyProps } from '../../domain/aggregates/travel-policy.aggregate';
import { PolicyMetricsService } from '../metrics/policy-metrics.service';

const POLICY_DEPT_TTL = 900; // 15 minutes
const TRAVELER_DEPT_TTL = 3600; // 1 hour

@Injectable()
export class PolicyCacheService {
  private readonly logger = new Logger(PolicyCacheService.name);
  private readonly redis: Redis;

  constructor(
    private readonly config: ConfigService,
    private readonly metrics: PolicyMetricsService,
  ) {
    const redisUrl = this.config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
    this.redis = new Redis(redisUrl);

    this.redis.on('error', (err: Error) => {
      this.logger.warn(`Redis connection error: ${err.message}`);
    });
  }

  private policyDeptKey(department: string): string {
    return `policy-service:policy:dept:${department}`;
  }

  private travelerDeptKey(travelerId: string): string {
    return `policy-service:traveler-dept:${travelerId}`;
  }

  async getPoliciesForDepartment(dept: string): Promise<TravelPolicy[] | null> {
    try {
      const raw = await this.redis.get(this.policyDeptKey(dept));
      if (raw === null) {
        this.metrics.incrementCacheMisses('policy');
        return null;
      }
      this.metrics.incrementCacheHits('policy');
      const parsed = JSON.parse(raw) as TravelPolicyProps[];
      return parsed.map((p) => {
        const props: TravelPolicyProps = {
          ...p,
          rules: PolicyRules.fromPlain(p.rules as any),
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt),
        };
        return TravelPolicy.reconstitute(props);
      });
    } catch (err) {
      this.logger.warn(`Redis GET error for dept ${dept}: ${(err as Error).message}`);
      return null;
    }
  }

  async setPoliciesForDepartment(dept: string, policies: TravelPolicy[]): Promise<void> {
    try {
      const serialised = policies.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        department: p.department,
        rules: p.rules.toPlain(),
        active: p.active,
        createdBy: p.createdBy,
        version: p.version,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      }));
      await this.redis.setex(this.policyDeptKey(dept), POLICY_DEPT_TTL, JSON.stringify(serialised));
    } catch (err) {
      this.logger.warn(`Redis SETEX error for dept ${dept}: ${(err as Error).message}`);
    }
  }

  async invalidateDepartmentPolicies(dept: string): Promise<void> {
    try {
      await this.redis.del(this.policyDeptKey(dept));
    } catch (err) {
      this.logger.warn(`Redis DEL error for dept ${dept}: ${(err as Error).message}`);
    }
  }

  async getTravelerDepartment(travelerId: string): Promise<string | null> {
    try {
      const raw = await this.redis.get(this.travelerDeptKey(travelerId));
      if (raw === null) {
        this.metrics.incrementCacheMisses('traveler');
        return null;
      }
      this.metrics.incrementCacheHits('traveler');
      return raw;
    } catch (err) {
      this.logger.warn(`Redis GET error for traveler ${travelerId}: ${(err as Error).message}`);
      return null;
    }
  }

  async setTravelerDepartment(travelerId: string, dept: string): Promise<void> {
    try {
      await this.redis.setex(this.travelerDeptKey(travelerId), TRAVELER_DEPT_TTL, dept);
    } catch (err) {
      this.logger.warn(`Redis SETEX error for traveler ${travelerId}: ${(err as Error).message}`);
    }
  }
}
