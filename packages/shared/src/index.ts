// Base classes
export { ValueObject } from './base-classes/value-object.base';
export { Entity } from './base-classes/entity.base';
export { AggregateRoot } from './base-classes/aggregate-root.base';

// Domain event
export { DomainEvent } from './domain-event/domain-event.base';
export type { DomainEventProps } from './domain-event/domain-event.base';

// Value objects
export { Currency } from './value-objects/currency.enum';
export { Money } from './value-objects/money.vo';
export {
  TypedId,
  BookingId,
  TravelerId,
  PolicyId,
  HotelId,
  FlightId,
  CarId,
  InvoiceId,
  ApprovalId,
  ExpenseId,
} from './value-objects/typed-id.vo';

// Exceptions
export { DomainException } from './exceptions/domain.exception';
export { ValidationException } from './exceptions/validation.exception';
export { NotFoundException } from './exceptions/not-found.exception';
export { ConflictException } from './exceptions/conflict.exception';
export { InsufficientFundsException } from './exceptions/insufficient-funds.exception';
export { CurrencyMismatchException } from './exceptions/currency-mismatch.exception';

// Interfaces
export type { IRepository } from './interfaces/repository.interface';
export type { IUseCase } from './interfaces/use-case.interface';

// Utilities
export { generateUuid, isValidUuid } from './utils/uuid.util';
export { toISOString, fromISOString, isValidDate } from './utils/date.util';

// Kafka module
export { KafkaModule } from './modules/kafka/kafka.module';
export type { KafkaModuleOptions } from './modules/kafka/kafka.module';
export { KAFKA_PRODUCER, KAFKA_CONSUMER } from './modules/kafka/kafka.constants';
