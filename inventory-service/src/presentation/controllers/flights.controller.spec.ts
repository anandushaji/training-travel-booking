import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const request = require('supertest') as typeof import('supertest');
import { FlightsController } from './flights.controller';
import { SearchFlightsUseCase } from '../../application/use-cases/search-flights/search-flights.use-case';

const MOCK_OFFER = {
  offerId: 'offer-1',
  carrier: 'BA',
  flightNumber: 'BA178',
  origin: 'LHR',
  destination: 'JFK',
  departureAt: '2026-07-01T08:30:00',
  arrivalAt: '2026-07-01T11:15:00',
  cabinClass: 'ECONOMY',
  price: { amount: '450.00', currency: 'USD' },
  seatsAvailable: 9,
  source: 'LIVE' as const,
};

const mockUseCase = () => ({
  execute: jest.fn().mockResolvedValue({
    data: [MOCK_OFFER],
    meta: { count: 1, cachedAt: null },
  }),
});

describe('FlightsController', () => {
  let app: INestApplication;
  let useCase: ReturnType<typeof mockUseCase>;

  beforeAll(async () => {
    useCase = mockUseCase();
    const module = await Test.createTestingModule({
      controllers: [FlightsController],
      providers: [
        { provide: SearchFlightsUseCase, useValue: useCase },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return 200 with valid search params', async () => {
    const resp = await request(app.getHttpServer())
      .get('/api/v1/inventory/flights/search')
      .set('x-user-role', 'EMPLOYEE')
      .query({ origin: 'LHR', destination: 'JFK', departureDate: '2026-07-01', passengers: 1 });

    expect(resp.status).toBe(200);
    expect(useCase.execute).toHaveBeenCalled();
  });

  it('should return offers and meta in the correct shape', async () => {
    const resp = await request(app.getHttpServer())
      .get('/api/v1/inventory/flights/search')
      .set('x-user-role', 'EMPLOYEE')
      .query({ origin: 'LHR', destination: 'JFK', departureDate: '2026-07-01', passengers: 1 });

    expect(resp.status).toBe(200);
    expect(resp.body).toHaveProperty('offers');
    expect(resp.body).toHaveProperty('meta.count');
    expect(resp.body).toHaveProperty('meta.cached');
    expect(resp.body).toHaveProperty('meta.searchId');
    expect(resp.body.offers[0]).toMatchObject({
      id: 'offer-1',
      airline: 'BA',
      origin: 'LHR',
      destination: 'JFK',
    });
  });

  it('should return 400 when origin query param is missing', async () => {
    const resp = await request(app.getHttpServer())
      .get('/api/v1/inventory/flights/search')
      .set('x-user-role', 'EMPLOYEE')
      .query({ destination: 'JFK', departureDate: '2026-07-01', passengers: 1 });

    expect(resp.status).toBe(400);
  });

  it('should forward returnDate and cabinClass to use case when provided', async () => {
    const resp = await request(app.getHttpServer())
      .get('/api/v1/inventory/flights/search')
      .set('x-user-role', 'EMPLOYEE')
      .query({
        origin: 'LHR',
        destination: 'JFK',
        departureDate: '2026-07-01',
        passengers: 1,
        returnDate: '2026-07-14',
        cabinClass: 'BUSINESS',
      });

    expect(resp.status).toBe(200);
    expect(useCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ returnDate: '2026-07-14', cabinClass: 'BUSINESS' }),
    );
  });

  it('should NOT include returnDate or cabinClass in use case args when absent', async () => {
    useCase.execute.mockClear();
    await request(app.getHttpServer())
      .get('/api/v1/inventory/flights/search')
      .set('x-user-role', 'EMPLOYEE')
      .query({ origin: 'LHR', destination: 'JFK', departureDate: '2026-07-01', passengers: 1 });

    const callArg = useCase.execute.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(callArg).not.toHaveProperty('returnDate');
    expect(callArg).not.toHaveProperty('cabinClass');
  });
});
