// @ts-nocheck
import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateBookingDto } from './create-booking.dto';

describe('CreateBookingDto', () => {
  const validPayload = {
    travelerId: '550e8400-e29b-41d4-a716-446655440000',
    flightOfferId: 'offer-123',
    itinerary: {
      origin: 'JFK',
      destination: 'LAX',
      departureDate: '2026-08-01',
      cabinClass: 'ECONOMY',
      passengers: 1,
    },
    totalAmount: 450,
  };

  it('passes validation with valid payload', async () => {
    const dto = plainToInstance(CreateBookingDto, validPayload);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails when travelerId missing', async () => {
    const dto = plainToInstance(CreateBookingDto, { ...validPayload, travelerId: undefined });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'travelerId')).toBe(true);
  });

  it('fails when itinerary.origin missing', async () => {
    const dto = plainToInstance(CreateBookingDto, {
      ...validPayload,
      itinerary: { ...validPayload.itinerary, origin: undefined },
    });
    const errors = await validate(dto, { whitelist: true });
    const itineraryErrors = errors.find((e) => e.property === 'itinerary');
    expect(itineraryErrors).toBeDefined();
  });
});
