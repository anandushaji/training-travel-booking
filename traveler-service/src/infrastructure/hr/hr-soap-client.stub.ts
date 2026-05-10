import { Injectable, Logger } from '@nestjs/common';
import CircuitBreaker from 'opossum';
import { HrSystemUnavailableException } from '../../domain/exceptions/hr-system-unavailable.exception';

export interface HrEmployee {
  employeeId: string;
  name: string;
  email: string;
  department: string;
  role?: string;
}

/**
 * Stub for the HR SOAP system.
 * In production this would call the real SOAP endpoint via node-soap.
 * For now it is an injectable stub driven by HR_SYSTEM_URL + Basic Auth.
 */
@Injectable()
export class HrSoapClientStub {
  private readonly logger = new Logger(HrSoapClientStub.name);
  private readonly breaker: CircuitBreaker;

  constructor(private readonly hrSystemUrl: string) {
    this.breaker = new CircuitBreaker(
      (payload: HrEmployee[]) => this._fetchFromSoap(payload),
      {
        errorThresholdPercentage: 50,
        volumeThreshold: 10,
        timeout: 30000,
        resetTimeout: 30000,
        name: 'hr-soap',
      },
    );

    this.breaker.fallback(() => {
      throw new HrSystemUnavailableException();
    });

    this.breaker.on('open', () =>
      this.logger.warn('HR SOAP circuit breaker OPEN'),
    );
    this.breaker.on('halfOpen', () =>
      this.logger.warn('HR SOAP circuit breaker HALF-OPEN'),
    );
    this.breaker.on('close', () =>
      this.logger.log('HR SOAP circuit breaker CLOSED'),
    );
  }

  async fetchEmployees(payload: HrEmployee[]): Promise<HrEmployee[]> {
    return this.breaker.fire(payload) as Promise<HrEmployee[]>;
  }

  /** Exposes the raw breaker for metrics/testing. */
  getBreaker(): CircuitBreaker {
    return this.breaker;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async _fetchFromSoap(_payload: HrEmployee[]): Promise<HrEmployee[]> {
    // Stub: return the payload as-is (simulates HR returning the same records)
    this.logger.debug(`HR SOAP stub called: ${this.hrSystemUrl}`);
    return _payload;
  }
}
