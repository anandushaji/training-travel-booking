import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, AxiosInstance } from 'axios';
import axiosRetry, { isNetworkOrIdempotentRequestError } from 'axios-retry';
import CircuitBreaker from 'opossum';
import { BookingMetricsService } from '../metrics/booking-metrics.service';

export interface PolicyValidationRequest {
  travelerId: string;
  department: string;
  offerId: string;
  totalAmount: number;
  currency: string;
  itinerary: Record<string, unknown>;
}

export interface PolicyValidationResponse {
  valid: boolean;
  policyId?: string;
  violations?: string[];
}

type PolicyValidationArgs = [PolicyValidationRequest, string];

@Injectable()
export class PolicyServiceClient {
  private readonly logger = new Logger(PolicyServiceClient.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly breaker: CircuitBreaker<PolicyValidationArgs, PolicyValidationResponse>;

  constructor(
    private readonly config: ConfigService,
    private readonly metrics: BookingMetricsService,
  ) {
    const baseURL = this.config.get<string>('POLICY_SERVICE_URL') ?? 'http://policy-service:3002';
    const timeout = this.config.get<number>('POLICY_READ_TIMEOUT_MS') ?? 5000;

    this.axiosInstance = axios.create({ baseURL, timeout });

    axiosRetry(this.axiosInstance, {
      retries: 3,
      retryDelay: (retryCount: number) => {
        const base = Math.min(200 * Math.pow(2, retryCount), 5000);
        return base * (1 + (Math.random() - 0.5) * 0.5);
      },
      retryCondition: (error: AxiosError) => {
        const status = (error.response as { status?: number } | undefined)?.status;
        if (status !== undefined && status >= 400 && status < 500 && status !== 429) {
          return false;
        }
        this.metrics.incrementDownstreamRetries('policy');
        return isNetworkOrIdempotentRequestError(error);
      },
    });

    const axiosValidate = async (request: PolicyValidationRequest, correlationId: string): Promise<PolicyValidationResponse> => {
      const response = await this.axiosInstance.post<PolicyValidationResponse>(
        '/api/v1/policies/validate',
        request,
        { headers: { 'x-correlation-id': correlationId } },
      );
      return response.data;
    };

    this.breaker = new CircuitBreaker(axiosValidate, {
      errorThresholdPercentage: 50,
      volumeThreshold: 10,
      timeout: 5000,
      resetTimeout: 30000,
    });

    this.breaker.fallback((_req: PolicyValidationRequest, _corr: string) => {
      throw new ServiceUnavailableException('Policy service unavailable');
    });

    this.breaker.on('open', () => {
      this.logger.warn('PolicyService circuit OPEN');
      this.metrics.setDownstreamCbState('policy', 'open');
    });
    this.breaker.on('halfOpen', () => {
      this.logger.warn('PolicyService circuit HALF-OPEN');
      this.metrics.setDownstreamCbState('policy', 'half-open');
    });
    this.breaker.on('close', () => {
      this.logger.log('PolicyService circuit CLOSED');
      this.metrics.setDownstreamCbState('policy', 'closed');
    });
  }

  async validatePolicy(
    request: PolicyValidationRequest,
    correlationId: string,
  ): Promise<PolicyValidationResponse> {
    return this.breaker.fire(request, correlationId) as Promise<PolicyValidationResponse>;
  }
}
