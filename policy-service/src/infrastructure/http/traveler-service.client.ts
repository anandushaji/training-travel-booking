import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, AxiosInstance } from 'axios';
import axiosRetry, { isNetworkOrIdempotentRequestError } from 'axios-retry';
import CircuitBreaker from 'opossum';
import { PolicyMetricsService } from '../metrics/policy-metrics.service';

interface TravelerResponse {
  department: string;
}

@Injectable()
export class TravelerServiceClient {
  private readonly logger = new Logger(TravelerServiceClient.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly breaker: CircuitBreaker<[string, string], TravelerResponse>;

  constructor(
    private readonly config: ConfigService,
    private readonly metrics: PolicyMetricsService,
  ) {
    const baseURL = this.config.get<string>('TRAVELER_SERVICE_URL') ?? 'http://traveler-service:3001';
    const timeout = this.config.get<number>('TRAVELER_SERVICE_READ_TIMEOUT_MS') ?? 5000;

    this.axiosInstance = axios.create({ baseURL, timeout });

    axiosRetry(this.axiosInstance, {
      retries: 3,
      retryDelay: (retryCount: number) => {
        const base = Math.min(200 * Math.pow(2, retryCount), 5000);
        return base * (1 + (Math.random() - 0.5) * 0.5);
      },
      retryCondition: (error: AxiosError) => {
        // Non-retryable: 4xx except 429
        const status = (error.response as { status?: number } | undefined)?.status;
        if (status !== undefined && status >= 400 && status < 500 && status !== 429) {
          return false;
        }
        this.metrics.incrementTravelerServiceRetries();
        return isNetworkOrIdempotentRequestError(error);
      },
    });

    // axiosGetTraveler accepts both travelerId and jwtDept (fallback uses jwtDept)
    const axiosGetTraveler = async (travelerId: string, _jwtDept: string): Promise<TravelerResponse> => {
      const response = await this.axiosInstance.get<TravelerResponse>(
        `/api/v1/travelers/${travelerId}`,
      );
      return response.data;
    };

    this.breaker = new CircuitBreaker(axiosGetTraveler, {
      errorThresholdPercentage: 50,
      volumeThreshold: 10,
      timeout: 5000,
      resetTimeout: 30000,
    });

    this.breaker.fallback((_travelerId: string, jwtDept: string) => ({ department: jwtDept }));

    this.breaker.on('open', () => {
      this.logger.warn('TravelerService circuit OPEN');
      this.metrics.setTravelerServiceCbState('open');
    });
    this.breaker.on('halfOpen', () => {
      this.logger.warn('TravelerService circuit HALF-OPEN');
      this.metrics.setTravelerServiceCbState('half-open');
    });
    this.breaker.on('close', () => {
      this.logger.log('TravelerService circuit CLOSED');
      this.metrics.setTravelerServiceCbState('closed');
    });
  }

  async getTravelerDepartment(
    travelerId: string,
    jwtDepartment: string,
  ): Promise<string> {
    const result = await (this.breaker.fire(travelerId, jwtDepartment) as Promise<TravelerResponse>);
    return result.department;
  }
}
