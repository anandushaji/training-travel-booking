import { Test, TestingModule } from '@nestjs/testing';
import { PaymentMethodController } from './payment-method.controller';
import { AttachPaymentMethodUseCase } from '../../application/use-cases/attach-payment-method/attach-payment-method.use-case';
import { DetachPaymentMethodUseCase } from '../../application/use-cases/detach-payment-method/detach-payment-method.use-case';
import { ListPaymentMethodsUseCase } from '../../application/use-cases/list-payment-methods/list-payment-methods.use-case';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

const TEST_UUID = '00000000-0000-4000-8000-000000000001';

function mockRequest(travelerId = TEST_UUID): any {
  return { user: { sub: travelerId }, headers: {} };
}

describe('PaymentMethodController', () => {
  let controller: PaymentMethodController;
  let mockAttach: jest.Mocked<any>;
  let mockDetach: jest.Mocked<any>;
  let mockList: jest.Mocked<any>;

  beforeEach(async () => {
    mockAttach = { execute: jest.fn() };
    mockDetach = { execute: jest.fn() };
    mockList = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentMethodController],
      providers: [
        { provide: AttachPaymentMethodUseCase, useValue: mockAttach },
        { provide: DetachPaymentMethodUseCase, useValue: mockDetach },
        { provide: ListPaymentMethodsUseCase, useValue: mockList },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PaymentMethodController>(PaymentMethodController);
  });

  it('should not include stripePaymentMethodId in GET /payment-methods response', async () => {
    mockList.execute.mockResolvedValue([
      {
        paymentMethodId: TEST_UUID,
        travelerId: TEST_UUID,
        cardBrand: 'visa',
        last4: '4242',
        expiryMonth: 12,
        expiryYear: 2027,
        isActive: true,
        createdAt: new Date(),
      },
    ]);

    const result = await controller.list(mockRequest());

    expect(Array.isArray(result)).toBe(true);
    for (const item of result) {
      expect(item).not.toHaveProperty('stripePaymentMethodId');
    }
  });

  it('should call attach use case with travelerId from JWT', async () => {
    mockAttach.execute.mockResolvedValue({
      paymentMethodId: TEST_UUID,
      travelerId: TEST_UUID,
      cardBrand: 'visa',
      last4: '4242',
      expiryMonth: 12,
      expiryYear: 2027,
      isActive: true,
      createdAt: new Date(),
    });

    await controller.attach(
      {
        stripePaymentMethodId: 'pm_test_visa4242',
        cardBrand: 'visa',
        last4: '4242',
        expiryMonth: 12,
        expiryYear: 2027,
      } as any,
      mockRequest(),
    );

    expect(mockAttach.execute).toHaveBeenCalledWith(
      expect.objectContaining({ travelerId: TEST_UUID }),
    );
  });
});
