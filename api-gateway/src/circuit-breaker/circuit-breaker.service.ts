import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import CircuitBreaker = require('opossum');

export interface MetricsServiceInterface {
  setCircuitState(service: string, state: 0 | 0.5 | 1): void;
  incrementCircuitBreakerErrors(service: string): void;
}

@Injectable()
export class CircuitBreakerService {
  private readonly breakers = new Map<string, CircuitBreaker>();
  private metricsService: MetricsServiceInterface | null = null;

  setMetricsService(metrics: MetricsServiceInterface): void {
    this.metricsService = metrics;
  }

  getBreaker(serviceName: string): CircuitBreaker {
    const existing = this.breakers.get(serviceName);
    if (existing) return existing;

    const breaker = new CircuitBreaker(async (fn: () => Promise<unknown>) => fn(), {
      errorThresholdPercentage: 50,
      volumeThreshold: 10,
      rollingCountTimeout: 30000,
      resetTimeout: 30000,
    });

    breaker.fallback(() => {
      throw new ServiceUnavailableException(`${serviceName}-service circuit open`);
    });

    breaker.on('open', () => {
      this.metricsService?.setCircuitState(serviceName, 1);
    });
    breaker.on('halfOpen', () => {
      this.metricsService?.setCircuitState(serviceName, 0.5);
    });
    breaker.on('close', () => {
      this.metricsService?.setCircuitState(serviceName, 0);
    });
    breaker.on('failure', () => {
      this.metricsService?.incrementCircuitBreakerErrors(serviceName);
    });

    this.breakers.set(serviceName, breaker);
    return breaker;
  }

  async execute<T>(serviceName: string, fn: () => Promise<T>): Promise<T> {
    const breaker = this.getBreaker(serviceName);
    return breaker.fire(fn) as Promise<T>;
  }
}
