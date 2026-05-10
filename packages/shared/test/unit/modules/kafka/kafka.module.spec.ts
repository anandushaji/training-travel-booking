import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { KafkaModule, KafkaModuleOptions } from '../../../../src/modules/kafka/kafka.module';
import { KAFKA_PRODUCER, KAFKA_CONSUMER } from '../../../../src/modules/kafka/kafka.constants';

// --- mock kafkajs ---

const mockConnect = jest.fn().mockResolvedValue(undefined);
const mockDisconnect = jest.fn().mockResolvedValue(undefined);

const mockProducer = { connect: mockConnect, disconnect: mockDisconnect };
const mockConsumer = { connect: mockConnect, disconnect: mockDisconnect };

jest.mock('kafkajs', () => ({
  Kafka: jest.fn().mockImplementation(() => ({
    producer: jest.fn().mockReturnValue(mockProducer),
    consumer: jest.fn().mockReturnValue(mockConsumer),
  })),
}));

const OPTIONS: KafkaModuleOptions = {
  clientId: 'test-client',
  brokers: ['localhost:9092'],
  groupId: 'test-group',
};

describe('KafkaModule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnect.mockResolvedValue(undefined);
  });

  describe('register', () => {
    it('returns DynamicModule with providers and exports', () => {
      const mod = KafkaModule.register(OPTIONS);
      expect(mod.module).toBe(KafkaModule);
      expect(Array.isArray(mod.providers)).toBe(true);
      expect((mod.providers as any[]).length).toBeGreaterThan(0);
      expect(Array.isArray(mod.exports)).toBe(true);
      expect(mod.exports).toContain(KAFKA_PRODUCER);
      expect(mod.exports).toContain(KAFKA_CONSUMER);
    });

    it('does not mutate options', () => {
      const optionsCopy = { ...OPTIONS };
      KafkaModule.register(OPTIONS);
      expect(OPTIONS).toEqual(optionsCopy);
    });
  });

  describe('injection', () => {
    it('KAFKA_PRODUCER resolves to connected producer', async () => {
      const module = await Test.createTestingModule({
        imports: [KafkaModule.register(OPTIONS)],
      }).compile();

      const producer = module.get(KAFKA_PRODUCER);
      expect(producer).toBe(mockProducer);
      expect(mockConnect).toHaveBeenCalled();

      await module.close();
    });
  });

  describe('logging', () => {
    it('logs producer connected on success', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});

      const module = await Test.createTestingModule({
        imports: [KafkaModule.register(OPTIONS)],
      }).compile();

      expect(logSpy).toHaveBeenCalledWith('Kafka producer connected');

      logSpy.mockRestore();
      await module.close();
    });

    it('logs consumer connected on success', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});

      const module = await Test.createTestingModule({
        imports: [KafkaModule.register(OPTIONS)],
      }).compile();

      expect(logSpy).toHaveBeenCalledWith('Kafka consumer connected');

      logSpy.mockRestore();
      await module.close();
    });

    it('logs error and rethrows on producer connect failure', async () => {
      const connectError = new Error('Broker unreachable');
      // First call (producer) throws; second (consumer) succeeds
      mockConnect.mockRejectedValueOnce(connectError).mockResolvedValue(undefined);

      const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

      await expect(
        Test.createTestingModule({
          imports: [KafkaModule.register(OPTIONS)],
        }).compile(),
      ).rejects.toThrow('Broker unreachable');

      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });
});
