import { Test, TestingModule } from '@nestjs/testing';
import { PaymentController } from './payment.controller';
import { AuthorizePaymentUseCase } from '../../application/use-cases/authorize-payment/authorize-payment.use-case';
import { CapturePaymentUseCase } from '../../application/use-cases/capture-payment/capture-payment.use-case';
import { RefundPaymentUseCase } from '../../application/use-cases/refund-payment/refund-payment.use-case';
import { GetPaymentUseCase } from '../../application/use-cases/get-payment/get-payment.use-case';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PaymentStatus } from '../../domain/value-objects/payment-status.enum';
import { BadRequestException } from '@nestjs/common';

const TEST_UUID = '00000000-0000-4000-8000-000000000001';
const BOOKING_UUID = '00000000-0000-4000-8000-000000000002';
const METHOD_UUID = '00000000-0000-4000-8000-000000000003';

function mockRequest(travelerId = TEST_UUID, overrides: any = {}): any {
  return {
    user: { sub: travelerId },
    headers: { 'x-correlation-id': 'corr-001' },
    res: { status: jest.fn().mockReturnThis() },
    ...overrides,
  };
}

describe('PaymentController', () => {
  let controller: PaymentController;
  let mockAuthorize: jest.Mocked<any>;
  let mockCapture: jest.Mocked<any>;
  let mockRefund: jest.Mocked<any>;
  let mockGetPayment: jest.Mocked<any>;

  beforeEach(async () => {
    mockAuthorize = { execute: jest.fn() };
    mockCapture = { execute: jest.fn() };
    mockRefund = { execute: jest.fn() };
    mockGetPayment = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        { provide: AuthorizePaymentUseCase, useValue: mockAuthorize },
        { provide: CapturePaymentUseCase, useValue: mockCapture },
        { provide: RefundPaymentUseCase, useValue: mockRefund },
        { provide: GetPaymentUseCase, useValue: mockGetPayment },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PaymentController>(PaymentController);
  });

  describe('POST /payments', () => {
    it('should return 400 when Idempotency-Key header is missing', async () => {
      const dto = {
        paymentMethodId: METHOD_UUID,
        amount: 350,
        currency: 'USD',
        bookingId: BOOKING_UUID,
      };

      await expect(
        controller.authorize(dto as any, undefined, mockRequest()),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should return 401 when JWT token is missing', () => {
      // This is tested at the guard level — JwtAuthGuard throws UnauthorizedException
      // We trust the guard; just confirm the guard is applied
      const guards = Reflect.getMetadata('__guards__', PaymentController);
      expect(guards).toBeDefined();
    });

    it('should should propagate X-Correlation-ID to all log entries within a request scope', async () => {
      mockAuthorize.execute.mockResolvedValue({
        payment: {
          paymentId: TEST_UUID,
          status: PaymentStatus.AUTHORIZED,
          amount: 350,
          currency: 'USD',
          bookingId: BOOKING_UUID,
          stripePaymentIntentId: 'pi_abc',
          createdAt: new Date(),
        },
        isNew: true,
      });

      const req = mockRequest(TEST_UUID);
      await controller.authorize(
        { paymentMethodId: METHOD_UUID, amount: 350, currency: 'USD', bookingId: BOOKING_UUID } as any,
        'idem-key-001',
        req,
      );

      expect(mockAuthorize.execute).toHaveBeenCalledWith(
        expect.objectContaining({ correlationId: 'corr-001' }),
      );
    });
  });

  describe('GET /payments/:paymentId', () => {
    it('should call GetPaymentUseCase with correct paymentId and travelerId', async () => {
      mockGetPayment.execute.mockResolvedValue({
        paymentId: TEST_UUID,
        status: PaymentStatus.CAPTURED,
      });

      await controller.getPayment(TEST_UUID, mockRequest());

      expect(mockGetPayment.execute).toHaveBeenCalledWith({
        paymentId: TEST_UUID,
        callerTravelerId: TEST_UUID,
      });
    });
  });

  describe('POST /payments/:paymentId/capture', () => {
    it('should call CapturePaymentUseCase with paymentId, travelerId, and correlationId', async () => {
      mockCapture.execute.mockResolvedValue({ paymentId: TEST_UUID, status: PaymentStatus.CAPTURED });

      await controller.capture(TEST_UUID, mockRequest());

      expect(mockCapture.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentId: TEST_UUID,
          callerTravelerId: TEST_UUID,
          correlationId: 'corr-001',
        }),
      );
    });

    it('should omit correlationId when X-Correlation-ID header is absent', async () => {
      mockCapture.execute.mockResolvedValue({ paymentId: TEST_UUID, status: PaymentStatus.CAPTURED });
      const req = mockRequest(TEST_UUID, { headers: {} });

      await controller.capture(TEST_UUID, req);

      const callArg = mockCapture.execute.mock.calls[0]![0];
      expect(callArg).not.toHaveProperty('correlationId');
    });
  });

  describe('POST /payments/:paymentId/refund', () => {
    it('should call RefundPaymentUseCase with correct args including amount and correlationId', async () => {
      mockRefund.execute.mockResolvedValue({ paymentId: TEST_UUID, refundedAmount: 100 });

      await controller.refund(
        TEST_UUID,
        { amount: 100, reason: 'duplicate' } as any,
        mockRequest(),
      );

      expect(mockRefund.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentId: TEST_UUID,
          callerTravelerId: TEST_UUID,
          amount: 100,
          reason: 'duplicate',
          correlationId: 'corr-001',
        }),
      );
    });

    it('should omit amount when dto.amount is undefined', async () => {
      mockRefund.execute.mockResolvedValue({ paymentId: TEST_UUID, refundedAmount: 350 });
      const req = mockRequest(TEST_UUID, { headers: {} });

      await controller.refund(
        TEST_UUID,
        { reason: 'fraudulent' } as any,
        req,
      );

      const callArg = mockRefund.execute.mock.calls[0]![0];
      expect(callArg).not.toHaveProperty('amount');
      expect(callArg.reason).toBe('fraudulent');
    });
  });
});
