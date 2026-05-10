import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, AxiosInstance } from 'axios';
import axiosRetry, { isNetworkOrIdempotentRequestError } from 'axios-retry';
import CircuitBreaker from 'opossum';
import { BookingMetricsService } from '../metrics/booking-metrics.service';

export interface AuthorizeResponse {
  paymentId: string;
  status: string;
}

type AuthorizeArgs = [string, string, number, string, string];
type CaptureRefundArgs = [string, string];

@Injectable()
export class PaymentServiceClient {
  private readonly logger = new Logger(PaymentServiceClient.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly authorizeBreaker: CircuitBreaker<AuthorizeArgs, AuthorizeResponse>;
  private readonly captureBreaker: CircuitBreaker<CaptureRefundArgs, void>;
  private readonly refundBreaker: CircuitBreaker<CaptureRefundArgs, void>;

  constructor(
    private readonly config: ConfigService,
    private readonly metrics: BookingMetricsService,
  ) {
    const baseURL = this.config.get<string>('PAYMENT_SERVICE_URL') ?? 'http://payment-service:3004';
    const timeout = this.config.get<number>('PAYMENT_READ_TIMEOUT_MS') ?? 5000;

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
        this.metrics.incrementDownstreamRetries('payment');
        return isNetworkOrIdempotentRequestError(error);
      },
    });

    const axiosAuthorize = async (
      bookingId: string,
      travelerId: string,
      amount: number,
      currency: string,
      correlationId: string,
    ): Promise<AuthorizeResponse> => {
      const response = await this.axiosInstance.post<AuthorizeResponse>(
        '/api/v1/payments/authorize',
        { bookingId, travelerId, amount, currency },
        { headers: { 'x-correlation-id': correlationId } },
      );
      return response.data;
    };

    const axiosCapture = async (paymentId: string, correlationId: string): Promise<void> => {
      await this.axiosInstance.post(`/api/v1/payments/${paymentId}/capture`, {}, {
        headers: { 'x-correlation-id': correlationId },
      });
    };

    const axiosRefund = async (paymentId: string, correlationId: string): Promise<void> => {
      await this.axiosInstance.post(`/api/v1/payments/${paymentId}/refund`, {}, {
        headers: { 'x-correlation-id': correlationId },
      });
    };

    const cbOptions = {
      errorThresholdPercentage: 50,
      volumeThreshold: 10,
      timeout: 5000,
      resetTimeout: 30000,
    };

    this.authorizeBreaker = new CircuitBreaker(axiosAuthorize, cbOptions);
    this.authorizeBreaker.fallback((_bid: string, _tid: string, _amt: number, _cur: string, _corr: string) => {
      throw new ServiceUnavailableException('Payment service unavailable');
    });

    this.captureBreaker = new CircuitBreaker(axiosCapture, cbOptions);
    this.captureBreaker.fallback((_pid: string, _corr: string) => {
      throw new ServiceUnavailableException('Payment service unavailable');
    });

    this.refundBreaker = new CircuitBreaker(axiosRefund, cbOptions);
    this.refundBreaker.fallback((_pid: string, _corr: string) => {
      throw new ServiceUnavailableException('Payment service unavailable');
    });

    this.authorizeBreaker.on('open', () => {
      this.logger.warn('PaymentService circuit OPEN');
      this.metrics.setDownstreamCbState('payment', 'open');
    });
    this.authorizeBreaker.on('halfOpen', () => {
      this.logger.warn('PaymentService circuit HALF-OPEN');
      this.metrics.setDownstreamCbState('payment', 'half-open');
    });
    this.authorizeBreaker.on('close', () => {
      this.logger.log('PaymentService circuit CLOSED');
      this.metrics.setDownstreamCbState('payment', 'closed');
    });
  }

  async authorizePayment(
    bookingId: string,
    travelerId: string,
    amount: number,
    currency: string,
    correlationId: string,
  ): Promise<AuthorizeResponse> {
    return this.authorizeBreaker.fire(bookingId, travelerId, amount, currency, correlationId) as Promise<AuthorizeResponse>;
  }

  async capturePayment(paymentId: string, correlationId: string): Promise<void> {
    await (this.captureBreaker.fire(paymentId, correlationId) as Promise<void>);
  }

  async refundPayment(paymentId: string, correlationId: string): Promise<void> {
    await (this.refundBreaker.fire(paymentId, correlationId) as Promise<void>);
  }
}
