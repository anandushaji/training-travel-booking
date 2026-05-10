// @ts-nocheck
import * as prom from 'prom-client';
import { BookingQueryService } from './booking-query.service';
import { NotFoundException } from '@travel/shared';

const makeRow = (id: string, status: string) => ({
  id,
  travelerId: 'trav-1',
  status,
  origin: 'JFK',
  destination: 'LAX',
  departureDate: '2026-08-01',
  totalAmount: 450,
  currency: 'USD',
  createdAt: new Date(),
});

describe('BookingQueryService', () => {
  let service: BookingQueryService;
  let mockReadModelRepo: any;

  beforeEach(() => {
    prom.register.clear();
    mockReadModelRepo = { findById: jest.fn(), findByTravelerId: jest.fn() };
    service = new BookingQueryService(mockReadModelRepo);
  });

  it('getById throws NotFoundException', async () => {
    mockReadModelRepo.findById.mockResolvedValue(null);
    await expect(service.getById('booking-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('listBookings returns pagination metadata', async () => {
    mockReadModelRepo.findByTravelerId.mockResolvedValue({
      rows: [makeRow('b-1', 'CONFIRMED')],
      total: 1,
    });
    const result = await service.listBookings({ travelerId: 'trav-1' });
    expect(result.pagination).toBeDefined();
    expect(result.pagination.total).toBe(1);
    expect(result.bookings).toHaveLength(1);
  });

  it('listBookings filters by status', async () => {
    mockReadModelRepo.findByTravelerId.mockResolvedValue({ rows: [], total: 0 });
    await service.listBookings({ travelerId: 'trav-1', status: 'CONFIRMED' });
    expect(mockReadModelRepo.findByTravelerId).toHaveBeenCalledWith(
      'trav-1',
      expect.objectContaining({ status: 'CONFIRMED' }),
    );
  });
});
