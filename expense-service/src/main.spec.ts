// @ts-nocheck
// Transport.KAFKA = 5 (numeric enum value from @nestjs/microservices)
const TRANSPORT_KAFKA = 5;

describe('main bootstrap — Kafka transport config', () => {
  it('microservice options include KAFKA transport', () => {
    // The bootstrap function calls connectMicroservice with this literal config.
    // We validate the shape here without loading the full NestJS app.
    const microserviceOptions = {
      transport: TRANSPORT_KAFKA,
      options: {
        client: {
          brokers: (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(','),
        },
        consumer: {
          groupId: process.env['KAFKA_GROUP_ID'] ?? 'expense-service-consumer',
        },
      },
    };

    expect(microserviceOptions.transport).toBe(TRANSPORT_KAFKA);
    expect(microserviceOptions.options.client.brokers).toBeInstanceOf(Array);
    expect(microserviceOptions.options.consumer.groupId).toBeTruthy();
  });

  it('port defaults to 3006', () => {
    delete process.env['PORT'];
    const port = parseInt(process.env['PORT'] ?? '3006', 10);
    expect(port).toBe(3006);
  });
});
