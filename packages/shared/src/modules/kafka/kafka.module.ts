import { DynamicModule, Logger, Module, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Producer, Consumer } from 'kafkajs';
import { KAFKA_PRODUCER, KAFKA_CONSUMER } from './kafka.constants';

export interface KafkaModuleOptions {
  clientId: string;
  brokers: string[];
  groupId: string;
}

@Module({})
export class KafkaModule implements OnModuleDestroy {
  private static producer: Producer | null = null;
  private static consumer: Consumer | null = null;
  private static readonly logger = new Logger(KafkaModule.name);

  static register(options: KafkaModuleOptions): DynamicModule {
    const { clientId, brokers, groupId } = options;

    const producerProvider = {
      provide: KAFKA_PRODUCER,
      useFactory: async (): Promise<Producer> => {
        const kafka = new Kafka({ clientId, brokers });
        const producer = kafka.producer();
        try {
          await producer.connect();
          KafkaModule.logger.log('Kafka producer connected');
        } catch (error) {
          KafkaModule.logger.error('Kafka producer connection failed', error);
          throw error;
        }
        KafkaModule.producer = producer;
        return producer;
      },
    };

    const consumerProvider = {
      provide: KAFKA_CONSUMER,
      useFactory: async (): Promise<Consumer> => {
        const kafka = new Kafka({ clientId, brokers });
        const consumer = kafka.consumer({ groupId });
        try {
          await consumer.connect();
          KafkaModule.logger.log('Kafka consumer connected');
        } catch (error) {
          KafkaModule.logger.error('Kafka consumer connection failed', error);
          throw error;
        }
        KafkaModule.consumer = consumer;
        return consumer;
      },
    };

    return {
      module: KafkaModule,
      providers: [producerProvider, consumerProvider],
      exports: [KAFKA_PRODUCER, KAFKA_CONSUMER],
    };
  }

  async onModuleDestroy(): Promise<void> {
    await KafkaModule.producer?.disconnect();
    await KafkaModule.consumer?.disconnect();
  }
}
