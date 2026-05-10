// Minimal stub for @nestjs/microservices used in unit tests.
// Only the symbols needed by the expense-service source files are exported.

const noop = () => () => {};

module.exports = {
  // Decorators used by BookingEventConsumer
  MessagePattern: noop,
  Payload: noop,
  // Enum used by main.ts (Transport.KAFKA = 5)
  Transport: { KAFKA: 5 },
  // ClientsModule / microservice options — stubs only
  ClientsModule: { register: () => ({ module: class {} }) },
  KafkaOptions: {},
};
