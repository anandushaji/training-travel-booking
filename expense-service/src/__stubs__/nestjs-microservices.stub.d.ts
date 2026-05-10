// Minimal type declarations for @nestjs/microservices — unit-test stub only.
// Provides the symbols used by expense-service source files so ts-jest can compile.

export declare function MessagePattern(pattern?: unknown): MethodDecorator;
export declare function Payload(property?: string): ParameterDecorator;
export declare enum Transport {
  TCP = 0,
  REDIS = 1,
  NATS = 2,
  MQTT = 3,
  GRPC = 4,
  KAFKA = 5,
  RMQ = 6,
}
export declare interface MicroserviceOptions {
  transport?: Transport;
  options?: Record<string, unknown>;
}
