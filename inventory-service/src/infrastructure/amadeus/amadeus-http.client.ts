import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance, AxiosError } from 'axios';
import CircuitBreaker from 'opossum';
import { AmadeusTokenService } from './amadeus-token.service';
import { AmadeusUnavailableException } from '../../domain/exceptions/amadeus-unavailable.exception';
import { AmadeusNotFoundException } from '../../domain/exceptions/amadeus-not-found.exception';
import { DomainException } from '@travel/shared';
import { ConfigService } from '@nestjs/config';

const NON_RETRYABLE_CODES = new Set([400, 401, 403, 404, 422]);
const RETRYABLE_CODES = new Set([500, 502, 503, 504, 408]);

const MAX_ATTEMPTS = 4; // 1 original + 3 retries
const BASE_DELAY_MS = 200;
const MAX_DELAY_MS = 5_000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => { global.setTimeout(r, ms); });
}

function jitteredBackoff(attempt: number): number {
  const exp = BASE_DELAY_MS * Math.pow(2, attempt - 1);
  const capped = Math.min(exp, MAX_DELAY_MS);
  const jitter = capped * 0.5 * (Math.random() * 2 - 1);
  return Math.max(0, capped + jitter);
}

@Injectable()
export class AmadeusHttpClient {
  private readonly logger = new Logger(AmadeusHttpClient.name);
  private readonly axiosInstance: AxiosInstance;
  // Circuit breaker wraps the entire retry-capable call
  private readonly breaker: CircuitBreaker<[() => Promise<unknown>], unknown>;

  constructor(
    private readonly tokenService: AmadeusTokenService,
    private readonly config: ConfigService,
  ) {
    const baseURL = this.config.get<string>('AMADEUS_BASE_URL') ?? 'https://test.api.amadeus.com';

    this.axiosInstance = axios.create({
      baseURL,
      timeout: 15_000,
    });

    // Request interceptor — inject Bearer token
    this.axiosInstance.interceptors.request.use(async (cfg) => {
      const token = await this.tokenService.getToken();
      cfg.headers = cfg.headers ?? {};
      cfg.headers['Authorization'] = `Bearer ${token}`;
      return cfg;
    });

    // Response interceptor — normalise errors
    this.axiosInstance.interceptors.response.use(
      (res) => res,
      (err: AxiosError) => {
        const status = err.response?.status;
        if (status === 404) {
          throw new AmadeusNotFoundException(`Amadeus returned 404: ${err.message}`);
        }
        // Attach status to error for retry logic
        const enhanced = err as AxiosError & { amadeusStatus?: number };
        if (status !== undefined) {
          enhanced.amadeusStatus = status;
        }
        throw enhanced;
      },
    );

    // opossum circuit breaker — wraps the entire call-with-retry
    // The circuit sees only the final outcome (success or exhausted-retries failure)
    this.breaker = new CircuitBreaker(
      (fn: () => Promise<unknown>) => this._withRetry(fn),
      {
        errorThresholdPercentage: 50,
        volumeThreshold: 10,
        timeout: 60_000,   // generous outer timeout; axios enforces the 15s per-call timeout
        resetTimeout: 30_000,
      },
    );

    this.breaker.on('open', () => this.logger.warn('Amadeus circuit OPEN'));
    this.breaker.on('halfOpen', () => this.logger.warn('Amadeus circuit HALF-OPEN'));
    this.breaker.on('close', () => this.logger.log('Amadeus circuit CLOSED'));
  }

  private async _withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        return await fn();
      } catch (err) {
        // Non-retryable domain exceptions — re-throw immediately
        if (err instanceof AmadeusNotFoundException) throw err;
        if (err instanceof DomainException) throw err;

        const status = (err as AxiosError & { amadeusStatus?: number }).amadeusStatus;
        if (status !== undefined && NON_RETRYABLE_CODES.has(status)) {
          throw err;
        }

        if (attempt >= MAX_ATTEMPTS) {
          lastError = err;
          break;
        }

        const delay = jitteredBackoff(attempt);
        this.logger.warn(`Amadeus retry attempt ${attempt}, delay ${Math.round(delay)}ms`);
        await sleep(delay);
        lastError = err;
      }
    }
    throw lastError;
  }

  private async _execute<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await (this.breaker.fire(fn as () => Promise<unknown>) as Promise<T>);
    } catch (err) {
      // Domain exceptions (e.g. AmadeusNotFoundException) must propagate unchanged.
      // Non-domain errors when the circuit is OPEN become AmadeusUnavailableException.
      if (!(err instanceof DomainException) && this.breaker.opened) {
        throw new AmadeusUnavailableException('Amadeus circuit is open');
      }
      throw err;
    }
  }

  async searchFlights(params: Record<string, unknown>): Promise<unknown> {
    return this._execute(() =>
      this.axiosInstance.get('/v2/shopping/flight-offers', { params }).then((r) => r.data),
    );
  }

  async createOrder(body: Record<string, unknown>): Promise<unknown> {
    return this._execute(() =>
      this.axiosInstance.post('/v1/booking/flight-orders', body).then((r) => r.data),
    );
  }

  async cancelOrder(orderId: string): Promise<void> {
    await this._execute(() =>
      this.axiosInstance.delete(`/v1/booking/flight-orders/${orderId}`).then(() => undefined),
    );
  }
}
