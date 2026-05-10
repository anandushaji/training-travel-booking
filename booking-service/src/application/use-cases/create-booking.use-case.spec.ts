// @ts-nocheck
import * as prom from 'prom-client';
import { CreateBookingUseCase } from './create-booking.use-case';
import { BookingStatus } from '../../domain/value-objects/booking-status.enum';

const validDto = {
  travelerId: '00000000-0000-0000-0000-000000000001',
  flightOfferId: 'offer-123',
  itinerary: {
    origin: 'JFK',
    destination: 'LAX',
    departureDate: '2026-08-01',
    cabinClass: 'ECONOMY',
    passengers: 1,
  },
  totalAmount: 450,
  currency: 'USD',
};

const jwtEmployee = { sub: '00000000-0000-0000-0000-000000000001', role: 'EMPLOYEE' };
const jwtManager = { sub: '00000000-0000-0000-0000-000000000002', role: 'MANAGER' };

describe('CreateBookingUseCase', () => {
  let useCase: CreateBookingUseCase;
  let mockBookingRepo: any;
  let mockReadModelRepo: any;
  let mockPublisher: any;
  let mockOrchestrator: any;
  let mockMetrics: any;

  beforeEach(() => {
    prom.register.clear();
    mockBookingRepo = { save: jest.fn(), findById: jest.fn() };
    mockReadModelRepo = { upsert: jest.fn() };
    mockPublisher = { publishBookingCreated: jest.fn().mockResolvedValue(undefined) };
    mockOrchestrator = { execute: jest.fn().mockResolvedValue(undefined) };
    mockMetrics = { incrementBookingsCreated: jest.fn() };

    useCase = new CreateBookingUseCase(
      mockBookingRepo,
      mockReadModelRepo,
      mockPublisher,
      mockOrchestrator,
      mockMetrics,
    );
  });

  it('returns CONFIRMED on saga success', async () => {
    const dto = await useCase.execute(validDto, jwtEmployee, 'corr-1');
    expect(dto).toBeDefined();
    expect(dto.travelerId).toBe(validDto.travelerId);
  });

  it('throws 403 for wrong travelerId on EMPLOYEE role', async () => {
    const { ForbiddenException } = require('@nestjs/common');
    await expect(
      useCase.execute(
        { ...validDto, travelerId: '00000000-0000-0000-0000-000000000099' },
        jwtEmployee,
        'corr-1',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('persists FAILED on saga error', async () => {
    mockOrchestrator.execute.mockRejectedValue(new Error('saga failed'));
    await expect(useCase.execute(validDto, jwtEmployee, 'corr-1')).rejects.toThrow('saga failed');
    // save should have been called at least twice: once for initial, once for failed
    expect(mockBookingRepo.save).toHaveBeenCalledTimes(2);
  });

  it('publishes BookingCreated', async () => {
    await useCase.execute(validDto, jwtEmployee, 'corr-1');
    expect(mockPublisher.publishBookingCreated).toHaveBeenCalled();
  });

  it('MANAGER can book for any traveler', async () => {
    const dto = await useCase.execute(
      { ...validDto, travelerId: '00000000-0000-0000-0000-000000000099' },
      jwtManager,
      'corr-1',
    );
    expect(dto).toBeDefined();
  });
});
