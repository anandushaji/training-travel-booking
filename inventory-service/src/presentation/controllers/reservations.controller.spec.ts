import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const request = require('supertest') as typeof import('supertest');
import { ReservationsController } from './reservations.controller';
import { CreateReservationUseCase } from '../../application/use-cases/create-reservation/create-reservation.use-case';
import { GetReservationUseCase } from '../../application/use-cases/get-reservation/get-reservation.use-case';
import { CancelReservationUseCase } from '../../application/use-cases/cancel-reservation/cancel-reservation.use-case';

const RESERVATION_RESPONSE = {
  reservationId: 'res-uuid-1',
  status: 'PENDING',
  expiresAt: new Date().toISOString(),
  segment: { origin: 'LHR', destination: 'JFK', departureAt: '', arrivalAt: '', flightNumber: 'BA117', carrier: 'BA' },
  passenger: { passengerId: 'pax-1', firstName: 'John', lastName: 'Doe' },
  cabinClass: 'ECONOMY',
  createdAt: new Date().toISOString(),
};

const VALID_UUID = '00000000-0000-4000-8000-000000000001';

describe('ReservationsController', () => {
  let app: INestApplication;
  let createUseCase: { execute: jest.Mock };
  let getUseCase: { execute: jest.Mock };
  let cancelUseCase: { execute: jest.Mock };

  beforeAll(async () => {
    createUseCase = { execute: jest.fn().mockResolvedValue({ response: RESERVATION_RESPONSE, isNew: true }) };
    getUseCase = { execute: jest.fn().mockResolvedValue(RESERVATION_RESPONSE) };
    cancelUseCase = { execute: jest.fn().mockResolvedValue(undefined) };

    const module = await Test.createTestingModule({
      controllers: [ReservationsController],
      providers: [
        { provide: CreateReservationUseCase, useValue: createUseCase },
        { provide: GetReservationUseCase, useValue: getUseCase },
        { provide: CancelReservationUseCase, useValue: cancelUseCase },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // POST /api/v1/flights/reservations
  it('should return 400 when Idempotency-Key header is absent', async () => {
    const resp = await request(app.getHttpServer())
      .post('/api/v1/flights/reservations')
      .set('x-user-role', 'Employee')
      .send({ offerId: 'offer-1', passengerId: VALID_UUID, cabinClass: 'ECONOMY' });

    expect(resp.status).toBe(400);
  });

  it('should return 400 when Idempotency-Key is not a valid UUID', async () => {
    const resp = await request(app.getHttpServer())
      .post('/api/v1/flights/reservations')
      .set('x-user-role', 'Employee')
      .set('idempotency-key', 'not-a-uuid')
      .send({ offerId: 'offer-1', passengerId: VALID_UUID, cabinClass: 'ECONOMY' });

    expect(resp.status).toBe(400);
  });

  it('should return 201 with valid request and idempotency key (isNew=true)', async () => {
    createUseCase.execute.mockResolvedValueOnce({ response: RESERVATION_RESPONSE, isNew: true });

    const resp = await request(app.getHttpServer())
      .post('/api/v1/flights/reservations')
      .set('x-user-role', 'Employee')
      .set('idempotency-key', VALID_UUID)
      .send({ offerId: 'offer-1', passengerId: VALID_UUID, cabinClass: 'ECONOMY' });

    expect([200, 201]).toContain(resp.status);
    expect(resp.body.statusCode).toBe(201);
  });

  it('should return 200 statusCode in body when isNew=false (idempotent repeat)', async () => {
    createUseCase.execute.mockResolvedValueOnce({ response: RESERVATION_RESPONSE, isNew: false });

    const resp = await request(app.getHttpServer())
      .post('/api/v1/flights/reservations')
      .set('x-user-role', 'Employee')
      .set('idempotency-key', VALID_UUID)
      .send({ offerId: 'offer-1', passengerId: VALID_UUID, cabinClass: 'ECONOMY' });

    expect(resp.body.statusCode).toBe(200);
  });

  it('should forward x-correlation-id to use case when header is present', async () => {
    createUseCase.execute.mockResolvedValueOnce({ response: RESERVATION_RESPONSE, isNew: true });

    await request(app.getHttpServer())
      .post('/api/v1/flights/reservations')
      .set('x-user-role', 'Employee')
      .set('idempotency-key', VALID_UUID)
      .set('x-correlation-id', 'corr-abc')
      .send({ offerId: 'offer-1', passengerId: VALID_UUID, cabinClass: 'ECONOMY' });

    expect(createUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ correlationId: 'corr-abc' }),
    );
  });

  it('should NOT include correlationId in use case args when header is absent', async () => {
    createUseCase.execute.mockResolvedValueOnce({ response: RESERVATION_RESPONSE, isNew: true });

    await request(app.getHttpServer())
      .post('/api/v1/flights/reservations')
      .set('x-user-role', 'Employee')
      .set('idempotency-key', VALID_UUID)
      .send({ offerId: 'offer-1', passengerId: VALID_UUID, cabinClass: 'ECONOMY' });

    const callArg = createUseCase.execute.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(callArg).not.toHaveProperty('correlationId');
  });

  // GET /api/v1/flights/reservations/:reservationId
  it('should return 200 and reservation data on GET by id', async () => {
    getUseCase.execute.mockResolvedValueOnce(RESERVATION_RESPONSE);

    const resp = await request(app.getHttpServer())
      .get(`/api/v1/flights/reservations/${VALID_UUID}`)
      .set('x-user-role', 'Employee');

    expect(resp.status).toBe(200);
    expect(resp.body).toMatchObject({ reservationId: 'res-uuid-1' });
    expect(getUseCase.execute).toHaveBeenCalledWith({ reservationId: VALID_UUID });
  });

  // DELETE /api/v1/flights/reservations/:reservationId
  it('should return 204 on successful cancel', async () => {
    cancelUseCase.execute.mockResolvedValueOnce(undefined);

    const resp = await request(app.getHttpServer())
      .delete(`/api/v1/flights/reservations/${VALID_UUID}`)
      .set('x-user-role', 'Employee');

    expect(resp.status).toBe(204);
    expect(cancelUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ reservationId: VALID_UUID }),
    );
  });

  it('should forward x-correlation-id to cancel use case when header is present', async () => {
    cancelUseCase.execute.mockResolvedValueOnce(undefined);

    await request(app.getHttpServer())
      .delete(`/api/v1/flights/reservations/${VALID_UUID}`)
      .set('x-user-role', 'Employee')
      .set('x-correlation-id', 'corr-xyz');

    expect(cancelUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ correlationId: 'corr-xyz' }),
    );
  });

  it('should NOT include correlationId in cancel args when header is absent', async () => {
    cancelUseCase.execute.mockResolvedValueOnce(undefined);

    await request(app.getHttpServer())
      .delete(`/api/v1/flights/reservations/${VALID_UUID}`)
      .set('x-user-role', 'Employee');

    const callArg = cancelUseCase.execute.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(callArg).not.toHaveProperty('correlationId');
  });
});
