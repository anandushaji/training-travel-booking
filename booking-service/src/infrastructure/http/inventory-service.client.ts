import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, AxiosInstance } from 'axios';
import axiosRetry, { isNetworkOrIdempotentRequestError } from 'axios-retry';
import CircuitBreaker from 'opossum';
import { BookingMetricsService } from '../metrics/booking-metrics.service';

export interface ReservationResponse {
  reservationId: string;
  status: string;
}

type CreateReservationArgs = [string, Record<string, unknown>, string];
type CancelReservationArgs = [string, string];

@Injectable()
export class InventoryServiceClient {
  private readonly logger = new Logger(InventoryServiceClient.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly createBreaker: CircuitBreaker<CreateReservationArgs, ReservationResponse>;
  private readonly cancelBreaker: CircuitBreaker<CancelReservationArgs, void>;

  constructor(
    private readonly config: ConfigService,
    private readonly metrics: BookingMetricsService,
  ) {
    const baseURL = this.config.get<string>('INVENTORY_SERVICE_URL') ?? 'http://inventory-service:3005';
    const timeout = this.config.get<number>('INVENTORY_READ_TIMEOUT_MS') ?? 5000;

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
        this.metrics.incrementDownstreamRetries('inventory');
        return isNetworkOrIdempotentRequestError(error);
      },
    });

    const axiosCreateReservation = async (
      offerId: string,
      itinerary: Record<string, unknown>,
      correlationId: string,
    ): Promise<ReservationResponse> => {
      const response = await this.axiosInstance.post<ReservationResponse>(
        '/api/v1/inventory/reservations',
        { offerId, itinerary },
        { headers: { 'x-correlation-id': correlationId } },
      );
      return response.data;
    };

    const axiosCancelReservation = async (
      reservationId: string,
      correlationId: string,
    ): Promise<void> => {
      await this.axiosInstance.delete(`/api/v1/inventory/reservations/${reservationId}`, {
        headers: { 'x-correlation-id': correlationId },
      });
    };

    this.createBreaker = new CircuitBreaker(axiosCreateReservation, {
      errorThresholdPercentage: 50,
      volumeThreshold: 10,
      timeout: 5000,
      resetTimeout: 30000,
    });

    this.createBreaker.fallback((_offerId: string, _itinerary: Record<string, unknown>, _corr: string) => {
      throw new ServiceUnavailableException('Inventory service unavailable');
    });

    this.cancelBreaker = new CircuitBreaker(axiosCancelReservation, {
      errorThresholdPercentage: 50,
      volumeThreshold: 10,
      timeout: 5000,
      resetTimeout: 30000,
    });

    this.cancelBreaker.fallback((_reservationId: string, _corr: string) => {
      throw new ServiceUnavailableException('Inventory service unavailable');
    });

    this.createBreaker.on('open', () => {
      this.logger.warn('InventoryService circuit OPEN');
      this.metrics.setDownstreamCbState('inventory', 'open');
    });
    this.createBreaker.on('halfOpen', () => {
      this.logger.warn('InventoryService circuit HALF-OPEN');
      this.metrics.setDownstreamCbState('inventory', 'half-open');
    });
    this.createBreaker.on('close', () => {
      this.logger.log('InventoryService circuit CLOSED');
      this.metrics.setDownstreamCbState('inventory', 'closed');
    });
  }

  async createReservation(
    offerId: string,
    itinerary: Record<string, unknown>,
    correlationId: string,
  ): Promise<ReservationResponse> {
    return this.createBreaker.fire(offerId, itinerary, correlationId) as Promise<ReservationResponse>;
  }

  async cancelReservation(reservationId: string, correlationId: string): Promise<void> {
    await (this.cancelBreaker.fire(reservationId, correlationId) as Promise<void>);
  }
}
