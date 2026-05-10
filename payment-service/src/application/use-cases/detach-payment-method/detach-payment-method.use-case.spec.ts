import { DetachPaymentMethodUseCase, ForbiddenException } from './detach-payment-method.use-case';
import { NotFoundException } from '@travel/shared';

const TEST_UUID = '00000000-0000-4000-8000-000000000001';
const OTHER_UUID = '00000000-0000-4000-8000-000000000002';

function makeMethod(overrides: any = {}): any {
  return {
    paymentMethodId: TEST_UUID,
    travelerId: TEST_UUID,
    stripePaymentMethodId: 'pm_test_visa4242',
    isActive: true,
    deactivate: jest.fn(),
    ...overrides,
  };
}

describe('DetachPaymentMethodUseCase', () => {
  let useCase: DetachPaymentMethodUseCase;
  let mockRepo: jest.Mocked<any>;
  let mockStripe: jest.Mocked<any>;

  beforeEach(() => {
    mockRepo = {
      findById: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockStripe = {
      detachPaymentMethod: jest.fn().mockResolvedValue({}),
    };
    useCase = new DetachPaymentMethodUseCase(mockRepo, mockStripe);
  });

  it('should throw ForbiddenException when travelerId does not match', async () => {
    mockRepo.findById.mockResolvedValue(makeMethod({ travelerId: OTHER_UUID }));

    await expect(
      useCase.execute({ paymentMethodId: TEST_UUID, callerTravelerId: TEST_UUID }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('should deactivate payment method locally even when Stripe call fails', async () => {
    const method = makeMethod();
    mockRepo.findById.mockResolvedValue(method);
    mockStripe.detachPaymentMethod.mockRejectedValue(new Error('Stripe error'));

    await useCase.execute({ paymentMethodId: TEST_UUID, callerTravelerId: TEST_UUID });

    expect(method.deactivate).toHaveBeenCalled();
    expect(mockRepo.save).toHaveBeenCalledWith(method);
  });

  it('should throw NotFoundException when payment method not found', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ paymentMethodId: TEST_UUID, callerTravelerId: TEST_UUID }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
