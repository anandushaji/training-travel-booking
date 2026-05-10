"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var KafkaModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.KafkaModule = void 0;
const common_1 = require("@nestjs/common");
const kafkajs_1 = require("kafkajs");
const kafka_constants_1 = require("./kafka.constants");
let KafkaModule = KafkaModule_1 = class KafkaModule {
    static register(options) {
        const { clientId, brokers, groupId } = options;
        const producerProvider = {
            provide: kafka_constants_1.KAFKA_PRODUCER,
            useFactory: async () => {
                const kafka = new kafkajs_1.Kafka({ clientId, brokers });
                const producer = kafka.producer();
                try {
                    await producer.connect();
                    KafkaModule_1.logger.log('Kafka producer connected');
                }
                catch (error) {
                    KafkaModule_1.logger.error('Kafka producer connection failed', error);
                    throw error;
                }
                KafkaModule_1.producer = producer;
                return producer;
            },
        };
        const consumerProvider = {
            provide: kafka_constants_1.KAFKA_CONSUMER,
            useFactory: async () => {
                const kafka = new kafkajs_1.Kafka({ clientId, brokers });
                const consumer = kafka.consumer({ groupId });
                try {
                    await consumer.connect();
                    KafkaModule_1.logger.log('Kafka consumer connected');
                }
                catch (error) {
                    KafkaModule_1.logger.error('Kafka consumer connection failed', error);
                    throw error;
                }
                KafkaModule_1.consumer = consumer;
                return consumer;
            },
        };
        return {
            module: KafkaModule_1,
            providers: [producerProvider, consumerProvider],
            exports: [kafka_constants_1.KAFKA_PRODUCER, kafka_constants_1.KAFKA_CONSUMER],
        };
    }
    async onModuleDestroy() {
        await KafkaModule_1.producer?.disconnect();
        await KafkaModule_1.consumer?.disconnect();
    }
};
exports.KafkaModule = KafkaModule;
KafkaModule.producer = null;
KafkaModule.consumer = null;
KafkaModule.logger = new common_1.Logger(KafkaModule_1.name);
exports.KafkaModule = KafkaModule = KafkaModule_1 = __decorate([
    (0, common_1.Module)({})
], KafkaModule);
//# sourceMappingURL=kafka.module.js.map