import * as shared from '../../src/index';
import * as fs from 'fs';
import * as path from 'path';

const EXPECTED_EXPORTS = [
  'ValueObject',
  'Entity',
  'AggregateRoot',
  'DomainEvent',
  'Currency',
  'Money',
  'TypedId',
  'BookingId',
  'TravelerId',
  'PolicyId',
  'HotelId',
  'FlightId',
  'CarId',
  'InvoiceId',
  'ApprovalId',
  'ExpenseId',
  'DomainException',
  'ValidationException',
  'NotFoundException',
  'ConflictException',
  'InsufficientFundsException',
  'CurrencyMismatchException',
  'generateUuid',
  'isValidUuid',
  'toISOString',
  'fromISOString',
  'isValidDate',
  'KafkaModule',
  'KAFKA_PRODUCER',
  'KAFKA_CONSUMER',
];

describe('barrel', () => {
  it('all public symbols are importable from @travel/shared', () => {
    for (const name of EXPECTED_EXPORTS) {
      expect((shared as any)[name]).toBeDefined();
    }
  });

  it('CONTRACTS.md lists every named export', () => {
    const contractsPath = path.resolve(
      __dirname,
      '../../../../openspec/CONTRACTS.md',
    );
    expect(fs.existsSync(contractsPath)).toBe(true);
    const content = fs.readFileSync(contractsPath, 'utf-8');
    for (const name of EXPECTED_EXPORTS) {
      expect(content).toContain(name);
    }
  });
});
